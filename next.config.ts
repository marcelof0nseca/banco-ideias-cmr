import type { NextConfig } from "next";

/**
 * Integracao com o portal da Camara (especificacao, secao 12).
 *
 * O mesmo build atende aos dois cenarios possiveis, trocando apenas
 * a variavel de ambiente NEXT_PUBLIC_BASE_PATH:
 *
 *   ""                                      -> subdominio bancodeideias.recife.pe.leg.br
 *   "/participacao-popular/banco-de-ideias" -> rota atras do proxy do portal
 *
 * Nenhuma linha de codigo muda entre um cenario e outro. Por isso NENHUM
 * link ou recurso pode usar caminho fixo iniciado em "/": use next/link,
 * next/image ou lib/sistema/url.ts.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  basePath,
  // Iframe fica fora por decisao de projeto (secao 12.1): quebra acessibilidade,
  // URL compartilhavel e SEO. O cabecalho abaixo torna a decisao tecnica.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
