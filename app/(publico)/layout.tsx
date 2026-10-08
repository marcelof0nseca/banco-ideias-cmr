import { Cabecalho } from "@/components/layout/Cabecalho";
import { PularParaConteudo } from "@/components/layout/PularParaConteudo";
import { Rodape } from "@/components/layout/Rodape";

/** Moldura das telas publicas: atalho, cabecalho, conteudo e rodape. */
export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PularParaConteudo />
      <Cabecalho />
      <main id="conteudo" tabIndex={-1} className="mx-auto max-w-6xl px-4 pb-14 pt-6">
        {children}
      </main>
      <Rodape />
    </>
  );
}
