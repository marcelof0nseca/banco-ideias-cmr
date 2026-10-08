import { Prisma } from "@/prisma/gen/client";
import { conferirInicio, hashIp } from "./cadastro";
import { STATUS_ACEITAM_APOIO } from "./consulta";
import { hashDocumento, soDigitos, validarCNPJ, validarCPF } from "./documento";
import { verificarLimite } from "./limite";
import { prisma } from "./prisma";
import { ehProtocoloValido } from "./protocolo";

/**
 * Apoio a uma ideia publicada (especificacao, secao 3.6). DONO: Pessoa A.
 *
 *   - um apoio por documento por ideia, garantido no banco
 *     (@@unique([ideiaId, documentoHash])); repeticao vira mensagem clara,
 *     nunca erro 500;
 *   - o documento de quem apoia NUNCA e guardado, nem cifrado: so o hash;
 *   - apoiosCount incrementado na MESMA transacao do insert;
 *   - so em situacoes que aceitam apoio; honeypot, tempo minimo e limite de
 *     taxa como no cadastro.
 */

export interface PedidoApoio {
  protocolo: string;
  documento: string;
  iniciadoEm: string | null;
  armadilha: string | null;
  ip: string | null;
}

export type ResultadoApoio =
  | { ok: true; apoiosCount: number }
  | {
      ok: false;
      httpStatus: 400 | 404 | 409 | 422 | 429;
      mensagem: string;
      campo?: "documento";
      jaApoiou?: true;
    };

const MENSAGEM_GENERICA = "Não foi possível registrar o apoio agora. Aguarde alguns segundos e tente novamente.";

/** CPF (11 digitos) ou CNPJ (14 digitos), pelo digito verificador. */
export function documentoDeApoioValido(documento: string): boolean {
  const d = soDigitos(documento);
  return d.length === 14 ? validarCNPJ(d) : validarCPF(d);
}

export async function apoiarIdeia(pedido: PedidoApoio): Promise<ResultadoApoio> {
  if (pedido.armadilha) return { ok: false, httpStatus: 400, mensagem: MENSAGEM_GENERICA };
  const inicio = conferirInicio(pedido.iniciadoEm);
  if (inicio === "rapido" || inicio === "invalido") {
    return { ok: false, httpStatus: 422, mensagem: MENSAGEM_GENERICA };
  }
  if (inicio === "expirado") {
    return { ok: false, httpStatus: 422, mensagem: "A página ficou aberta por muito tempo. Recarregue e tente de novo." };
  }

  if (!documentoDeApoioValido(pedido.documento)) {
    return {
      ok: false,
      httpStatus: 422,
      campo: "documento",
      mensagem: "CPF ou CNPJ inválido. Confira os números digitados.",
    };
  }

  const protocolo = pedido.protocolo.trim().toUpperCase();
  if (!ehProtocoloValido(protocolo)) return { ok: false, httpStatus: 404, mensagem: "Ideia não encontrada." };

  const documentoHash = hashDocumento(pedido.documento);
  const ipHash = pedido.ip ? hashIp(pedido.ip) : undefined;
  for (const chave of [{ ipHash }, { documentoHash }]) {
    const limite = await verificarLimite({ acao: "apoio", ...chave });
    if (!limite.permitido) {
      return { ok: false, httpStatus: 429, mensagem: "Muitas tentativas em pouco tempo. Tente novamente mais tarde." };
    }
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const ideia = await tx.ideia.findUnique({
        where: { protocolo },
        select: { id: true, status: true },
      });
      if (!ideia || !STATUS_ACEITAM_APOIO.includes(ideia.status)) {
        // Inexistente, em triagem, adotada ou arquivada: nao revela qual.
        return { ok: false as const, httpStatus: 409 as const, mensagem: "Esta ideia não está recebendo apoios." };
      }
      await tx.apoio.create({ data: { ideiaId: ideia.id, documentoHash, ipHash: ipHash ?? null } });
      const atualizada = await tx.ideia.update({
        where: { id: ideia.id },
        data: { apoiosCount: { increment: 1 } },
        select: { apoiosCount: true },
      });
      return { ok: true as const, apoiosCount: atualizada.apoiosCount };
    });
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return {
        ok: false,
        httpStatus: 409,
        jaApoiou: true,
        mensagem: "Você já apoiou esta ideia. Cada pessoa pode apoiar uma vez.",
      };
    }
    throw erro;
  }
}
