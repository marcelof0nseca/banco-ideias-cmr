import { NextResponse } from "next/server";
import { StatusIdeia } from "@/prisma/gen/client";
import { exigirPerfil, ipHashAtual } from "@/lib/seguranca/auth";
import { mesmaOrigem } from "@/lib/seguranca/origem";
import { prisma } from "@/lib/sistema/prisma";
import { adotarIdeia, manifestarInteresse, tramitarIdeia, type PedidoTransicao } from "@/lib/tramitacao/tramitacao";

/**
 * POST /api/ideias/{protocolo}/tramitar - muda a situacao de uma ideia.
 * Especificacao, secao 7. DONO: Pessoa B.
 *
 * Corpo: { destino, versao, motivoId?, justificativa?, gabinete? }
 * 200 { protocolo, status, versao } | 400 | 401 | 403 | 404 | 409 | 422
 *
 * O segmento [id] e o protocolo (convencao das rotas publicas: o id interno
 * nao sai do servidor). Grafo, perfil, justificativa e versao sao conferidos
 * em lib/tramitacao - a mesma regra das telas.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!mesmaOrigem(req)) return NextResponse.json({ mensagem: "Origem não permitida." }, { status: 403 });

  const acesso = await exigirPerfil(["TRIAGEM", "GABINETE", "ADMIN"]);
  if (!acesso.ok) {
    return NextResponse.json(
      { mensagem: acesso.status === 401 ? "Faça login." : "Perfil sem permissão." },
      { status: acesso.status },
    );
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ mensagem: "Corpo JSON inválido." }, { status: 400 });
  }
  const destino = corpo.destino as StatusIdeia;
  const versao = Number(corpo.versao);
  if (!Object.values(StatusIdeia).includes(destino) || !Number.isInteger(versao)) {
    return NextResponse.json({ mensagem: "Informe destino e versao válidos." }, { status: 400 });
  }

  const { id: protocolo } = await ctx.params;
  const ideia = await prisma.ideia.findUnique({ where: { protocolo: protocolo.toUpperCase() }, select: { id: true } });
  if (!ideia) return NextResponse.json({ mensagem: "Ideia não encontrada." }, { status: 404 });

  const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const pedido: Omit<PedidoTransicao, "destino"> = {
    ideiaId: ideia.id,
    perfil: acesso.sessao.perfil,
    versaoConhecida: versao,
    justificativa: texto(corpo.justificativa),
    motivoId: texto(corpo.motivoId),
    gabinete: acesso.sessao.gabinete ?? texto(corpo.gabinete),
    usuarioId: acesso.sessao.usuarioId,
    ipHash: await ipHashAtual(),
  };

  const r =
    destino === "EM_ANALISE"
      ? await manifestarInteresse(pedido)
      : destino === "ADOTADA"
        ? await adotarIdeia(pedido)
        : await tramitarIdeia({ ...pedido, destino });

  if (!r.ok) return NextResponse.json({ mensagem: r.motivo }, { status: r.httpStatus });
  return NextResponse.json(
    { protocolo: protocolo.toUpperCase(), status: r.novoStatus, versao: r.novaVersao },
    { headers: { "Cache-Control": "no-store" } },
  );
}
