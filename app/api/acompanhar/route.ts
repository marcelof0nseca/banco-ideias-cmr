import { NextResponse } from "next/server";
import { acompanharIdeia } from "@/lib/acompanhamento";
import { ipDe } from "@/lib/cadastro-registro";

/**
 * POST /api/acompanhar - situacao da ideia para o proprio autor.
 * Corpo: { protocolo, documento? , token? } (um dos dois). POST para que o
 * CPF nunca va para a URL nem para logs de acesso.
 *
 * Respostas: 200 AcompanhamentoPrivado | 400 | 404 (generico) | 429.
 */
export async function POST(req: Request) {
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
    const r = await acompanharIdeia({
      protocolo: texto(corpo.protocolo) ?? "",
      documento: texto(corpo.documento),
      token: texto(corpo.token),
      ip: ipDe(req.headers),
    });
    if (r.ok) {
      return NextResponse.json(r.acompanhamento, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ mensagem: r.mensagem }, { status: r.httpStatus });
  } catch {
    return NextResponse.json({ mensagem: "Erro interno. Tente novamente em instantes." }, { status: 500 });
  }
}
