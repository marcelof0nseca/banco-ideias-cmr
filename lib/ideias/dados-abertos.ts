import { rotuloStatus } from "@/components/ui/status";
import { STATUS_PUBLICOS } from "../tramitacao/maquina-status";
import { RPAS } from "../regioes/rpa";
import { prisma } from "../sistema/prisma";
import { urlIdeiaAbsoluta } from "../sistema/url";

/**
 * Dados abertos do acervo (Lei 12.527/2011 - LAI; especificacao, secao 10.3).
 * DONO: Pessoa A (implementado pela Pessoa B - revisar no PR).
 *
 * SEM QUALQUER DADO PESSOAL: nem o nome do autor, mesmo com consentimento -
 * o consentimento foi para a consulta publica, nao para redistribuicao em
 * massa. So ideias que passaram pela triagem (situacoes publicas).
 */

export interface IdeiaAberta {
  protocolo: string;
  titulo: string;
  descricao: string;
  tema: string;
  situacao: string;
  bairro: string | null;
  rpa: number | null;
  regiao: string | null;
  apoios: number;
  publicadaEm: string | null;
  gabinetesInteressados: string[];
  adotadaPor: string | null;
  url: string;
}

export const LICENCA = "Creative Commons Atribuição 4.0 (CC BY 4.0)";
export const FONTE = "Câmara Municipal do Recife — Banco de Ideias Legislativas";

export async function carregarDadosAbertos(): Promise<IdeiaAberta[]> {
  const ideias = await prisma.ideia.findMany({
    where: { status: { in: STATUS_PUBLICOS } },
    orderBy: { publicadoEm: "asc" },
    // select explicito: nada de autor, documento, contato ou usuario interno.
    select: {
      protocolo: true, titulo: true, descricao: true, status: true, bairro: true, rpa: true,
      apoiosCount: true, publicadoEm: true,
      tema: { select: { nome: true } },
      interesses: { select: { gabinete: true, tipo: true } },
    },
  });
  return ideias.map((i) => ({
    protocolo: i.protocolo,
    titulo: i.titulo,
    descricao: i.descricao,
    tema: i.tema.nome,
    situacao: rotuloStatus(i.status),
    bairro: i.bairro,
    rpa: i.rpa,
    regiao: i.rpa ? (RPAS[i.rpa] ?? null) : null,
    apoios: i.apoiosCount,
    publicadaEm: i.publicadoEm?.toISOString().slice(0, 10) ?? null,
    gabinetesInteressados: i.interesses.map((g) => g.gabinete),
    adotadaPor: i.interesses.find((g) => g.tipo === "ADOCAO")?.gabinete ?? null,
    url: urlIdeiaAbsoluta(i.protocolo),
  }));
}

function celula(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  const seguro = /^[=+\-@]/.test(s) ? `'${s}` : s; // evita injecao de formula
  return /[;"\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

/** CSV com ";" e BOM UTF-8 (abre direto no Excel em portugues). */
export function paraCsv(ideias: IdeiaAberta[]): string {
  const cabecalho = [
    "protocolo", "titulo", "descricao", "tema", "situacao", "bairro", "rpa", "regiao",
    "apoios", "publicada_em", "gabinetes_interessados", "adotada_por", "url",
  ];
  const linhas = ideias.map((i) =>
    [
      i.protocolo, i.titulo, i.descricao, i.tema, i.situacao, i.bairro, i.rpa, i.regiao,
      i.apoios, i.publicadaEm, i.gabinetesInteressados.join(" | "), i.adotadaPor, i.url,
    ].map(celula).join(";"),
  );
  return `﻿${[cabecalho.join(";"), ...linhas].join("\r\n")}`;
}
