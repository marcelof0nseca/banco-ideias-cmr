import { caminho, urlCamara } from "@/lib/url";

/**
 * Pagina de apresentacao do programa (dono: Pessoa A, semana 1).
 * Placeholder - conteudo real na Fase 2.
 */
export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-azul-medio">
        Camara Municipal do Recife
      </p>
      <h1 className="mt-1 text-3xl font-bold text-azul-cmr">
        Banco de Ideias Legislativas
      </h1>
      <p className="mt-4 text-neutral-700">
        Participacao popular - Resolucao no 2.690/2018. Em construcao.
      </p>
      <nav className="mt-8 flex flex-wrap gap-3">
        <a
          className="rounded-md bg-azul-acao px-4 py-2 font-semibold text-white"
          href={caminho("/nova-ideia")}
        >
          Enviar uma ideia
        </a>
        <a
          className="rounded-md bg-neutral-200 px-4 py-2 font-semibold text-azul-cmr"
          href={caminho("/consulta")}
        >
          Consultar ideias
        </a>
        <a
          className="px-4 py-2 font-semibold text-azul-acao underline"
          href={urlCamara()}
        >
          Voltar ao site da Camara
        </a>
      </nav>
    </main>
  );
}
