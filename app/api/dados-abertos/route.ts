import { NextResponse } from "next/server";
import { carregarDadosAbertos, FONTE, LICENCA, paraCsv } from "@/lib/ideias/dados-abertos";

/**
 * GET /api/dados-abertos            -> JSON
 * GET /api/dados-abertos?formato=csv -> CSV (";" e UTF-8 com BOM)
 *
 * Acervo publico sem nenhum dado pessoal (LAI, especificacao 10.3).
 * DONO: Pessoa A (implementado pela Pessoa B - revisar no PR).
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const formato = new URL(req.url).searchParams.get("formato");
    const ideias = await carregarDadosAbertos();
    const cache = { "Cache-Control": "public, max-age=300" };

    if (formato === "csv") {
      return new NextResponse(paraCsv(ideias), {
        headers: {
          ...cache,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="banco-de-ideias-dados-abertos.csv"',
        },
      });
    }

    return NextResponse.json(
      { fonte: FONTE, licenca: LICENCA, geradoEm: new Date().toISOString(), total: ideias.length, ideias },
      { headers: cache },
    );
  } catch {
    return NextResponse.json({ mensagem: "Erro interno." }, { status: 500 });
  }
}
