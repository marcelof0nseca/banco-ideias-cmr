import type { StatusIdeia } from "@/prisma/gen/client";
import { NUMEROS_RPA, RPAS } from "../regioes/rpa";

/**
 * Indicadores publicos do programa (especificacao, secao 3.6 e risco da
 * secao 14). Calculo puro sobre dados ja carregados: sem dado pessoal, so
 * contagens e medias. DONO: Pessoa A.
 *
 * Definicoes:
 *   - triada: ideia com decisao da Triagem (EM_TRIAGEM -> DISPONIVEL ou ARQUIVADA);
 *   - tempo de triagem: do cadastro ate essa decisao, em dias corridos;
 *   - taxa de aprovacao: triadas que foram para DISPONIVEL / triadas;
 *   - taxa de adocao: ideias adotadas / ideias aprovadas.
 */

export interface IdeiaParaIndicador {
  id: string;
  criadoEm: Date;
  status: StatusIdeia;
  tema: string;
  rpa: number | null;
}

export interface TramitacaoParaIndicador {
  ideiaId: string;
  statusAnterior: StatusIdeia | null;
  statusNovo: StatusIdeia;
  gabinete: string | null;
  criadoEm: Date;
}

export interface Contagem {
  rotulo: string;
  quantidade: number;
}

export interface Indicadores {
  geradoEm: string;
  totais: {
    recebidas: number;
    aguardandoTriagem: number;
    publicadas: number;
    adotadas: number;
    arquivadas: number;
  };
  /** Dias corridos, 1 casa decimal; null sem nenhuma ideia triada. */
  tempoMedioTriagemDias: number | null;
  /** Fracao de 0 a 1; null quando o denominador e zero. */
  taxaAprovacao: number | null;
  taxaAdocao: number | null;
  porTema: Contagem[];
  porRpa: Contagem[];
  adocaoPorGabinete: Contagem[];
}

const DIA_MS = 24 * 60 * 60 * 1000;
export const SEM_RPA = "Região não informada";
export const SEM_GABINETE = "Gabinete não informado";

function contar(chaves: string[]): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const c of chaves) mapa.set(c, (mapa.get(c) ?? 0) + 1);
  return mapa;
}

/** Ordem decrescente de quantidade; empate em ordem alfabetica. */
function ordenar(mapa: Map<string, number>): Contagem[] {
  return [...mapa]
    .map(([rotulo, quantidade]) => ({ rotulo, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade || a.rotulo.localeCompare(b.rotulo, "pt-BR"));
}

function fracao(parte: number, todo: number): number | null {
  return todo === 0 ? null : parte / todo;
}

export function calcularIndicadores(
  ideias: IdeiaParaIndicador[],
  tramitacoes: TramitacaoParaIndicador[],
  agora: Date = new Date(),
): Indicadores {
  const porId = new Map(ideias.map((i) => [i.id, i]));
  const cronologicas = [...tramitacoes].sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());

  // Primeira decisao da Triagem de cada ideia.
  const decisoes = new Map<string, TramitacaoParaIndicador>();
  for (const t of cronologicas) {
    const ehDecisao =
      t.statusAnterior === "EM_TRIAGEM" && (t.statusNovo === "DISPONIVEL" || t.statusNovo === "ARQUIVADA");
    if (ehDecisao && !decisoes.has(t.ideiaId) && porId.has(t.ideiaId)) decisoes.set(t.ideiaId, t);
  }

  const tempos = [...decisoes.values()].map(
    (t) => (t.criadoEm.getTime() - porId.get(t.ideiaId)!.criadoEm.getTime()) / DIA_MS,
  );
  const aprovadas = [...decisoes.values()].filter((t) => t.statusNovo === "DISPONIVEL").length;

  const adocoes = new Map<string, TramitacaoParaIndicador>();
  for (const t of cronologicas) {
    if (t.statusNovo === "ADOTADA" && !adocoes.has(t.ideiaId) && porId.has(t.ideiaId)) {
      adocoes.set(t.ideiaId, t);
    }
  }

  const porRpa = contar(ideias.map((i) => (i.rpa && RPAS[i.rpa] ? RPAS[i.rpa]! : SEM_RPA)));
  const status = contar(ideias.map((i) => i.status));
  const n = (s: StatusIdeia) => status.get(s) ?? 0;

  return {
    geradoEm: agora.toISOString(),
    totais: {
      recebidas: ideias.length,
      aguardandoTriagem: n("RECEBIDA") + n("EM_TRIAGEM"),
      publicadas: n("DISPONIVEL") + n("EM_ANALISE") + n("ADOTADA"),
      adotadas: n("ADOTADA"),
      arquivadas: n("ARQUIVADA"),
    },
    tempoMedioTriagemDias:
      tempos.length === 0
        ? null
        : Math.round((tempos.reduce((s, t) => s + t, 0) / tempos.length) * 10) / 10,
    taxaAprovacao: fracao(aprovadas, decisoes.size),
    taxaAdocao: fracao(adocoes.size, aprovadas),
    porTema: ordenar(contar(ideias.map((i) => i.tema))),
    // RPAs em ordem fixa (1 a 6), inclusive as zeradas; "nao informada" no fim.
    porRpa: [
      ...NUMEROS_RPA.map((r) => ({ rotulo: RPAS[r]!, quantidade: porRpa.get(RPAS[r]!) ?? 0 })),
      ...(porRpa.has(SEM_RPA) ? [{ rotulo: SEM_RPA, quantidade: porRpa.get(SEM_RPA)! }] : []),
    ],
    adocaoPorGabinete: ordenar(contar([...adocoes.values()].map((t) => t.gabinete ?? SEM_GABINETE))),
  };
}

/** "73%" (sem casas) ou "—" quando nao ha base de calculo. */
export function formatarPercentual(fracaoValor: number | null): string {
  return fracaoValor === null ? "—" : `${Math.round(fracaoValor * 100)}%`;
}
