import { Perfil, StatusIdeia } from "@/prisma/gen/client";

/**
 * Maquina de estados do ciclo de vida de uma ideia.
 * Especificacao tecnica, secao 6.2.
 *
 * DONO: Pessoa B.  CONSUMIDORES: A (cria a linha RECEBIDA no cadastro) e B
 * (rota /tramitar). Mudar este grafo e mudar um contrato: so com os dois
 * de acordo no PR (ver CONTRIBUTING.md).
 *
 * A interface pode esconder botoes invalidos por conveniencia, mas a
 * autorizacao real acontece AQUI, no servidor, a cada transicao.
 */

/** Transicoes permitidas e quais perfis podem executa-las. */
export const TRANSICOES: Record<
  StatusIdeia,
  { para: StatusIdeia[]; perfis: Perfil[] }
> = {
  RECEBIDA: {
    para: [StatusIdeia.EM_TRIAGEM],
    perfis: [Perfil.TRIAGEM, Perfil.ADMIN],
  },
  EM_TRIAGEM: {
    para: [StatusIdeia.DISPONIVEL, StatusIdeia.ARQUIVADA],
    perfis: [Perfil.TRIAGEM, Perfil.ADMIN],
  },
  DISPONIVEL: {
    para: [StatusIdeia.EM_ANALISE, StatusIdeia.ARQUIVADA],
    perfis: [Perfil.GABINETE, Perfil.ADMIN],
  },
  EM_ANALISE: {
    para: [StatusIdeia.ADOTADA, StatusIdeia.DISPONIVEL, StatusIdeia.ARQUIVADA],
    perfis: [Perfil.GABINETE, Perfil.ADMIN],
  },
  ADOTADA: {
    para: [StatusIdeia.ARQUIVADA],
    perfis: [Perfil.ADMIN],
  },
  ARQUIVADA: {
    para: [],
    perfis: [],
  },
};

/** Situacoes visiveis na consulta publica (secao 6.1). */
export const STATUS_PUBLICOS: StatusIdeia[] = [
  StatusIdeia.DISPONIVEL,
  StatusIdeia.EM_ANALISE,
  StatusIdeia.ADOTADA,
];

export function ehStatusPublico(status: StatusIdeia): boolean {
  return STATUS_PUBLICOS.includes(status);
}

/** Resultado da validacao de uma transicao pretendida. */
export type ResultadoTransicao =
  | { ok: true }
  | { ok: false; httpStatus: 403 | 422; motivo: string };

/**
 * Valida uma transicao pretendida contra o grafo, o perfil e a regra de
 * justificativa obrigatoria no arquivamento. NAO toca no banco: quem grava
 * a Tramitacao e persiste o novo status e lib/tramitacao/tramitacao.ts.
 *
 * Regras (secao 6.2):
 *  - transicao fora do grafo  -> 422
 *  - perfil sem permissao     -> 403
 *  - ARQUIVADA sem justificativa -> 422
 */
export function validarTransicao(params: {
  de: StatusIdeia;
  para: StatusIdeia;
  perfil: Perfil;
  justificativa?: string | null;
}): ResultadoTransicao {
  const { de, para, perfil, justificativa } = params;
  const regra = TRANSICOES[de];

  if (!regra.para.includes(para)) {
    return {
      ok: false,
      httpStatus: 422,
      motivo: `Transição não permitida: ${de} -> ${para}`,
    };
  }

  if (!regra.perfis.includes(perfil)) {
    return {
      ok: false,
      httpStatus: 403,
      motivo: `Perfil ${perfil} não pode executar a transição ${de} -> ${para}`,
    };
  }

  if (para === StatusIdeia.ARQUIVADA && !justificativa?.trim()) {
    return {
      ok: false,
      httpStatus: 422,
      motivo: "Arquivamento exige justificativa",
    };
  }

  return { ok: true };
}
