import { Prisma, type Perfil } from "@/prisma/gen/client";
import { decifrarDocumento, formatarDocumento } from "../seguranca/documento";
import { registrarEvento } from "../seguranca/auditoria";
import { prisma } from "../sistema/prisma";

/**
 * Acoes da Triagem que nao mudam a situacao da ideia. DONO: Pessoa B.
 * Mudanca de situacao e em lib/tramitacao/tramitacao.ts.
 */

interface Quem {
  usuarioId: string;
  perfil: Perfil;
  ipHash?: string | null;
}

const PODE_TRIAR: Perfil[] = ["TRIAGEM", "ADMIN"];

export type Resultado<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { valor: T }))
  | { ok: false; httpStatus: 403 | 404 | 409 | 422; motivo: string };

// ---------------------------------------------------------------------------
// Editar redacao (secao 3.3): corrige ortografia/clareza, preserva o original
// ---------------------------------------------------------------------------

export async function editarRedacao(
  quem: Quem,
  dados: { ideiaId: string; versaoConhecida: number; titulo: string; descricao: string },
): Promise<Resultado> {
  if (!PODE_TRIAR.includes(quem.perfil)) return { ok: false, httpStatus: 403, motivo: "Perfil sem permissão." };

  const titulo = dados.titulo.trim();
  const descricao = dados.descricao.trim();
  if (titulo.length < 5 || titulo.length > 150) {
    return { ok: false, httpStatus: 422, motivo: "O título precisa ter entre 5 e 150 caracteres." };
  }
  if (descricao.length < 30 || descricao.length > 5000) {
    return { ok: false, httpStatus: 422, motivo: "A descrição precisa ter entre 30 e 5.000 caracteres." };
  }

  return prisma.$transaction(async (tx) => {
    const ideia = await tx.ideia.findUnique({
      where: { id: dados.ideiaId },
      select: { id: true, protocolo: true, status: true, versao: true, descricao: true, textoOriginal: true },
    });
    if (!ideia) return { ok: false, httpStatus: 404, motivo: "Ideia não encontrada." } as const;
    if (ideia.status !== "RECEBIDA" && ideia.status !== "EM_TRIAGEM") {
      return { ok: false, httpStatus: 422, motivo: "Só é possível editar a redação durante a triagem." } as const;
    }

    const r = await tx.ideia.updateMany({
      where: { id: ideia.id, versao: dados.versaoConhecida },
      data: {
        titulo,
        descricao,
        // Guarda a redacao do cidadao so na PRIMEIRA edicao.
        textoOriginal: ideia.textoOriginal ?? ideia.descricao,
        versao: { increment: 1 },
      },
    });
    if (r.count === 0) {
      return {
        ok: false,
        httpStatus: 409,
        motivo: "Esta ideia foi alterada por outra pessoa. Recarregue a página para ver a versão atual.",
      } as const;
    }

    await registrarEvento(
      { acao: "TEXTO_EDITADO_NA_TRIAGEM", usuarioId: quem.usuarioId, alvoTipo: Prisma.ModelName.Ideia, alvoId: ideia.protocolo, ipHash: quem.ipHash },
      tx,
    );
    return { ok: true } as const;
  });
}

// ---------------------------------------------------------------------------
// Revelar documento (secao 8.3): decifra e REGISTRA quem, quando e qual
// ---------------------------------------------------------------------------

export async function revelarDocumento(quem: Quem, ideiaId: string): Promise<Resultado<string>> {
  if (!PODE_TRIAR.includes(quem.perfil)) return { ok: false, httpStatus: 403, motivo: "Perfil sem permissão." };

  const ideia = await prisma.ideia.findUnique({
    where: { id: ideiaId },
    select: { protocolo: true, autor: { select: { tipo: true, documentoCifrado: true, anonimizadoEm: true } } },
  });
  if (!ideia) return { ok: false, httpStatus: 404, motivo: "Ideia não encontrada." };
  if (ideia.autor.anonimizadoEm || !ideia.autor.documentoCifrado) {
    return { ok: false, httpStatus: 422, motivo: "O titular foi anonimizado; o documento não existe mais." };
  }

  let documento: string;
  try {
    documento = decifrarDocumento(ideia.autor.documentoCifrado);
  } catch {
    return { ok: false, httpStatus: 422, motivo: "Não foi possível decifrar o documento deste registro." };
  }

  // Registra ANTES de devolver: nao existe revelacao sem rastro.
  await registrarEvento({
    acao: "REVELACAO_DOCUMENTO",
    usuarioId: quem.usuarioId,
    alvoTipo: Prisma.ModelName.Ideia,
    alvoId: ideia.protocolo,
    ipHash: quem.ipHash,
  });

  return { ok: true, valor: formatarDocumento(documento, ideia.autor.tipo) };
}
