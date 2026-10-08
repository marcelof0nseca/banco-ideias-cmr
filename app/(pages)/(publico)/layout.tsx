import { Cabecalho } from "@/components/layout/Cabecalho";
import { PularParaConteudo } from "@/components/layout/PularParaConteudo";
import { Rodape } from "@/components/layout/Rodape";

/** Moldura das telas publicas: atalho, cabecalho, conteudo e rodape. */
export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PularParaConteudo />
      <Cabecalho />
      <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pb-14 pt-6">
        {children}
      </main>
      <Rodape />
    </div>
  );
}
