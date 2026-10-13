import { NextResponse } from "next/server";
import { revelarDocumento } from "@/lib/painel/acoes-ideia";
import { exigirPerfil, ipHashAtual } from "@/lib/seguranca/auth";
import { mesmaOrigem } from "@/lib/seguranca/origem";
import { prisma } from "@/lib/sistema/prisma";

/**
 * POST /api/ideias/{protocolo}/revelar-documento - devolve o CPF/CNPJ do
 * autor. So TRIAGEM e ADMIN. Cada chamada e registrada na auditoria ANTES da
 * resposta (especificacao, secao 8.3). DONO: Pessoa B.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!mesmaOrigem(req)) return NextResponse.json({ mensagem: "Origem não permitida." }, { status: 403 });

  const acesso = await exigirPerfil(["TRIAGEM", "ADMIN"]);
  if (!acesso.ok) {
    return NextResponse.json(
      { mensagem: acesso.status === 401 ? "Faça login." : "Perfil sem permissão." },
      { status: acesso.status },
    );
  }

  const { id: protocolo } = await ctx.params;
  const ideia = await prisma.ideia.findUnique({ where: { protocolo: protocolo.toUpperCase() }, select: { id: true } });
  if (!ideia) return NextResponse.json({ mensagem: "Ideia não encontrada." }, { status: 404 });

  const r = await revelarDocumento(
    { usuarioId: acesso.sessao.usuarioId, perfil: acesso.sessao.perfil, ipHash: await ipHashAtual() },
    ideia.id,
  );
  if (!r.ok) return NextResponse.json({ mensagem: r.motivo }, { status: r.httpStatus });
  // no-store: o documento nunca pode ficar em cache intermediario.
  return NextResponse.json({ documento: r.valor }, { headers: { "Cache-Control": "no-store" } });
}
