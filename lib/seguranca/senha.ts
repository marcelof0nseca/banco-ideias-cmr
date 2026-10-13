import { hash, verify } from "@node-rs/argon2";

/**
 * Hashing de senha com argon2id. Especificacao tecnica, secao 8.1.
 * DONO: Pessoa B.
 *
 * Isolado de auth.ts (que importa next/headers) para poder ser usado tambem
 * fora do Next - por exemplo no prisma/seed.ts.
 *
 * Parametros minimos recomendados pela OWASP: m=19 MiB, t=2, p=1.
 */
const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const SENHA_MINIMA = 12;

export function senhaForte(senha: string): boolean {
  return typeof senha === "string" && senha.length >= SENHA_MINIMA;
}

export function hashSenha(senha: string): Promise<string> {
  return hash(senha, ARGON);
}

export function verificarSenha(hashArmazenado: string, senha: string): Promise<boolean> {
  return verify(hashArmazenado, senha, ARGON).catch(() => false);
}
