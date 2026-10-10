import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_SESSAO,
  INATIVIDADE_MS,
  assinarSessao,
  verificarSessao,
} from "@/lib/seguranca/sessao";

/**
 * Protege as rotas do painel interno (especificacao, secao 8.2, 1a camada).
 * Convencao "proxy" do Next 16 (sucessora de middleware.ts).
 * Roda no Edge: usa so lib/seguranca/sessao.ts (jose), sem Prisma nem argon2.
 *
 * - Sem sessao valida numa rota do painel -> redireciona para /login.
 * - Com sessao valida -> renova o cookie (janela de inatividade deslizante).
 *
 * A checagem fina de PERFIL fica nas proprias paginas/rotas (sessaoAtual /
 * exigirPerfil): defesa em profundidade, nao so no middleware.
 */

const PREFIXOS_PROTEGIDOS = ["/triagem", "/gabinete", "/admin"];

function ehProtegida(pathname: string): boolean {
  return PREFIXOS_PROTEGIDOS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!ehProtegida(pathname)) return NextResponse.next();

  const token = req.cookies.get(COOKIE_SESSAO)?.value;
  const sessao = await verificarSessao(token);

  if (!sessao) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?destino=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // Sessao valida: renova o cookie (desliza a inatividade, preserva o absoluto).
  const resposta = NextResponse.next();
  const novo = await assinarSessao(sessao);
  resposta.cookies.set(COOKIE_SESSAO, novo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: process.env.NEXT_PUBLIC_BASE_PATH || "/",
    maxAge: Math.floor(INATIVIDADE_MS / 1000),
  });
  return resposta;
}

export const config = {
  matcher: ["/triagem/:path*", "/gabinete/:path*", "/admin/:path*"],
};
