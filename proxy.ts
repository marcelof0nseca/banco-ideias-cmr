import { NextResponse, type NextRequest } from "next/server";
import { gerarNonce, politicaCsp } from "@/lib/seguranca/csp";
import { COOKIE_SESSAO, INATIVIDADE_MS, assinarSessao, verificarSessao } from "@/lib/seguranca/sessao";

/**
 * Proxy (convencao do Next 16, sucessora de middleware.ts). DONO: Pessoa B.
 *
 * 1. Toda pagina: gera um nonce e envia a Content Security Policy
 *    (lib/seguranca/csp.ts). O Next aplica o nonce nos scripts dele.
 * 2. Rotas do painel: sem sessao valida -> /login; com sessao -> renova o
 *    cookie (inatividade deslizante). A checagem fina de PERFIL fica nas
 *    paginas e rotas (defesa em profundidade, secao 8.2).
 *
 * Roda no Edge: usa so jose (sessao.ts) e a Web Crypto.
 */

const PREFIXOS_PROTEGIDOS = ["/triagem", "/gabinete", "/admin"];

function ehProtegida(pathname: string): boolean {
  return PREFIXOS_PROTEGIDOS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- painel: exige sessao ---------------------------------------------
  let sessaoRenovada: string | null = null;
  if (ehProtegida(pathname)) {
    const sessao = await verificarSessao(req.cookies.get(COOKIE_SESSAO)?.value);
    if (!sessao) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?destino=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    sessaoRenovada = await assinarSessao(sessao);
  }

  // --- CSP com nonce ----------------------------------------------------
  const nonce = gerarNonce();
  const csp = politicaCsp(nonce, { desenvolvimento: process.env.NODE_ENV === "development" });
  const cabecalhos = new Headers(req.headers);
  cabecalhos.set("x-nonce", nonce);
  cabecalhos.set("Content-Security-Policy", csp);

  const resposta = NextResponse.next({ request: { headers: cabecalhos } });
  resposta.headers.set("Content-Security-Policy", csp);

  if (sessaoRenovada) {
    resposta.cookies.set(COOKIE_SESSAO, sessaoRenovada, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: process.env.NEXT_PUBLIC_BASE_PATH || "/",
      maxAge: Math.floor(INATIVIDADE_MS / 1000),
    });
  }
  return resposta;
}

export const config = {
  matcher: [
    {
      // Paginas; fora: API, arquivos estaticos, imagens e fontes.
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|.*\\.(?:png|jpg|svg|woff2)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
