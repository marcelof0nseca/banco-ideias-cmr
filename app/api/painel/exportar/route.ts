import { NextResponse } from "next/server";
import { registrarEvento } from "@/lib/seguranca/auditoria";
import { exigirPerfil, ipHashAtual } from "@/lib/seguranca/auth";
import { rotuloStatus } from "@/components/ui/status";
import { prisma } from "@/lib/sistema/prisma";

/**
 * GET /api/painel/exportar - planilha CSV das ideias para relatorio
 * (especificacao, secao 3.3). Somente TRIAGEM e ADMIN. SEM dados pessoais:
 * nada de nome, documento, e-mail ou telefone. Registrada na auditoria.
 * DONO: Pessoa B.
 *
 * Separador ";" e BOM UTF-8: abre direto no Excel em portugues.
 */

function celula(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  // Evita injecao de formula ao abrir no Excel (=, +, -, @).
  const seguro = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[;"\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

const data = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export async function GET() {
  const acesso = await exigirPerfil(["TRIAGEM", "ADMIN"]);
  if (!acesso.ok) {
    return NextResponse.json({ mensagem: "Faça login com perfil de Triagem ou Administração." }, { status: acesso.status });
  }

  const ideias = await prisma.ideia.findMany({
    orderBy: { criadoEm: "asc" },
    select: {
      protocolo: true, titulo: true, status: true, bairro: true, rpa: true, apoiosCount: true,
      criadoEm: true, triadoEm: true, publicadoEm: true,
      tema: { select: { nome: true } },
      interesses: { select: { gabinete: true, tipo: true } },
    },
  });

  const cabecalho = ["protocolo", "titulo", "tema", "situacao", "bairro", "rpa", "apoios", "recebida_em", "triada_em", "publicada_em", "gabinetes"];
  const linhas = ideias.map((i) =>
    [
      i.protocolo, i.titulo, i.tema.nome, rotuloStatus(i.status), i.bairro, i.rpa, i.apoiosCount,
      data(i.criadoEm), data(i.triadoEm), data(i.publicadoEm),
      i.interesses.map((g) => `${g.gabinete}${g.tipo === "ADOCAO" ? " (adotou)" : ""}`).join(" | "),
    ].map(celula).join(";"),
  );

  await registrarEvento({
    acao: "EXPORTACAO", usuarioId: acesso.sessao.usuarioId, detalhe: `CSV com ${ideias.length} ideias`,
    ipHash: await ipHashAtual(),
  });

  const hoje = new Date().toISOString().slice(0, 10);
  return new NextResponse(`﻿${[cabecalho.join(";"), ...linhas].join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="banco-de-ideias-${hoje}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
