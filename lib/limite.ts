/**
 * Limite de taxa por IP e por documento.
 * Especificacao tecnica, secao 8.5.
 *
 * DONO: Pessoa B.  CONSUMIDOR: Pessoa A (rotas publicas de POST).
 *
 * >>> STUB <<< Assinatura acordada no dia 1. A implementacao real (Pessoa B,
 * semana 2) persiste contadores com janela deslizante. Ate la, retorna
 * sempre "permitido" para nao bloquear o desenvolvimento do fluxo publico.
 *
 * Limites (parametrizaveis por ambiente):
 *   - cadastro: LIMITE_CADASTRO_POR_IP_HORA por IP/hora
 *   - ideias:   LIMITE_IDEIAS_POR_DOCUMENTO_DIA por documento/dia
 *   - acompanhar: tentativas limitadas por IP (anti varredura de protocolos)
 */

export type AcaoLimitada = "cadastro" | "apoio" | "acompanhar";

export interface ResultadoLimite {
  permitido: boolean;
  /** Segundos ate liberar, quando bloqueado. */
  tentarEmSegundos?: number;
}

export interface ChaveLimite {
  acao: AcaoLimitada;
  /** Hash do IP (nunca o IP em claro). */
  ipHash?: string;
  /** Hash do documento (nunca o CPF em claro). */
  documentoHash?: string;
}

/**
 * Verifica e consome uma unidade do limite para a chave informada.
 *
 * TODO(Pessoa B): implementar contadores reais com janela deslizante.
 */
export async function verificarLimite(
  _chave: ChaveLimite,
): Promise<ResultadoLimite> {
  return { permitido: true };
}
