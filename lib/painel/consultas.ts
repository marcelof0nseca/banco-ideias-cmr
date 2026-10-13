import type { Prisma, StatusIdeia } from "@/prisma/gen/client";
import type { EventoPublico } from "@/types/publico";
import { prisma } from "../sistema/prisma";
import { STATUS_PUBLICOS } from "../tramitacao/maquina-status";
import { prazoTriagem, type Prazo } from "./prazo";

/**
 * Consultas do painel interno (Triagem, Gabinete, Admin). DONO: Pessoa B.
 *
 * Diferente da consulta publica, aqui aparecem dados internos (documento
 * MASCARADO, e-mail para contato, justificativas, motivo). O documento em
 * claro nunca sai daqui - so pela acao registrada de revelar.
 */

const PENDENTES: StatusIdeia[] = ["RECEBIDA", "EM_TRIAGEM"];

function filtroTexto(busca?: string | null): Prisma.IdeiaWhereInput {
  const q = busca?.trim();
  if (!q) return {};
  return {
    OR: [
      { titulo: { contains: q, mode: "insensitive" } },
      { descricao: { contains: q, mode: "insensitive" } },
      { protocolo: { contains: q.toUpperCase() } },
    ],
  };
}

// ---------------------------------------------------------------------------
// Triagem
// ---------------------------------------------------------------------------

export interface ItemFila {
  id: string;
  protocolo: string;
  titulo: string;
  tema: string;
  status: StatusIdeia;
  criadoEm: Date;
  autorNome: string;
  documentoMascarado: string;
  prazo: Prazo | null;
}

export type FiltroFila = "pendentes" | "todas" | "arquivadas";

export async function listarFilaTriagem(opcoes: {
  filtro: FiltroFila;
  temaId?: string | null;
  busca?: string | null;
}): Promise<ItemFila[]> {
  const situacao: Prisma.IdeiaWhereInput =
    opcoes.filtro === "pendentes"
      ? { status: { in: PENDENTES } }
      : opcoes.filtro === "arquivadas"
        ? { status: "ARQUIVADA" }
        : {};

  const ideias = await prisma.ideia.findMany({
    where: { ...situacao, ...(opcoes.temaId ? { temaId: opcoes.temaId } : {}), ...filtroTexto(opcoes.busca) },
    // A mais antiga primeiro: e a que esta mais perto de vencer.
    orderBy: { criadoEm: opcoes.filtro === "pendentes" ? "asc" : "desc" },
    take: 200,
    select: {
      id: true, protocolo: true, titulo: true, status: true, criadoEm: true,
      tema: { select: { nome: true } },
      autor: { select: { nome: true, documentoMascarado: true } },
    },
  });

  const agora = new Date();
  return ideias.map((i) => ({
    id: i.id,
    protocolo: i.protocolo,
    titulo: i.titulo,
    tema: i.tema.nome,
    status: i.status,
    criadoEm: i.criadoEm,
    autorNome: i.autor.nome,
    documentoMascarado: i.autor.documentoMascarado,
    prazo: PENDENTES.includes(i.status) ? prazoTriagem(i.criadoEm, agora) : null,
  }));
}

export interface ResumoTriagem {
  recebidas: number;
  emTriagem: number;
  vencidas: number;
  publicadas: number;
  arquivadas: number;
}

export async function resumoTriagem(): Promise<ResumoTriagem> {
  const [porStatus, pendentes] = await Promise.all([
    prisma.ideia.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.ideia.findMany({ where: { status: { in: PENDENTES } }, select: { criadoEm: true } }),
  ]);
  const conta = (s: StatusIdeia) => porStatus.find((p) => p.status === s)?._count._all ?? 0;
  const agora = new Date();
  return {
    recebidas: conta("RECEBIDA"),
    emTriagem: conta("EM_TRIAGEM"),
    vencidas: pendentes.filter((p) => prazoTriagem(p.criadoEm, agora).situacao === "vencido").length,
    publicadas: STATUS_PUBLICOS.reduce((soma, s) => soma + conta(s), 0),
    arquivadas: conta("ARQUIVADA"),
  };
}

// ---------------------------------------------------------------------------
// Detalhe interno (Triagem e Gabinete)
// ---------------------------------------------------------------------------

export interface DetalheInterno {
  id: string;
  protocolo: string;
  titulo: string;
  descricao: string;
  textoOriginal: string | null;
  tema: string;
  bairro: string | null;
  rpa: number | null;
  status: StatusIdeia;
  versao: number;
  apoiosCount: number;
  criadoEm: Date;
  prazo: Prazo | null;
  autor: {
    tipo: "FISICA" | "JURIDICA";
    nome: string;
    nomePublico: boolean;
    email: string;
    telefone: string | null;
    documentoMascarado: string;
    anonimizado: boolean;
  };
  interesses: { gabinete: string; tipo: "ANALISE" | "ADOCAO"; criadoEm: Date }[];
  linhaDoTempo: EventoPublico[];
}

export async function detalheInterno(protocolo: string): Promise<DetalheInterno | null> {
  const i = await prisma.ideia.findUnique({
    where: { protocolo: protocolo.trim().toUpperCase() },
    include: {
      tema: { select: { nome: true } },
      autor: true,
      interesses: { orderBy: { criadoEm: "asc" } },
      tramitacoes: {
        orderBy: { criadoEm: "asc" },
        include: { motivo: { select: { descricao: true } }, usuario: { select: { nome: true } } },
      },
    },
  });
  if (!i) return null;

  return {
    id: i.id,
    protocolo: i.protocolo,
    titulo: i.titulo,
    descricao: i.descricao,
    textoOriginal: i.textoOriginal,
    tema: i.tema.nome,
    bairro: i.bairro,
    rpa: i.rpa,
    status: i.status,
    versao: i.versao,
    apoiosCount: i.apoiosCount,
    criadoEm: i.criadoEm,
    prazo: PENDENTES.includes(i.status) ? prazoTriagem(i.criadoEm) : null,
    autor: {
      tipo: i.autor.tipo,
      nome: i.autor.nome,
      nomePublico: i.autor.nomePublico,
      email: i.autor.email,
      telefone: i.autor.telefone,
      documentoMascarado: i.autor.documentoMascarado,
      anonimizado: i.autor.anonimizadoEm !== null,
    },
    interesses: i.interesses.map((x) => ({ gabinete: x.gabinete, tipo: x.tipo, criadoEm: x.criadoEm })),
    linhaDoTempo: i.tramitacoes.map((t) => ({
      statusNovo: t.statusNovo,
      autoria: t.gabinete ?? t.usuario?.nome ?? (t.statusNovo === "RECEBIDA" ? "Portal do cidadão" : "Secretaria da Câmara"),
      justificativa: [t.motivo ? `Motivo: ${t.motivo.descricao}.` : null, t.justificativa].filter(Boolean).join(" ") || null,
      em: t.criadoEm.toISOString(),
    })),
  };
}

// ---------------------------------------------------------------------------
// Gabinete
// ---------------------------------------------------------------------------

export interface ItemAcervo {
  id: string;
  protocolo: string;
  titulo: string;
  tema: string;
  status: StatusIdeia;
  apoiosCount: number;
  publicadoEm: Date | null;
  gabinetes: string[];
}

export type OrdemAcervo = "apoios" | "recentes";

export async function listarAcervoGabinete(opcoes: {
  ordem: OrdemAcervo;
  temaId?: string | null;
  busca?: string | null;
  situacao?: StatusIdeia | null;
  /** Quando informado, so as ideias em que este gabinete tem interesse. */
  doGabinete?: string | null;
}): Promise<ItemAcervo[]> {
  const situacoes = opcoes.situacao && STATUS_PUBLICOS.includes(opcoes.situacao) ? [opcoes.situacao] : STATUS_PUBLICOS;
  const ideias = await prisma.ideia.findMany({
    where: {
      status: { in: situacoes },
      ...(opcoes.temaId ? { temaId: opcoes.temaId } : {}),
      ...(opcoes.doGabinete ? { interesses: { some: { gabinete: opcoes.doGabinete } } } : {}),
      ...filtroTexto(opcoes.busca),
    },
    orderBy: opcoes.ordem === "apoios" ? [{ apoiosCount: "desc" }, { publicadoEm: "desc" }] : [{ publicadoEm: "desc" }],
    take: 200,
    select: {
      id: true, protocolo: true, titulo: true, status: true, apoiosCount: true, publicadoEm: true,
      tema: { select: { nome: true } },
      interesses: { select: { gabinete: true } },
    },
  });
  return ideias.map((i) => ({
    id: i.id,
    protocolo: i.protocolo,
    titulo: i.titulo,
    tema: i.tema.nome,
    status: i.status,
    apoiosCount: i.apoiosCount,
    publicadoEm: i.publicadoEm,
    gabinetes: i.interesses.map((x) => x.gabinete),
  }));
}

// ---------------------------------------------------------------------------
// Listas controladas
// ---------------------------------------------------------------------------

export function listarTemas(somenteAtivos = true) {
  return prisma.tema.findMany({
    where: somenteAtivos ? { ativo: true } : {},
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    select: { id: true, nome: true, ativo: true, _count: { select: { ideias: true } } },
  });
}

export function listarMotivos(somenteAtivos = true) {
  return prisma.motivoArquivamento.findMany({
    where: somenteAtivos ? { ativo: true } : {},
    orderBy: [{ ordem: "asc" }, { descricao: "asc" }],
    select: { id: true, codigo: true, descricao: true, ativo: true, _count: { select: { tramitacoes: true } } },
  });
}
