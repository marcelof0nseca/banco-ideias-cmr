import { NextResponse } from "next/server";
import { apoiarIdeia } from "@/lib/apoio";
import { ipDe } from "@/lib/cadastro-registro";

/**
 * POST /api/ideias/{protocolo}/apoiar - registra um apoio.
 * Corpo: { documento, iniciadoEm, site } (site = campo-armadilha, vazio).
 * Respostas: 201 { apoiosCount } | 400 | 409 (ja apoiou / nao aceita) | 422 | 429.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let corpo: Record<string, unknown>;
  try {
    const json: unknown = await req.json();
    if (!json || typeof json !== "object" || Array.isArray(json)) throw new Error();
    corpo = json as Record<string, unknown>;
  } catch {
    return NextResponse.json({ mensagem: "Corpo JSON inválido." }, { status: 400 });
  }
  const texto = (v: unknown) => (typeof v === "string" ? v : null);

  try {
    const r = await apoiarIdeia({
      protocolo: decodeURIComponent(id),
      documento: texto(corpo.documento) ?? "",
      iniciadoEm: texto(corpo.iniciadoEm),
      armadilha: texto(corpo.site),
      ip: ipDe(req.headers),
    });
    if (r.ok) return NextResponse.json({ apoiosCount: r.apoiosCount }, { status: 201 });
    return NextResponse.json({ mensagem: r.mensagem }, { status: r.httpStatus });
  } catch {
    return NextResponse.json({ mensagem: "Erro interno. Tente novamente em instantes." }, { status: 500 });
  }
}
