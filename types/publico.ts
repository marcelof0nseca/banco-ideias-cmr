import type { StatusIdeia } from "@/prisma/gen/client";

/**
 * Tipos da camada PUBLICA - o que pode sair do servidor para qualquer pessoa.
 * Especificacao tecnica, secoes 8.3 (minimizacao) e criterio de aceite 5.
 *
 * DONO: Pessoa A.  CONSUMIDOR: Pessoa B (testes de vazamento).
 *
 * REGRA DURA: nenhum campo aqui pode conter CPF/CNPJ, e-mail, telefone nem IP.
 * Se um dia for preciso acrescentar um campo, ele passa por este arquivo e
 * pelo teste de vazamento. E um contrato: alterar so com os dois de acordo.
 */

/** Autor como aparece ao publico: nome so com consentimento. */
export interface AutorPublico {
  /** Nome real, ou "Cidada(o) do Recife" / "Entidade" quando sem consentimento. */
  exibicao: string;
  tipo: "FISICA" | "JURIDICA";
}

/** Um evento da linha do tempo publica (Tramitacao com publica = true). */
export interface EventoPublico {
  statusNovo: StatusIdeia;
  /** Quem agiu, em forma apresentavel: "Servidor - Secretaria", gabinete, etc. */
  autoria: string;
  justificativa: string | null;
  /** ISO 8601. */
  em: string;
}

/** Ideia em listagem publica (cards da consulta). */
export interface IdeiaPublicaResumo {
  protocolo: string;
  titulo: string;
  tema: string;
  status: StatusIdeia;
  autor: AutorPublico;
  apoiosCount: number;
  resumo: string;
  rpa: number | null;
  gabinetesInteressados: string[];
  criadoEm: string;
}

/** Ideia em detalhe publico (/consulta/{protocolo}). */
export interface IdeiaPublicaDetalhe extends IdeiaPublicaResumo {
  descricao: string;
  bairro: string | null;
  linhaDoTempo: EventoPublico[];
}

/** Resposta de "Acompanhar minha ideia" (protocolo + CPF do autor). */
export interface AcompanhamentoPrivado {
  protocolo: string;
  titulo: string;
  status: StatusIdeia;
  linhaDoTempo: EventoPublico[];
  /** Preenchido SO quando arquivada - visivel apenas ao autor. */
  motivoArquivamento: string | null;
}
