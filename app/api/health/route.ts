import { NextResponse } from "next/server";
import { prisma } from "@/lib/sistema/prisma";

/**
 * GET /api/health - verificacao de saude para o monitoramento da TI e o
 * HEALTHCHECK do Docker (especificacao, secao 11.5). DONO: Pessoa B.
 *
 * Responde so "ok"/"falha" por componente: nada de versao de dependencia,
 * caminho de arquivo ou mensagem de erro (nao ajuda quem ataca).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const inicio = Date.now();
  let banco: "ok" | "falha" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    banco = "falha";
  }
  const ok = banco === "ok";
  return NextResponse.json(
    { status: ok ? "ok" : "falha", banco, ms: Date.now() - inicio, em: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
