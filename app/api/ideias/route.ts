import { NextResponse } from "next/server";
import { cadastrarIdeia, ipDe } from "@/lib/cadastro-registro";

/**
 * POST /api/ideias - cadastro de ideia por cliente JSON.
 * A tela /participar usa a mesma regra via Server Action.
 *
 * Cabecalho obrigatorio: Idempotency-Key (gerado no inicio do preenchimento).
 * Respostas: 201 { protocolo, token, prazoTriagem } | 400 | 422 { mensagem, erros } | 429.
 * Reenvio com a mesma chave devolve a mesma resposta 201, sem novo registro.
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

  const { iniciadoEm, site, ...dados } = corpo;

  try {
    const r = await cadastrarIdeia({
      dados,
      iniciadoEm: typeof iniciadoEm === "string" ? iniciadoEm : null,
      armadilha: typeof site === "string" ? site : null,
      chaveIdempotencia: req.headers.get("idempotency-key"),
      ip: ipDe(req.headers),
    });
    if (r.ok) {
      const { ok: _ok, ...resposta } = r;
      return NextResponse.json(resposta, {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      });
    }
    return NextResponse.json(
      { mensagem: r.mensagem, erros: r.erros },
      { status: r.httpStatus },
    );
  } catch {
    // Sem detalhes na resposta nem no log: o corpo tem CPF.
    return NextResponse.json(
      { mensagem: "Erro interno. Tente novamente em instantes." },
      { status: 500 },
    );
  }
}
