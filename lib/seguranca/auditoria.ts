import type { AcaoAuditoria, Prisma } from "@/prisma/gen/client";
import { prisma } from "../sistema/prisma";

/**
 * Trilha de auditoria dos eventos que NAO sao mudanca de situacao
 * (login, revelacao de CPF, exportacao, gestao de usuarios...).
 * Especificacao tecnica, secao 8.6. DONO: Pessoa B.
 *
 * Mudanca de situacao fica em Tramitacao (lib/tramitacao/tramitacao.ts).
 *
 * REGRA: `detalhe` nunca leva CPF, senha, token ou e-mail de cidadao.
 */

export interface EventoNovo {
  acao: AcaoAuditoria;
  usuarioId?: string | null;
  alvoTipo?: string | null;
  alvoId?: string | null;
  detalhe?: string | null;
  ipHash?: string | null;
}

type Cliente = Prisma.TransactionClient | typeof prisma;

export async function registrarEvento(evento: EventoNovo, cliente: Cliente = prisma): Promise<void> {
  await cliente.eventoAuditoria.create({
    data: {
      acao: evento.acao,
      usuarioId: evento.usuarioId ?? null,
      alvoTipo: evento.alvoTipo ?? null,
      alvoId: evento.alvoId ?? null,
      detalhe: evento.detalhe ?? null,
      ipHash: evento.ipHash ?? null,
    },
  });
}

/** Rotulos legiveis para a tela de auditoria. */
export const ROTULO_ACAO: Record<AcaoAuditoria, string> = {
  LOGIN: "Entrada no painel",
  LOGIN_FALHA: "Tentativa de entrada recusada",
  LOGOUT: "Saída do painel",
  REVELACAO_DOCUMENTO: "Revelação de CPF/CNPJ",
  EXPORTACAO: "Exportação de dados",
  CONSULTA_AUDITORIA: "Consulta à trilha de auditoria",
  USUARIO_CRIADO: "Usuário criado",
  USUARIO_ALTERADO: "Usuário alterado",
  USUARIO_DESATIVADO: "Usuário desativado",
  LISTA_CONTROLADA_ALTERADA: "Lista controlada alterada",
  TEXTO_EDITADO_NA_TRIAGEM: "Texto editado na triagem",
  TITULAR_EXPORTADO: "Dados do titular exportados",
  TITULAR_ANONIMIZADO: "Titular anonimizado",
  CONSENTIMENTO_REVOGADO: "Consentimento revogado",
};
