import { timingSafeEqual } from "node:crypto";
import type { StatusIdeia } from "@/prisma/gen/client";
import type { AcompanhamentoPrivado, EventoPublico } from "@/types/publico";
import { hashIp, hashToken } from "./cadastro";
import { hashDocumento, soDigitos } from "./documento";
import { verificarLimite } from "./limite";
import { prisma } from "./prisma";
import { ehProtocoloValido } from "./protocolo";

/**
 * "Acompanhar minha ideia" (especificacao, secao 3.5): o autor ve a situacao
 * atual (inclusive RECEBIDA/EM_TRIAGEM), a linha do tempo e, se arquivada,
 * o motivo - unico lugar em que o motivo aparece. DONO: Pessoa A.
 *
 * Seguranca:
 *   - autenticacao leve por protocolo + CPF/CNPJ do autor OU token do
 *     comprovante, comparados por hash (o documento nunca e decifrado);
 *   - mesma mensagem para protocolo inexistente e credencial errada, para nao
 *     revelar se um protocolo existe (anti-varredura);
 *   - limite de tentativas por IP (lib/limite.ts).
 */

export const MENSAGEM_NAO_CONFERE =
  "Protocolo e documento (ou token) não conferem. Confira os dados do comprovante.";

export interface PedidoAcompanhar {
  protocolo: string;
  documento?: string | null;
  token?: string | null;
  ip: string | null;
}

export type ResultadoAcompanhar =
  | { ok: true; acompanhamento: AcompanhamentoPrivado }
  | { ok: false; httpStatus: 400 | 404 | 429; mensagem: string; campo?: "protocolo" | "credencial" };

function iguaisSemVazamento(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Confere documento OU token contra os hashes gravados. */
export function credencialConfere(
  gravado: { documentoHash: string; tokenAcompHash: string },
  credencial: { documento?: string | null; token?: string | null },
): boolean {
  if (credencial.documento && soDigitos(credencial.documento).length > 0) {
    return iguaisSemVazamento(hashDocumento(credencial.documento), gravado.documentoHash);
  }
  if (credencial.token && credencial.token.trim()) {
    return iguaisSemVazamento(hashToken(credencial.token), gravado.tokenAcompHash);
  }
  return false;
}

export interface TramitacaoLida {
  statusNovo: StatusIdeia;
  justificativa: string | null;
  gabinete: string | null;
  criadoEm: Date;
  motivo: { descricao: string } | null;
}

/** Quem agiu, em forma apresentavel ao cidadao. */
export function autoriaDoEvento(t: Pick<TramitacaoLida, "statusNovo" | "gabinete">): string {
  if (t.gabinete) return t.gabinete;
  if (t.statusNovo === "RECEBIDA") return "Portal do cidadão";
  return "Secretaria da Câmara";
}

export function montarAcompanhamento(ideia: {
  protocolo: string;
  titulo: string;
  status: StatusIdeia;
  tramitacoes: TramitacaoLida[];
}): AcompanhamentoPrivado {
  const ordenadas = [...ideia.tramitacoes].sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());
  const linhaDoTempo: EventoPublico[] = ordenadas.map((t) => ({
    statusNovo: t.statusNovo,
    autoria: autoriaDoEvento(t),
    justificativa: t.justificativa,
    em: t.criadoEm.toISOString(),
  }));

  let motivoArquivamento: string | null = null;
  if (ideia.status === "ARQUIVADA") {
    const arquivamento = [...ordenadas].reverse().find((t) => t.statusNovo === "ARQUIVADA");
    motivoArquivamento =
      [arquivamento?.motivo?.descricao, arquivamento?.justificativa].filter(Boolean).join(". ") ||
      "Motivo não registrado.";
  }

  return {
    protocolo: ideia.protocolo,
    titulo: ideia.titulo,
    status: ideia.status,
    linhaDoTempo,
    motivoArquivamento,
  };
}

export async function acompanharIdeia(pedido: PedidoAcompanhar): Promise<ResultadoAcompanhar> {
  const protocolo = pedido.protocolo.trim().toUpperCase();
  if (!ehProtocoloValido(protocolo)) {
    return {
      ok: false,
      httpStatus: 400,
      campo: "protocolo",
      mensagem: "Informe o protocolo no formato BIL-AAAA-NNNNNN, como está no comprovante.",
    };
  }
  if (!soDigitos(pedido.documento ?? "") && !(pedido.token ?? "").trim()) {
    return {
      ok: false,
      httpStatus: 400,
      campo: "credencial",
      mensagem: "Informe o CPF/CNPJ do autor ou o token do comprovante.",
    };
  }

  const limite = await verificarLimite({
    acao: "acompanhar",
    ipHash: pedido.ip ? hashIp(pedido.ip) : undefined,
  });
  if (!limite.permitido) {
    return {
      ok: false,
      httpStatus: 429,
      mensagem: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
    };
  }

  const ideia = await prisma.ideia.findUnique({
    where: { protocolo },
    select: {
      protocolo: true,
      titulo: true,
      status: true,
      tokenAcompHash: true,
      autor: { select: { documentoHash: true } },
      tramitacoes: {
        where: { publica: true },
        select: {
          statusNovo: true,
          justificativa: true,
          gabinete: true,
          criadoEm: true,
          motivo: { select: { descricao: true } },
        },
      },
    },
  });

  const confere =
    ideia !== null &&
    credencialConfere(
      { documentoHash: ideia.autor.documentoHash, tokenAcompHash: ideia.tokenAcompHash },
      pedido,
    );
  if (!ideia || !confere) {
    return { ok: false, httpStatus: 404, mensagem: MENSAGEM_NAO_CONFERE };
  }

  return { ok: true, acompanhamento: montarAcompanhamento(ideia) };
}
