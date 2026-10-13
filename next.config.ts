import type { NextConfig } from "next";

/**
 * Integracao com o portal da Camara (especificacao, secao 12).
 *
 * O mesmo codigo atende aos dois cenarios possiveis, trocando apenas
 * a variavel NEXT_PUBLIC_BASE_PATH (que entra no BUILD - trocar de cenario
 * exige gerar a imagem de novo, sem mudar nenhuma linha de codigo):
 *
 *   ""                                      -> subdominio bancodeideias.recife.pe.leg.br
 *   "/participacao-popular/banco-de-ideias" -> rota atras do proxy do portal
 *
 * Por isso NENHUM link ou recurso pode usar caminho fixo iniciado em "/":
 * use next/link, next/image ou lib/sistema/url.ts.
 *
 * A Content Security Policy fica no proxy.ts (precisa de nonce por
 * requisicao). Aqui ficam os cabecalhos fixos (secao 8.4).
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const producao = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  basePath,
  // Imagem Docker enxuta: so o servidor e as dependencias usadas (Dockerfile).
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Iframe fica fora por decisao de projeto (secao 12.1).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // O sistema nao usa camera, microfone nem localizacao.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          // HSTS so em producao (em localhost http quebraria o navegador).
          ...(producao ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
        ],
      },
    ];
  },
};

export default nextConfig;
