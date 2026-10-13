import type { Prisma } from "@/prisma/gen/client";
import { Perfil, StatusIdeia } from "@/prisma/gen/client";
import { prisma } from "../sistema/prisma";
import { validarTransicao } from "./maquina-status";

/**
 * Gravacao de tramitacao e mudanca de situacao da ideia.
 * Especificacao tecnica, secoes 6.2 e 6.3. DONO: Pessoa B.
 *
 * A UNICA forma de mudar o status de uma ideia e por `transitar`, que grava a
 * linha de Tramitacao na mesma transacao. A linha do tempo publica e a
 * auditoria sao a mesma tabela (append-only no banco, migracao 002).
 *
 * Toda tramitacao e gravada com publica = true. Quem esconde a justificativa
 * do publico e a tela (a consulta usa LinhaDoTempo com mostrarJustificativa
 * = false); o autor le a justificativa e o motivo no "Acompanhar".
 */

// ---------------------------------------------------------------------------
// Criacao (consumido pelo cadastro - Pessoa A)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Transicao de situacao
// ---------------------------------------------------------------------------

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
  | { ok: false; httpStatus: 403 | 404 | 409 | 422; motivo: string };

export const MENSAGEM_CONFLITO =
  "Esta ideia foi alterada por outra pessoa enquanto você a analisava. Recarregue a página para ver a situação atual.";

/** Texto padrao da linha do tempo, quando quem agiu nao escreveu nada. */
export function justificativaPadrao(de: StatusIdeia, para: StatusIdeia): string {
  switch (para) {
    case StatusIdeia.EM_TRIAGEM:
      return "Análise iniciada pela Secretaria.";
    case StatusIdeia.DISPONIVEL:
      return de === StatusIdeia.EM_ANALISE
        ? "Ideia devolvida ao acervo, disponível para outros gabinetes."
        : "Ideia aprovada na triagem e publicada no acervo.";
    case StatusIdeia.EM_ANALISE:
      return "Um gabinete iniciou a análise da proposta.";
    case StatusIdeia.ADOTADA:
      return "Ideia adotada por um gabinete para virar proposição.";
    default:
      return "";
  }
}

/** Transicoes que pertencem a um gabinete (exigem o nome do gabinete). */
function ehAcaoDeGabinete(de: StatusIdeia, para: StatusIdeia): boolean {
  return (
    para === StatusIdeia.EM_ANALISE ||
    para === StatusIdeia.ADOTADA ||
    (de === StatusIdeia.EM_ANALISE && para === StatusIdeia.DISPONIVEL)
  );
}

/**
 * Aplica uma transicao DENTRO da transacao recebida: valida grafo, perfil,
 * justificativa e motivo; confere a versao (409); atualiza a ideia; grava a
 * Tramitacao; mantem os interesses de gabinete.
 */
export async function transitar(
  tx: Prisma.TransactionClient,
  pedido: PedidoTransicao,
): Promise<ResultadoTramitar> {
  const ideia = await tx.ideia.findUnique({
    where: { id: pedido.ideiaId },
    select: { id: true, status: true, versao: true, triadoEm: true },
  });
  if (!ideia) return { ok: false, httpStatus: 404, motivo: "Ideia não encontrada." };

  if (ideia.versao !== pedido.versaoConhecida) {
    return { ok: false, httpStatus: 409, motivo: MENSAGEM_CONFLITO };
  }

  const de = ideia.status;
  const para = pedido.destino;
  const justificativaInformada = pedido.justificativa?.trim() || null;

  const regra = validarTransicao({ de, para, perfil: pedido.perfil, justificativa: justificativaInformada });
  if (!regra.ok) return regra;

  // Arquivamento: motivo da lista controlada + justificativa (secao 3.3).
  let motivoId: string | null = null;
  if (para === StatusIdeia.ARQUIVADA) {
    if (!pedido.motivoId) {
      return { ok: false, httpStatus: 422, motivo: "Escolha o motivo do arquivamento." };
    }
    const motivo = await tx.motivoArquivamento.findFirst({
      where: { id: pedido.motivoId, ativo: true },
      select: { id: true },
    });
    if (!motivo) return { ok: false, httpStatus: 422, motivo: "Motivo de arquivamento inválido." };
    motivoId = motivo.id;
  }

  const gabinete = pedido.gabinete?.trim() || null;
  if (ehAcaoDeGabinete(de, para) && !gabinete) {
    return { ok: false, httpStatus: 422, motivo: "Informe o gabinete ou a comissão responsável." };
  }

  // Trava otimista: so atualiza se a versao ainda e a mesma.
  const agora = new Date();
  const saiDaTriagem =
    de === StatusIdeia.EM_TRIAGEM && (para === StatusIdeia.DISPONIVEL || para === StatusIdeia.ARQUIVADA);
  const atualizada = await tx.ideia.updateMany({
    where: { id: ideia.id, versao: pedido.versaoConhecida },
    data: {
      status: para,
      versao: { increment: 1 },
      ...(saiDaTriagem && !ideia.triadoEm ? { triadoEm: agora } : {}),
      ...(de === StatusIdeia.EM_TRIAGEM && para === StatusIdeia.DISPONIVEL ? { publicadoEm: agora } : {}),
    },
  });
  if (atualizada.count === 0) {
    return { ok: false, httpStatus: 409, motivo: MENSAGEM_CONFLITO };
  }

  await tx.tramitacao.create({
    data: {
      ideiaId: ideia.id,
      statusAnterior: de,
      statusNovo: para,
      justificativa: justificativaInformada ?? justificativaPadrao(de, para),
      motivoId,
      gabinete,
      usuarioId: pedido.usuarioId ?? null,
      publica: true,
      ipHash: pedido.ipHash ?? null,
    },
  });

  // Interesses de gabinete acompanham a situacao.
  if (gabinete && (para === StatusIdeia.EM_ANALISE || para === StatusIdeia.ADOTADA)) {
    const tipo = para === StatusIdeia.ADOTADA ? "ADOCAO" : "ANALISE";
    await tx.interesseGabinete.upsert({
      where: { ideiaId_gabinete: { ideiaId: ideia.id, gabinete } },
      create: { ideiaId: ideia.id, gabinete, tipo, usuarioId: pedido.usuarioId ?? null },
      update: { tipo },
    });
  }
  if (de === StatusIdeia.EM_ANALISE && para === StatusIdeia.DISPONIVEL) {
    await tx.interesseGabinete.deleteMany({ where: { ideiaId: ideia.id } });
  }

  return { ok: true, novoStatus: para, novaVersao: ideia.versao + 1 };
}

/** Conveniencia: abre a transacao e aplica a transicao. */
export function tramitarIdeia(pedido: PedidoTransicao): Promise<ResultadoTramitar> {
  return prisma.$transaction((tx) => transitar(tx, pedido));
}

// ---------------------------------------------------------------------------
// Varios gabinetes na mesma ideia (secao 3.4)
// ---------------------------------------------------------------------------

/**
 * Gabinete manifesta interesse. Se a ideia esta DISPONIVEL, ela passa a
 * EM_ANALISE (transicao normal). Se ja esta EM_ANALISE por outro gabinete, so
 * registra o novo interessado - nao ha reserva exclusiva.
 */
export async function manifestarInteresse(
  pedido: Omit<PedidoTransicao, "destino">,
): Promise<ResultadoTramitar> {
  return prisma.$transaction(async (tx) => {
    const ideia = await tx.ideia.findUnique({
      where: { id: pedido.ideiaId },
      select: { status: true, versao: true },
    });
    if (!ideia) return { ok: false, httpStatus: 404, motivo: "Ideia não encontrada." } as const;

    if (ideia.status === StatusIdeia.EM_ANALISE) {
      if (pedido.perfil !== Perfil.GABINETE && pedido.perfil !== Perfil.ADMIN) {
        return { ok: false, httpStatus: 403, motivo: "Perfil sem permissão." } as const;
      }
      const gabinete = pedido.gabinete?.trim();
      if (!gabinete) {
        return { ok: false, httpStatus: 422, motivo: "Informe o gabinete ou a comissão responsável." } as const;
      }
      await tx.interesseGabinete.upsert({
        where: { ideiaId_gabinete: { ideiaId: pedido.ideiaId, gabinete } },
        create: { ideiaId: pedido.ideiaId, gabinete, tipo: "ANALISE", usuarioId: pedido.usuarioId ?? null },
        update: {},
      });
      return { ok: true, novoStatus: ideia.status, novaVersao: ideia.versao } as const;
    }

    return transitar(tx, { ...pedido, destino: StatusIdeia.EM_ANALISE });
  });
}

export const MENSAGEM_SEM_ANALISE = "Seu gabinete precisa iniciar a análise antes de adotar a ideia.";

/**
 * Gabinete adota a ideia. So pode adotar quem iniciou a analise (tem
 * interesse registrado) - evita "tomar" a ideia de outro gabinete. O ADMIN
 * pode registrar a adocao em nome de um gabinete.
 */
export async function adotarIdeia(pedido: Omit<PedidoTransicao, "destino">): Promise<ResultadoTramitar> {
  return prisma.$transaction(async (tx) => {
    const gabinete = pedido.gabinete?.trim();
    if (!gabinete) {
      return { ok: false, httpStatus: 422, motivo: "Informe o gabinete ou a comissão responsável." } as const;
    }
    if (pedido.perfil !== Perfil.ADMIN) {
      const interesse = await tx.interesseGabinete.count({ where: { ideiaId: pedido.ideiaId, gabinete } });
      if (interesse === 0) return { ok: false, httpStatus: 422, motivo: MENSAGEM_SEM_ANALISE } as const;
    }
    return transitar(tx, { ...pedido, destino: StatusIdeia.ADOTADA });
  });
}

/**
 * Gabinete desiste da analise. Remove so o interesse dele; se nenhum outro
 * gabinete continuar interessado, a ideia volta ao acervo (DISPONIVEL).
 */
export async function desistirDaAnalise(
  pedido: Omit<PedidoTransicao, "destino">,
): Promise<ResultadoTramitar> {
  return prisma.$transaction(async (tx) => {
    const gabinete = pedido.gabinete?.trim();
    if (!gabinete) {
      return { ok: false, httpStatus: 422, motivo: "Informe o gabinete ou a comissão responsável." } as const;
    }
    const ideia = await tx.ideia.findUnique({
      where: { id: pedido.ideiaId },
      select: { status: true, versao: true },
    });
    if (!ideia) return { ok: false, httpStatus: 404, motivo: "Ideia não encontrada." } as const;
    if (ideia.status !== StatusIdeia.EM_ANALISE) {
      return { ok: false, httpStatus: 422, motivo: "A ideia não está em análise." } as const;
    }

    await tx.interesseGabinete.deleteMany({ where: { ideiaId: pedido.ideiaId, gabinete } });
    const restantes = await tx.interesseGabinete.count({ where: { ideiaId: pedido.ideiaId } });
    if (restantes > 0) {
      return { ok: true, novoStatus: ideia.status, novaVersao: ideia.versao } as const;
    }
    return transitar(tx, { ...pedido, destino: StatusIdeia.DISPONIVEL });
  });
}
