import { SignJWT, jwtVerify } from "jose";
import type { Perfil } from "@/prisma/gen/client";

/**
 * Token de sessao assinado (JWT HS256 via jose).
 * Especificacao tecnica, secao 8.1. DONO: Pessoa B.
 *
 * Este arquivo usa SO a `jose`, sem Prisma, argon2 ou next/headers, para
 * poder rodar no Edge (o middleware precisa verificar a sessao la).
 *
 * Janela de inatividade (exp do JWT): 30 min, deslizante - o middleware
 * reemite o cookie a cada requisicao valida.
 * Prazo absoluto (claim `abs`): 8 h desde o login, nao desliza.
 */

export const INATIVIDADE_MS = 30 * 60 * 1000;
export const ABSOLUTO_MS = 8 * 60 * 60 * 1000;
export const COOKIE_SESSAO = "bil_sessao";

export interface Sessao {
  usuarioId: string;
  perfil: Perfil;
  nome: string;
  gabinete: string | null;
  /** Instante-limite absoluto da sessao (epoch ms). */
  absoluto: number;
}

function segredo(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET ausente ou curto. Defina no .env (>= 32 bytes).");
  }
  return new TextEncoder().encode(s);
}

/**
 * Assina o token. Em um login novo, `absoluto` vem indefinido e marca
 * agora + 8 h; nas renovacoes deslizantes, preserva o valor original.
 */
export async function assinarSessao(
  dados: Omit<Sessao, "absoluto"> & { absoluto?: number },
  agora: number = Date.now(),
): Promise<string> {
  const absoluto = dados.absoluto ?? agora + ABSOLUTO_MS;
  return new SignJWT({
    perfil: dados.perfil,
    nome: dados.nome,
    gabinete: dados.gabinete,
    abs: absoluto,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(dados.usuarioId)
    .setIssuedAt(Math.floor(agora / 1000))
    .setExpirationTime(Math.floor((agora + INATIVIDADE_MS) / 1000))
    .sign(segredo());
}

/**
 * Verifica assinatura, janela de inatividade (exp) e prazo absoluto.
 * Retorna a sessao ou null. Seguro para o Edge.
 */
export async function verificarSessao(
  token: string | undefined | null,
  agora: number = Date.now(),
): Promise<Sessao | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, segredo(), {
      algorithms: ["HS256"],
      // Relogio explicito: a verificacao de inatividade (exp) fica deterministica.
      currentDate: new Date(agora),
    });
    const absoluto = typeof payload.abs === "number" ? payload.abs : 0;
    if (!payload.sub || agora > absoluto) return null;
    return {
      usuarioId: payload.sub,
      perfil: payload.perfil as Perfil,
      nome: typeof payload.nome === "string" ? payload.nome : "",
      gabinete: typeof payload.gabinete === "string" ? payload.gabinete : null,
      absoluto,
    };
  } catch {
    // assinatura invalida ou exp vencido (inatividade)
    return null;
  }
}
