import type { PrismaClient } from "@/prisma/gen/client";

/**
 * Geracao de protocolo BIL-AAAA-NNNNNN, unico e sequencial por ano.
 * Especificacao tecnica, secao 3.2.
 *
 * DONO: Pessoa A.  CONSUMIDOR: Pessoa B (busca na Triagem por protocolo).
 *
 * >>> STUB <<< Esta e a assinatura acordada no dia 1. A implementacao real
 * (dona: Pessoa A, semana 2) usa a tabela ContadorProtocolo dentro de uma
 * transacao, incrementando de forma atomica para nao gerar numero repetido
 * sob concorrencia. Ate la, quem consome programa contra esta assinatura.
 */

const FORMATO = /^BIL-\d{4}-\d{6}$/;

/** Confere se uma string tem o formato de protocolo valido. */
export function ehProtocoloValido(valor: string): boolean {
  return FORMATO.test(valor.trim().toUpperCase());
}

/** Monta o protocolo a partir de ano e sequencial. */
export function formatarProtocolo(ano: number, sequencial: number): string {
  return `BIL-${ano}-${String(sequencial).padStart(6, "0")}`;
}

/**
 * Gera o proximo protocolo do ano corrente, de forma atomica.
 *
 * TODO(Pessoa A): implementar com ContadorProtocolo em transacao.
 * Deixado como stub para destravar os consumidores (ver CONTRIBUTING.md).
 */
export async function gerarProtocolo(
  _tx: PrismaClient,
  _ano: number = new Date().getFullYear(),
): Promise<string> {
  throw new Error("gerarProtocolo: stub - implementacao pendente (Pessoa A).");
}
