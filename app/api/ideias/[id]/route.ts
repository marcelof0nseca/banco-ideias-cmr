import { NextResponse } from "next/server";
import { carregarIdeiaPublica } from "@/lib/consulta";

/**
 * GET /api/ideias/{protocolo} - detalhe publico (IdeiaPublicaDetalhe).
 *
 * O segmento se chama [id] porque divide a pasta com as rotas da Pessoa B
 * (/api/ideias/[id]/tramitar); para o publico, o identificador e sempre o
 * protocolo (o id interno nunca sai do servidor).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const ideia = await carregarIdeiaPublica(id);
    if (!ideia) return NextResponse.json({ mensagem: "Ideia não encontrada." }, { status: 404 });
    return NextResponse.json(ideia);
  } catch {
    return NextResponse.json({ mensagem: "Erro interno." }, { status: 500 });
  }
}
