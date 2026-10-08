import { cache } from "react";
import type { StatusIdeia } from "@/prisma/gen/client";
import type { IdeiaPublicaDetalhe } from "@/types/publico";
import { autoriaDoEvento } from "./acompanhamento";
import { STATUS_PUBLICOS } from "./maquina-status";
import { prisma } from "./prisma";
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
