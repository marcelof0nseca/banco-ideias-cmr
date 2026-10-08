import type { Prisma } from "@/prisma/gen/client";

/**
 * Geracao de protocolo BIL-AAAA-NNNNNN, unico e sequencial por ano.
 * Especificacao tecnica, secao 3.2.
 *
 * DONO: Pessoa A.  CONSUMIDOR: Pessoa B (busca na Triagem por protocolo).
 *
 * Se a Secretaria confirmar um protocolo institucional (SEI) ja em uso
 * (risco da secao 14), so `gerarProtocolo` precisa mudar.
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
 * Gera o proximo protocolo do ano, de forma atomica.
 *
 * Deve ser chamada DENTRO da transacao do cadastro: o UPSERT trava a linha
 * do ano ate o commit, entao duas gravacoes simultaneas nunca recebem o mesmo
 * numero; se a transacao falhar, o incremento e desfeito e nao ha lacuna.
 */
export async function gerarProtocolo(
  tx: Prisma.TransactionClient,
  ano: number = new Date().getFullYear(),
): Promise<string> {
  const linhas = await tx.$queryRaw<{ ultimo: number }[]>`
    INSERT INTO contador_protocolo (ano, ultimo)
    VALUES (${ano}, 1)
    ON CONFLICT (ano) DO UPDATE SET ultimo = contador_protocolo.ultimo + 1
    RETURNING ultimo
  `;
  const ultimo = linhas[0]?.ultimo;
  if (ultimo === undefined) {
    throw new Error("gerarProtocolo: contador nao retornou valor.");
  }
  return formatarProtocolo(ano, Number(ultimo));
}
