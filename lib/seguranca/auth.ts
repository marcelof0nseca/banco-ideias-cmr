import { cookies } from "next/headers";
import type { Perfil } from "@/prisma/gen/client";
import { prisma } from "../sistema/prisma";
import { verificarSenha } from "./senha";
import {
  ABSOLUTO_MS,
  COOKIE_SESSAO,
  INATIVIDADE_MS,
  type Sessao,
  assinarSessao,
  verificarSessao,
} from "./sessao";

/**
 * Autenticacao de usuarios internos (Triagem, Gabinete, Admin).
 * Especificacao tecnica, secao 8.1 e 8.2. DONO: Pessoa B.
 *
 * Login proprio e minimo (credenciais + argon2id + sessao em cookie assinado),
 * em vez do Auth.js: controle total dos flags de cookie e da expiracao que a
 * spec exige, sem depender de uma biblioteca em beta. A camada esta isolada
 * para receber um provedor OIDC/LDAP na v2 sem reescrever as telas.
 *
 * Este arquivo roda no Node (argon2 e Prisma sao nativos); o middleware usa
 * apenas ./sessao.ts, que roda no Edge.
 */

// Reexporta o hashing (de ./senha) para quem ja importa de auth.
export { hashSenha, senhaForte, SENHA_MINIMA, verificarSenha } from "./senha";

// ---------------------------------------------------------------------------
// Bloqueio progressivo (secao 8.1)
// ---------------------------------------------------------------------------

const TENTATIVAS_ATE_BLOQUEIO = 5;

/** A partir da 5a falha, bloqueia por 5 min, dobrando a cada falha (teto 60). */
function minutosBloqueio(tentativas: number): number {
  const excesso = tentativas - TENTATIVAS_ATE_BLOQUEIO;
  if (excesso < 0) return 0;
  return Math.min(60, 5 * 2 ** excesso);
}

// ---------------------------------------------------------------------------
// Autenticacao
// ---------------------------------------------------------------------------

export type ResultadoLogin =
  | { ok: true; sessao: Sessao }
  | { ok: false; motivo: "credenciais" | "bloqueado"; tentarEmMin?: number };

/** Mensagem unica e generica: nao revela se o e-mail existe (secao 8.1). */
export const MENSAGEM_LOGIN_INVALIDO = "E-mail ou senha incorretos.";

export async function autenticar(email: string, senha: string): Promise<ResultadoLogin> {
  const usuario = await prisma.usuario.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  // Mesmo sem usuario, gastamos tempo verificando um hash fixo, para nao
  // vazar por tempo de resposta se o e-mail existe.
  if (!usuario || !usuario.ativo) {
    await verificarSenha(
      "$argon2id$v=19$m=19456,t=2,p=1$c2FsZ2Fkb2RlZmF1bHQ$0000000000000000000000000000000000000000000",
      senha,
    );
    return { ok: false, motivo: "credenciais" };
  }

  const agora = new Date();
  if (usuario.bloqueadoAte && usuario.bloqueadoAte > agora) {
    const tentarEmMin = Math.ceil((usuario.bloqueadoAte.getTime() - agora.getTime()) / 60000);
    return { ok: false, motivo: "bloqueado", tentarEmMin };
  }

  const confere = await verificarSenha(usuario.senhaHash, senha);
  if (!confere) {
    const tentativas = usuario.tentativasFalhas + 1;
    const min = minutosBloqueio(tentativas);
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        tentativasFalhas: tentativas,
        bloqueadoAte: min > 0 ? new Date(agora.getTime() + min * 60000) : null,
      },
    });
    return { ok: false, motivo: "credenciais" };
  }

  // Sucesso: zera contadores e registra o acesso.
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { tentativasFalhas: 0, bloqueadoAte: null, ultimoLoginEm: agora },
  });

  return {
    ok: true,
    sessao: {
      usuarioId: usuario.id,
      perfil: usuario.perfil,
      nome: usuario.nome,
      gabinete: usuario.gabinete,
      absoluto: agora.getTime() + ABSOLUTO_MS,
    },
  };
}

// ---------------------------------------------------------------------------
// Cookie de sessao (contexto de Server Action / Route Handler)
// ---------------------------------------------------------------------------

/** Path do cookie: casa com o basePath para nao colidir com o Plone (secao 12). */
function pathCookie(): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH;
  return base && base.length > 0 ? base : "/";
}

export async function definirCookieSessao(sessao: Sessao): Promise<void> {
  const token = await assinarSessao(sessao);
  const jar = await cookies();
  jar.set(COOKIE_SESSAO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: pathCookie(),
    maxAge: Math.floor(INATIVIDADE_MS / 1000),
  });
}

export async function limparCookieSessao(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_SESSAO, "", { path: pathCookie(), maxAge: 0 });
}

/** Le a sessao do cookie (Server Component / Action). Nao renova o cookie. */
export async function sessaoAtual(): Promise<Sessao | null> {
  const jar = await cookies();
  return verificarSessao(jar.get(COOKIE_SESSAO)?.value);
}

// ---------------------------------------------------------------------------
// Autorizacao em Route Handlers (secao 8.2, camada da propria rota)
// ---------------------------------------------------------------------------

export type ResultadoPerfil =
  | { ok: true; sessao: Sessao }
  | { ok: false; status: 401 | 403 };

/**
 * Exige sessao valida e um dos perfis. Chamar DENTRO de cada rota de mutacao,
 * alem da checagem do middleware: uma requisicao forjada direto a API encontra
 * a mesma barreira que a interface.
 */
export async function exigirPerfil(perfis: Perfil[]): Promise<ResultadoPerfil> {
  const sessao = await sessaoAtual();
  if (!sessao) return { ok: false, status: 401 };
  if (!perfis.includes(sessao.perfil)) return { ok: false, status: 403 };
  return { ok: true, sessao };
}
