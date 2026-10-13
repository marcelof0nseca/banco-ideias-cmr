/**
 * Content Security Policy (especificacao, secao 8.4 / A05). DONO: Pessoa B.
 *
 * Restritiva, com nonce por requisicao (sem 'unsafe-inline' em script): o
 * Next aplica o nonce sozinho nos scripts e estilos que ele gera. O proxy
 * (proxy.ts) gera o nonce e envia o cabecalho.
 *
 * Unica origem externa liberada: o VLibras (tradutor de Libras do Governo
 * Federal, obrigatorio por acessibilidade). Verificado no navegador: o
 * plugin redireciona os proprios arquivos para o repositorio oficial
 * spbgovbr-vlibras servido pelo jsDelivr - por isso liberamos SO esse
 * caminho do CDN, nao o CDN inteiro. O avatar e WebGL/WebAssembly, dai
 * 'wasm-unsafe-eval' e workers em blob:.
 */

const VLIBRAS = "https://vlibras.gov.br https://*.vlibras.gov.br https://cdn.jsdelivr.net/gh/spbgovbr-vlibras/";

export function gerarNonce(): string {
  return btoa(crypto.randomUUID());
}

export function politicaCsp(nonce: string, opcoes: { desenvolvimento: boolean }): string {
  const { desenvolvimento } = opcoes;
  const diretivas: Record<string, string> = {
    "default-src": "'self'",
    // 'unsafe-eval' so em desenvolvimento (o React usa eval para depuracao).
    "script-src": `'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval' ${VLIBRAS}${desenvolvimento ? " 'unsafe-eval'" : ""}`,
    // O VLibras injeta estilos por script; o restante do sistema nao usa
    // estilo inline (proibido no guia de front, docs/frontend.md 4.3).
    "style-src": `'self' 'unsafe-inline' ${VLIBRAS}`,
    "img-src": `'self' data: blob: ${VLIBRAS}`,
    "font-src": `'self' data: ${VLIBRAS}`,
    "connect-src": `'self' ${VLIBRAS}${desenvolvimento ? " ws: wss:" : ""}`,
    "media-src": `'self' blob: ${VLIBRAS}`,
    "worker-src": "'self' blob:",
    "object-src": "'none'",
    "base-uri": "'self'",
    "form-action": "'self'",
    "frame-ancestors": "'none'",
  };
  const politica = Object.entries(diretivas).map(([k, v]) => `${k} ${v}`);
  // Em producao (HTTPS), qualquer recurso http vira https.
  if (!desenvolvimento) politica.push("upgrade-insecure-requests");
  return politica.join("; ");
}
