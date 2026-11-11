import { cache } from "react";
import type { Prisma, StatusIdeia } from "@/prisma/gen/client";
import type { IdeiaPublicaDetalhe, IdeiaPublicaResumo } from "@/types/publico";
import { autoriaDoEvento } from "./acompanhamento";
import { STATUS_PUBLICOS } from "../tramitacao/maquina-status";
import { prisma } from "../sistema/prisma";
import { ehProtocoloValido } from "./protocolo";
import { exibicaoAutor } from "./publico";

/**
 * Leitura publica de uma ideia (detalhe /consulta/{protocolo} e
 * GET /api/ideias/{protocolo}). DONO: Pessoa A.
 *
 * Regras (especificacao, secoes 3.4 e 8.3):
 *   - so ideias em situacao publica; em triagem ou inexistente -> null (404
 *     igual, sem revelar que o protocolo existe);
 *   - projecao com `select` explicito: nada de documento, e-mail, telefone,
 *     IP nem usuario interno;
 *   - linha do tempo so com tramitacao publica e SEM justificativa (o motivo
 *     de arquivamento e exclusivo do autor, no Acompanhar).
 */

/** Situacoes em que a ideia aceita apoio. (A confirmar com a Secretaria.) */
export const STATUS_ACEITAM_APOIO: StatusIdeia[] = ["DISPONIVEL", "EM_ANALISE"];

export const TAMANHO_RESUMO = 190;

export function resumir(texto: string, tamanho = TAMANHO_RESUMO): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (limpo.length <= tamanho) return limpo;
  return `${limpo.slice(0, tamanho).replace(/\s+\S*$/, "")}…`;
}

/** Mesma consulta para a pagina e o generateMetadata (cache por requisicao). */
export const carregarIdeiaPublica = cache(
  async (protocolo: string): Promise<IdeiaPublicaDetalhe | null> => {
    const p = decodeURIComponent(protocolo).trim().toUpperCase();
    if (!ehProtocoloValido(p)) return null;

    const ideia = await prisma.ideia.findFirst({
      where: { protocolo: p, status: { in: STATUS_PUBLICOS } },
      select: {
        protocolo: true,
        titulo: true,
        descricao: true,
        status: true,
        bairro: true,
        rpa: true,
        apoiosCount: true,
        criadoEm: true,
        tema: { select: { nome: true } },
        autor: { select: { nome: true, nomePublico: true, tipo: true } },
        interesses: { select: { gabinete: true }, orderBy: { criadoEm: "asc" } },
        tramitacoes: {
          where: { publica: true },
          orderBy: { criadoEm: "asc" },
          select: { statusNovo: true, gabinete: true, criadoEm: true },
        },
      },
    });
    if (!ideia) return null;

    return {
      protocolo: ideia.protocolo,
      titulo: ideia.titulo,
      tema: ideia.tema.nome,
      status: ideia.status,
      autor: { exibicao: exibicaoAutor(ideia.autor), tipo: ideia.autor.tipo },
      apoiosCount: ideia.apoiosCount,
      resumo: resumir(ideia.descricao),
      rpa: ideia.rpa,
      gabinetesInteressados: ideia.interesses.map((i) => i.gabinete),
      criadoEm: ideia.criadoEm.toISOString(),
      descricao: ideia.descricao,
      bairro: ideia.bairro,
      linhaDoTempo: ideia.tramitacoes.map((t) => ({
        statusNovo: t.statusNovo,
        autoria: autoriaDoEvento(t),
        justificativa: null,
        em: t.criadoEm.toISOString(),
      })),
    };
  },
);

// ---------------------------------------------------------------------------
// Lista publica (/consulta): busca, filtros e paginacao.
// Tudo vem da URL (formulario GET), para funcionar sem JavaScript e permitir
// copiar o link de uma busca.
// ---------------------------------------------------------------------------

export const POR_PAGINA = 10;
export const BUSCA_MAX = 100;

export interface FiltrosConsulta {
  busca: string;
  temaId: string | null;
  situacao: StatusIdeia | null;
  pagina: number;
}

type ParametrosUrl = Record<string, string | string[] | undefined>;

function primeiro(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

/** Le e saneia os filtros da URL. Valor estranho vira "sem filtro", nunca erro. */
export function lerFiltrosConsulta(p: ParametrosUrl): FiltrosConsulta {
  const busca = primeiro(p.busca).replace(/\s+/g, " ").trim().slice(0, BUSCA_MAX);
  const tema = primeiro(p.tema).trim();
  const situacao = primeiro(p.situacao) as StatusIdeia;
  const pagina = Number.parseInt(primeiro(p.pagina), 10);
  return {
    busca,
    temaId: /^[a-z0-9]{1,40}$/i.test(tema) ? tema : null,
    situacao: STATUS_PUBLICOS.includes(situacao) ? situacao : null,
    pagina: Number.isFinite(pagina) && pagina > 1 ? pagina : 1,
  };
}

export function temFiltro(f: FiltrosConsulta): boolean {
  return Boolean(f.busca || f.temaId || f.situacao);
}

/** Link da lista com os filtros atuais (rota crua, para next/link). */
export function hrefConsulta(f: FiltrosConsulta, pagina = f.pagina): string {
  const q = new URLSearchParams();
  if (f.busca) q.set("busca", f.busca);
  if (f.temaId) q.set("tema", f.temaId);
  if (f.situacao) q.set("situacao", f.situacao);
  if (pagina > 1) q.set("pagina", String(pagina));
  const s = q.toString();
  return s ? `/consulta?${s}` : "/consulta";
}

/** Condicao do banco: so situacoes publicas, mais os filtros escolhidos. */
export function condicaoConsulta(f: FiltrosConsulta): Prisma.IdeiaWhereInput {
  return {
    status: f.situacao ? f.situacao : { in: STATUS_PUBLICOS },
    ...(f.temaId ? { temaId: f.temaId } : {}),
    ...(f.busca
      ? {
          OR: [
            { titulo: { contains: f.busca, mode: "insensitive" } },
            { descricao: { contains: f.busca, mode: "insensitive" } },
            { protocolo: { contains: f.busca.toUpperCase() } },
          ],
        }
      : {}),
  };
}

export interface PaginaConsulta {
  ideias: IdeiaPublicaResumo[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

export async function listarIdeiasPublicas(f: FiltrosConsulta): Promise<PaginaConsulta> {
  const where = condicaoConsulta(f);
  const total = await prisma.ideia.count({ where });
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  // Pagina alem da ultima (link antigo, URL editada): mostra a ultima.
  const pagina = Math.min(f.pagina, totalPaginas);

  const ideias = await prisma.ideia.findMany({
    where,
    orderBy: [{ criadoEm: "desc" }, { protocolo: "desc" }],
    skip: (pagina - 1) * POR_PAGINA,
    take: POR_PAGINA,
    select: {
      protocolo: true,
      titulo: true,
      descricao: true,
      status: true,
      rpa: true,
      apoiosCount: true,
      criadoEm: true,
      tema: { select: { nome: true } },
      autor: { select: { nome: true, nomePublico: true, tipo: true } },
    },
  });

  return {
    total,
    pagina,
    totalPaginas,
    ideias: ideias.map((i) => ({
      protocolo: i.protocolo,
      titulo: i.titulo,
      tema: i.tema.nome,
      status: i.status,
      autor: { exibicao: exibicaoAutor(i.autor), tipo: i.autor.tipo },
      apoiosCount: i.apoiosCount,
      resumo: resumir(i.descricao),
      rpa: i.rpa,
      gabinetesInteressados: [],
      criadoEm: i.criadoEm.toISOString(),
    })),
  };
}

/** Primeira, ultima e vizinhas da atual; null marca um salto ("…"). */
export function paginasVisiveis(atual: number, total: number): (number | null)[] {
  const conjunto = new Set([1, total, atual - 1, atual, atual + 1].filter((n) => n >= 1 && n <= total));
  const ordenadas = [...conjunto].sort((a, b) => a - b);
  const saida: (number | null)[] = [];
  let anterior = 0;
  for (const n of ordenadas) {
    if (anterior && n - anterior > 1) saida.push(null);
    saida.push(n);
    anterior = n;
  }
  return saida;
}
