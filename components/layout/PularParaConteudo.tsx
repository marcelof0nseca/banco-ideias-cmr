/**
 * Atalho "Ir ao conteudo" (eMAG 1.5). Primeiro elemento focavel da pagina;
 * invisivel ate receber foco. O alvo e o <main id="conteudo">.
 *
 * Link de ancora puro (#conteudo): nao depende do basePath.
 */
export function PularParaConteudo() {
  return (
    <a
      href="#conteudo"
      className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-azul-cmr"
    >
      Ir ao conteúdo
    </a>
  );
}
