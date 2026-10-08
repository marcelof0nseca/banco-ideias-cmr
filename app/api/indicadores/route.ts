import { NextResponse } from "next/server";
import { carregarIndicadores } from "@/lib/indicadores/indicadores-dados";

/**
 * GET /api/indicadores - series agregadas do programa (sem dado pessoal).
 * Taxas em fracao de 0 a 1; tempo medio em dias corridos.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await carregarIndicadores(), {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return NextResponse.json({ mensagem: "Indicadores indisponíveis no momento." }, { status: 500 });
  }
}
