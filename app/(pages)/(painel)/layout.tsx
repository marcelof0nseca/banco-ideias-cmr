import { Cabecalho } from "@/components/layout/Cabecalho";
import { PularParaConteudo } from "@/components/layout/PularParaConteudo";
import { Rodape } from "@/components/layout/Rodape";
import { sessaoAtual } from "@/lib/seguranca/auth";
import { BarraUsuario } from "./_componentes/BarraUsuario";
import { AbaAcessoInterno, NavPainel } from "./_componentes/NavPainel";

/**
 * Moldura do painel interno: o MESMO cabecalho e rodape da area publica
 * (identidade da Camara), com o menu do perfil no lugar do menu publico e a
 * faixa do usuario logado. DONO: Pessoa B.
 */
export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const sessao = await sessaoAtual();
  return (
    <div className="flex min-h-dvh flex-col">
      <PularParaConteudo />
      <Cabecalho navegacao={sessao ? <NavPainel perfil={sessao.perfil} /> : <AbaAcessoInterno />} />
      {sessao && <BarraUsuario sessao={sessao} />}
      <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-14">
        {children}
      </main>
      <Rodape />
    </div>
  );
}
