import { Prisma } from "@/prisma/gen/client";
import { registrarEvento } from "../seguranca/auditoria";
import { decifrarDocumento, formatarDocumento, hashDocumento, validarDocumento } from "../seguranca/documento";
import { prisma } from "../sistema/prisma";
import type { Quem } from "./admin";

/**
 * Atendimento ao titular de dados (LGPD, art. 18; especificacao, secao 9.5).
 * DONO: Pessoa B. So ADMIN. Toda acao vai para a auditoria.
 *
 *  - localizar: pelo CPF/CNPJ informado pelo proprio titular (busca por hash,
 *    o documento cifrado nao e varrido);
 *  - exportar: todos os dados do titular e das ideias dele (acesso);
 *  - revogar consentimento: o nome deixa de aparecer na consulta publica;
 *  - anonimizar: apaga documento e contatos; as ideias e a tramitacao ficam
 *    como registro publico desidentificado.
 */

export const NOME_ANONIMIZADO = "Titular anonimizado";

export interface Titular {
  id: string;
  tipo: "FISICA" | "JURIDICA";
  nome: string;
  email: string;
  telefone: string | null;
  documentoMascarado: string;
  nomePublico: boolean;
  consentimentoEm: Date;
  avisoPrivacidadeVersao: string;
  anonimizadoEm: Date | null;
  ideias: { protocolo: string; titulo: string; status: string; criadoEm: Date }[];
}

export async function localizarTitular(documento: string, tipo: "FISICA" | "JURIDICA"): Promise<Titular | null> {
  if (!validarDocumento(documento, tipo)) return null;
  const autor = await prisma.autor.findUnique({
    where: { documentoHash: hashDocumento(documento) },
    include: { ideias: { orderBy: { criadoEm: "asc" }, select: { protocolo: true, titulo: true, status: true, criadoEm: true } } },
  });
  if (!autor) return null;
  return {
    id: autor.id,
    tipo: autor.tipo,
    nome: autor.nome,
    email: autor.email,
    telefone: autor.telefone,
    documentoMascarado: autor.documentoMascarado,
    nomePublico: autor.nomePublico,
    consentimentoEm: autor.consentimentoEm,
    avisoPrivacidadeVersao: autor.avisoPrivacidadeVersao,
    anonimizadoEm: autor.anonimizadoEm,
    ideias: autor.ideias,
  };
}

/** Pacote com todos os dados do titular, para entregar a ele (direito de acesso). */
export async function exportarTitular(quem: Quem, autorId: string) {
  if (quem.perfil !== "ADMIN") return null;
  const a = await prisma.autor.findUnique({
    where: { id: autorId },
    include: {
      ideias: {
        orderBy: { criadoEm: "asc" },
        include: {
          tema: { select: { nome: true } },
          tramitacoes: { orderBy: { criadoEm: "asc" }, include: { motivo: { select: { descricao: true } } } },
        },
      },
    },
  });
  if (!a) return null;

  let documento: string | null = null;
  if (!a.anonimizadoEm && a.documentoCifrado) {
    try {
      documento = formatarDocumento(decifrarDocumento(a.documentoCifrado), a.tipo);
    } catch {
      documento = null;
    }
  }

  await registrarEvento({
    acao: "TITULAR_EXPORTADO", usuarioId: quem.usuarioId, alvoTipo: Prisma.ModelName.Autor, alvoId: a.id,
    detalhe: `${a.ideias.length} ideia(s)`, ipHash: quem.ipHash,
  });

  return {
    geradoEm: new Date().toISOString(),
    origem: "Banco de Ideias Legislativas - Câmara Municipal do Recife",
    baseLegal: "Lei nº 13.709/2018 (LGPD), art. 18, II - acesso aos dados",
    titular: {
      tipo: a.tipo === "JURIDICA" ? "Pessoa jurídica" : "Pessoa física",
      nome: a.nome,
      documento,
      email: a.email,
      telefone: a.telefone,
      autorizaDivulgarNome: a.nomePublico,
      consentimentoEm: a.consentimentoEm.toISOString(),
      versaoAvisoPrivacidade: a.avisoPrivacidadeVersao,
      anonimizadoEm: a.anonimizadoEm?.toISOString() ?? null,
    },
    ideias: a.ideias.map((i) => ({
      protocolo: i.protocolo,
      titulo: i.titulo,
      descricao: i.descricao,
      tema: i.tema.nome,
      bairro: i.bairro,
      rpa: i.rpa,
      apoios: i.apoiosCount,
      recebidaEm: i.criadoEm.toISOString(),
      tramitacao: i.tramitacoes.map((t) => ({
        situacao: t.statusNovo,
        em: t.criadoEm.toISOString(),
        motivo: t.motivo?.descricao ?? null,
        justificativa: t.justificativa,
      })),
    })),
  };
}

export async function revogarConsentimento(quem: Quem, autorId: string): Promise<boolean> {
  if (quem.perfil !== "ADMIN") return false;
  await prisma.autor.update({ where: { id: autorId }, data: { nomePublico: false } });
  await registrarEvento({
    acao: "CONSENTIMENTO_REVOGADO", usuarioId: quem.usuarioId, alvoTipo: Prisma.ModelName.Autor, alvoId: autorId,
    detalhe: "divulgação do nome", ipHash: quem.ipHash,
  });
  return true;
}

/**
 * Anonimiza: apaga documento (cifrado, hash e mascara) e contatos. As
 * colunas sao obrigatorias no esquema, entao recebem marcadores neutros; o
 * hash recebe um valor unico que nao corresponde a nenhum CPF.
 */
export async function anonimizarTitular(quem: Quem, autorId: string): Promise<boolean> {
  if (quem.perfil !== "ADMIN") return false;
  await prisma.$transaction(async (tx) => {
    await tx.autor.update({
      where: { id: autorId },
      data: {
        nome: NOME_ANONIMIZADO,
        email: "",
        telefone: null,
        documentoCifrado: "",
        documentoHash: `anonimizado:${autorId}`,
        documentoMascarado: "—",
        nomePublico: false,
        anonimizadoEm: new Date(),
      },
    });
    await registrarEvento(
      { acao: "TITULAR_ANONIMIZADO", usuarioId: quem.usuarioId, alvoTipo: Prisma.ModelName.Autor, alvoId: autorId, ipHash: quem.ipHash },
      tx,
    );
  });
  return true;
}
