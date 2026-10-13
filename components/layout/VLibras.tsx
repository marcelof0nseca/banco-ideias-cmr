"use client";

import Script from "next/script";

/**
 * VLibras - tradutor de Portugues para Libras (Lingua Brasileira de Sinais).
 * Widget oficial do Governo Federal, presente no portal da Camara e exigido
 * pela acessibilidade (Lei 13.146/2015, eMAG). DONO: Pessoa A (area de
 * acessibilidade e identidade visual).
 *
 * E o UNICO recurso externo que o sistema carrega (ver docs/implantacao/
 * integracao-portal.md). A CSP (lib/seguranca/csp.ts) libera vlibras.gov.br
 * e o nonce chega por prop, vindo do layout raiz.
 *
 * Os atributos `vw`, `vw-access-button` e `vw-plugin-wrapper` sao os que o
 * plugin procura no DOM; vao por spread porque nao sao atributos conhecidos
 * de JSX.
 */

interface JanelaComVLibras {
  VLibras?: { Widget: new (opcoesOuUrl: string) => void };
}

export function VLibras({ nonce }: { nonce?: string }) {
  return (
    <>
      <div {...{ vw: "true" }} className="enabled">
        <div {...{ "vw-access-button": "true" }} className="active" />
        <div {...{ "vw-plugin-wrapper": "true" }}>
          <div className="vw-plugin-top-wrapper" />
        </div>
      </div>
      <Script
        src="https://vlibras.gov.br/app/vlibras-plugin.js"
        strategy="afterInteractive"
        nonce={nonce}
        onLoad={() => {
          const janela = window as unknown as JanelaComVLibras;
          if (janela.VLibras) {
            new janela.VLibras.Widget("https://vlibras.gov.br/app");
          }
        }}
      />
    </>
  );
}
