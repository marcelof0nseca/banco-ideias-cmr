import { prisma } from "./prisma";
import {
  conferirInicio,
  errosPorCampo,
  esquemaCadastro,
  gerarToken,
  hashIp,
  hashToken,
  prazoTriagem,
  type ErrosCampo,
} from "./cadastro";
import { prepararDocumento } from "./documento";
import { verificarLimite } from "./limite";
import { gerarProtocolo } from "./protocolo";
import { registrarCriacao } from "./tramitacao";

/**
 * Gravacao do cadastro de ideia. Usado pela tela /participar (Server Action)
 * e por POST /api/ideias - a mesma regra nos dois caminhos.
 * Especificacao tecnica, secoes 3.1, 8.3 a 8.5.
 *
 * DONO: Pessoa A.
 */

export interface PedidoCadastro {
  /** Campos crus do formulario/JSON; validados aqui. */
  dados: Record<string, unknown>;
  /** Valor assinado de inicio do preenchimento. */
  iniciadoEm: string | null;
  /** Campo-armadilha: precisa vir vazio. */
  armadilha: string | null;
  chaveIdempotencia: string | null;
  ip: string | null;
}

export type ResultadoCadastro =
  | { ok: true; protocolo: string; token: string; prazoTriagem: string }
  | { ok: false; httpStatus: 400 | 422 | 429 | 500; mensagem: string; erros?: ErrosCampo };

/**
 * IP do cidadao, informado pelo proxy (Nginx) a frente do Next. Usado so
 * para gerar ipHash; nunca e gravado nem registrado em log.
 */
export function ipDe(cabecalhos: Headers): string | null {
  return (
    cabecalhos.get("x-real-ip") ??
    cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

const MENSAGEM_GENERICA =
  "Não foi possível enviar agora. Aguarde alguns segundos e tente novamente.";

// ---------------------------------------------------------------------------
// Idempotencia
//
// PROVISORIO: em memoria do processo, enquanto a Pessoa B nao cria o
// armazenamento com unicidade + validade (issue "chave de idempotencia").
// Cobre duplo clique e "voltar + reenviar" numa instancia so; nao sobrevive a
// reinicio nem a varias instancias.
// ---------------------------------------------------------------------------

const VALIDADE_IDEMPOTENCIA_MS = 24 * 60 * 60 * 1000;
const emAndamento = new Map<string, { expira: number; resultado: Promise<ResultadoCadastro> }>();

function limparExpiradas(agora: number) {
  for (const [chave, item] of emAndamento) {
    if (item.expira < agora) emAndamento.delete(chave);
  }
}

export async function cadastrarIdeia(pedido: PedidoCadastro): Promise<ResultadoCadastro> {
  const chave = pedido.chaveIdempotencia?.trim();
  if (!chave || chave.length > 100) {
    return { ok: false, httpStatus: 400, mensagem: "Chave de idempotência ausente." };
  }

  const agora = Date.now();
  limparExpiradas(agora);
  const existente = emAndamento.get(chave);
  if (existente) return existente.resultado;

  const resultado = executar(pedido);
  emAndamento.set(chave, { expira: agora + VALIDADE_IDEMPOTENCIA_MS, resultado });
  // So o sucesso fica guardado: depois de um erro o cidadao corrige e reenvia
  // com a mesma chave.
  resultado.then(
    (r) => {
      if (!r.ok) emAndamento.delete(chave);
    },
    () => emAndamento.delete(chave),
  );
  return resultado;
}

async function executar(pedido: PedidoCadastro): Promise<ResultadoCadastro> {
  // 1. Defesas anti-robo, sem CAPTCHA (secao 8.5).
  if (pedido.armadilha) {
    return { ok: false, httpStatus: 400, mensagem: MENSAGEM_GENERICA };
  }
  const inicio = conferirInicio(pedido.iniciadoEm);
  if (inicio === "rapido" || inicio === "invalido") {
    return { ok: false, httpStatus: 422, mensagem: MENSAGEM_GENERICA };
  }
  if (inicio === "expirado") {
    return {
      ok: false,
      httpStatus: 422,
      mensagem: "O formulário ficou aberto por muito tempo. Recarregue a página e envie de novo.",
    };
  }

  // 2. Esquema + digito verificador.
  const validacao = esquemaCadastro.safeParse(pedido.dados);
  if (!validacao.success) {
    return {
      ok: false,
      httpStatus: 422,
      mensagem: "Há campos para corrigir.",
      erros: errosPorCampo(validacao.error),
    };
  }
  const d = validacao.data;

  // 3. Limites de taxa (por IP e por documento).
  const ipHash = pedido.ip ? hashIp(pedido.ip) : undefined;
  const documento = prepararDocumento(d.documento, d.tipoAutor);
  const { documentoHash } = documento;
  for (const chave of [{ ipHash }, { documentoHash }]) {
    const limite = await verificarLimite({ acao: "cadastro", ...chave });
    if (!limite.permitido) {
      return {
        ok: false,
        httpStatus: 429,
        mensagem: "Muitos envios em pouco tempo. Tente novamente mais tarde.",
      };
    }
  }

  // 4. Tema da lista controlada.
  const tema = await prisma.tema.findFirst({ where: { id: d.temaId, ativo: true } });
  if (!tema) {
    return {
      ok: false,
      httpStatus: 422,
      mensagem: "Há campos para corrigir.",
      erros: { temaId: "Escolha um tema da lista." },
    };
  }

  // 5. Gravacao atomica: autor, ideia, protocolo e primeira tramitacao.
  const token = gerarToken();
  const consentimento = {
    nome: d.nome,
    email: d.email,
    telefone: d.telefone,
    nomePublico: d.autorizaNomePublico,
    consentimentoEm: new Date(),
    avisoPrivacidadeVersao: d.versaoAviso,
  };

  const protocolo = await prisma.$transaction(async (tx) => {
    const autor = await tx.autor.upsert({
      where: { documentoHash: documento.documentoHash },
      create: { tipo: d.tipoAutor, ...documento, ...consentimento },
      update: consentimento,
      select: { id: true },
    });
    const protocolo = await gerarProtocolo(tx);
    const ideia = await tx.ideia.create({
      data: {
        protocolo,
        tokenAcompHash: hashToken(token),
        autorId: autor.id,
        temaId: tema.id,
        titulo: d.titulo,
        descricao: d.descricao,
        bairro: d.bairro,
        rpa: d.rpa,
      },
      select: { id: true },
    });
    await registrarCriacao(tx, { ideiaId: ideia.id, ipHash });
    return protocolo;
  });

  return { ok: true, protocolo, token, prazoTriagem: prazoTriagem() };
}
