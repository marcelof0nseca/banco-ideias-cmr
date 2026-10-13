import { NextResponse } from "next/server";
import { exportarTitular } from "@/lib/painel/titular";
import { exigirPerfil, ipHashAtual } from "@/lib/seguranca/auth";
import { mesmaOrigem } from "@/lib/seguranca/origem";

/**
 * POST /api/painel/titular/exportar - arquivo JSON com todos os dados de um
 * titular (LGPD, art. 18, II). So ADMIN; registrado na auditoria.
 * Recebe o autorId por formulario (POST), nunca pela URL. DONO: Pessoa B.
 */
export async function POST(req: Request) {
  if (!mesmaOrigem(req)) return NextResponse.json({ mensagem: "Origem não permitida." }, { status: 403 });
  const acesso = await exigirPerfil(["ADMIN"]);
  if (!acesso.ok) return NextResponse.json({ mensagem: "Somente a administração." }, { status: acesso.status });

  const form = await req.formData().catch(() => null);
  const autorId = form?.get("autorId");
  if (typeof autorId !== "string" || !autorId) {
    return NextResponse.json({ mensagem: "Titular não informado." }, { status: 400 });
  }

  const pacote = await exportarTitular(
    { usuarioId: acesso.sessao.usuarioId, perfil: acesso.sessao.perfil, ipHash: await ipHashAtual() },
    autorId,
  );
  if (!pacote) return NextResponse.json({ mensagem: "Titular não encontrado." }, { status: 404 });

  return new NextResponse(JSON.stringify(pacote, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="dados-do-titular-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
