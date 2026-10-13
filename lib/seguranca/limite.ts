/**
 * Limite de taxa por IP e por documento (especificacao, secao 8.5).
 * DONO: Pessoa B.  CONSUMIDORES: cadastro, apoio e acompanhar (Pessoa A).
 *
 * Janela deslizante em memoria do processo. Suficiente para a implantacao
 * prevista (uma instancia, secao 11.1); se um dia houver varias instancias,
 * troca-se o armazenamento por uma tabela ou Redis mantendo esta assinatura.
 * Reinicio do processo zera as contagens - aceitavel para limite de taxa.
 *
 * Nunca recebe IP ou documento em claro: so os hashes.
 */

export type AcaoLimitada = "cadastro" | "apoio" | "acompanhar";

export interface ResultadoLimite {
  permitido: boolean;
  /** Segundos ate liberar, quando bloqueado. */
  tentarEmSegundos?: number;
}

export interface ChaveLimite {
  acao: AcaoLimitada;
  /** Hash do IP (nunca o IP em claro). */
  ipHash?: string;
  /** Hash do documento (nunca o CPF em claro). */
  documentoHash?: string;
}

interface Regra {
  maximo: number;
  janelaMs: number;
}

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

function numeroEnv(nome: string, padrao: number): number {
  const v = Number(process.env[nome]);
  return Number.isFinite(v) && v > 0 ? v : padrao;
}

/** Regras por acao e por tipo de chave. Parametrizaveis pelo .env. */
export function regras(): Record<AcaoLimitada, { ip: Regra; documento: Regra }> {
  return {
    cadastro: {
      ip: { maximo: numeroEnv("LIMITE_CADASTRO_POR_IP_HORA", 5), janelaMs: HORA },
      documento: { maximo: numeroEnv("LIMITE_IDEIAS_POR_DOCUMENTO_DIA", 3), janelaMs: DIA },
    },
    apoio: {
      ip: { maximo: 30, janelaMs: HORA },
      documento: { maximo: 50, janelaMs: DIA },
    },
    // Anti-varredura de protocolos: poucas tentativas por IP.
    acompanhar: {
      ip: { maximo: 10, janelaMs: 15 * 60 * 1000 },
      documento: { maximo: 10, janelaMs: 15 * 60 * 1000 },
    },
  };
}

// chave -> instantes (epoch ms) das tentativas dentro da janela
const registros = new Map<string, number[]>();

/** Limpa tudo (uso em testes). */
export function zerarLimites(): void {
  registros.clear();
}

function consumir(chave: string, regra: Regra, agora: number): ResultadoLimite {
  const inicio = agora - regra.janelaMs;
  const recentes = (registros.get(chave) ?? []).filter((t) => t > inicio);

  if (recentes.length >= regra.maximo) {
    registros.set(chave, recentes);
    const maisAntigo = recentes[0] ?? agora;
    const tentarEmSegundos = Math.max(1, Math.ceil((maisAntigo + regra.janelaMs - agora) / 1000));
    return { permitido: false, tentarEmSegundos };
  }

  recentes.push(agora);
  registros.set(chave, recentes);
  return { permitido: true };
}

/**
 * Verifica e consome uma unidade do limite para a chave informada.
 * Se vierem os dois hashes, os dois limites precisam permitir.
 */
export async function verificarLimite(
  chave: ChaveLimite,
  agora: number = Date.now(),
): Promise<ResultadoLimite> {
  const r = regras()[chave.acao];
  const verificacoes: [string, Regra][] = [];
  if (chave.ipHash) verificacoes.push([`${chave.acao}:ip:${chave.ipHash}`, r.ip]);
  if (chave.documentoHash) verificacoes.push([`${chave.acao}:doc:${chave.documentoHash}`, r.documento]);

  for (const [k, regra] of verificacoes) {
    const resultado = consumir(k, regra, agora);
    if (!resultado.permitido) return resultado;
  }
  return { permitido: true };
}
