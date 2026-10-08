import type { Prisma } from "@/prisma/gen/client";
import { Perfil, StatusIdeia } from "@/prisma/gen/client";
import { validarTransicao } from "./maquina-status";

/**
 * Gravacao de tramitacao e mudanca de situacao da ideia.
 * Especificacao tecnica, secoes 6.2 e 6.3.
 *
 * DONO: Pessoa B.  CONSUMIDOR: Pessoa A (cadastro cria a linha RECEBIDA).
 *
 * `registrarCriacao` ja esta implementado porque A depende dele desde a
 * semana 2. `transitar` fica como stub ate a rota /tramitar (Pessoa B,
 * semana 2), mas ja valida o grafo via validarTransicao.
 */

/** Cria a primeira linha da linha do tempo, no cadastro (status RECEBIDA). */
export async function registrarCriacao(
  tx: Prisma.TransactionClient,
  params: { ideiaId: string; ipHash?: string },
): Promise<void> {
  await tx.tramitacao.create({
    data: {
      ideiaId: params.ideiaId,
      statusAnterior: null,
      statusNovo: StatusIdeia.RECEBIDA,
      justificativa: "Ideia registrada pelo portal.",
      publica: true,
      ipHash: params.ipHash ?? null,
    },
  });
}

export interface PedidoTransicao {
  ideiaId: string;
  destino: StatusIdeia;
  perfil: Perfil;
  /** Versao da ideia conhecida pelo cliente (controle de concorrencia -> 409). */
  versaoConhecida: number;
  justificativa?: string | null;
  motivoId?: string | null;
  gabinete?: string | null;
  usuarioId?: string | null;
  ipHash?: string | null;
}

export type ResultadoTramitar =
  | { ok: true; novoStatus: StatusIdeia; novaVersao: number }
  | { ok: false; httpStatus: 403 | 409 | 422; motivo: string };

/**
 * Aplica uma transicao: valida o grafo/perfil/justificativa, confere a versao
 * (409 em divergencia), grava a Tramitacao e atualiza o status na MESMA
 * transacao.
 *
 * TODO(Pessoa B): implementar com prisma.$transaction. A validacao de regra
 * ja esta pronta e deve ser reaproveitada (nao reimplementar o grafo aqui).
 */
export async function transitar(
  _tx: Prisma.TransactionClient,
  pedido: PedidoTransicao,
): Promise<ResultadoTramitar> {
  // A assinatura ja exercita a validacao para o consumidor enxergar o contrato.
  const _valid = validarTransicao({
    de: StatusIdeia.RECEBIDA, // na implementacao real, ler do banco
    para: pedido.destino,
    perfil: pedido.perfil,
    justificativa: pedido.justificativa,
  });
  throw new Error("transitar: stub - implementacao pendente (Pessoa B).");
}
