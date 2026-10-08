/**
 * Montagem de URLs e caminhos, sensivel ao basePath.
 * Especificacao tecnica, secao 12 (integracao com o portal).
 *
 * DONO: Pessoa A.  CONSUMIDORES: A (links) e B (cookies, Nginx).
 *
 * O mesmo build atende ao subdominio e a rota atras do proxy, trocando so
 * NEXT_PUBLIC_BASE_PATH. Por isso NENHUM link/recurso usa caminho fixo "/":
 * tudo passa por next/link, next/image ou por estas funcoes.
 */

/** Prefixo de caminho do deploy ("" no subdominio). */
export function basePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH ?? "";
}

/** Caminho interno ja com o basePath. caminho("/consulta") -> "<base>/consulta". */
export function caminho(rota: string): string {
  const r = rota.startsWith("/") ? rota : `/${rota}`;
  return `${basePath()}${r}`;
}

/** URL absoluta publica, para canonical, sitemap e Open Graph. */
export function urlAbsoluta(rota: string): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  return `${site}${caminho(rota)}`;
}

/** URL do detalhe publico de uma ideia. */
export function urlIdeia(protocolo: string): string {
  return caminho(`/consulta/${protocolo}`);
}

/** URL absoluta do detalhe de uma ideia (link compartilhavel). */
export function urlIdeiaAbsoluta(protocolo: string): string {
  return urlAbsoluta(`/consulta/${protocolo}`);
}

/** Link de volta ao portal institucional da Camara. */
export function urlCamara(): string {
  return process.env.NEXT_PUBLIC_URL_CAMARA ?? "https://www.recife.pe.leg.br";
}
