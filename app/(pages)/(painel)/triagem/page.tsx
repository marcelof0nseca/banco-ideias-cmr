import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { sessaoAtual } from "@/lib/seguranca/auth";
import { sair } from "../login/acoes";

export const metadata: Metadata = { title: "Triagem" };

/**
 * Fila da Triagem (dono: Pessoa B, Fase 3).
 *
 * Esta versao estabelece a autenticacao: exige sessao e perfil (TRIAGEM ou
 * ADMIN) e mostra quem esta logado. A fila com assumir/aprovar/arquivar vem
 * no proximo passo, junto com a rota /tramitar.
 */
export default async function TriagemPage() {
  const sessao = await sessaoAtual();
  // O middleware ja barra quem nao tem sessao; esta checagem cobre o PERFIL
  // (defesa em profundidade, secao 8.2).
  if (!sessao) redirect("/login?destino=/triagem");

  const temAcesso = sessao.perfil === "TRIAGEM" || sessao.perfil === "ADMIN";

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-marca-medio">
            Painel da Secretaria
          </p>
          <h1 className="mt-1 text-2xl font-bold text-marca">Triagem de ideias</h1>
        </div>
        <form action={sair}>
          <div className="text-right text-sm text-muted-foreground">
            <span className="block">
              {sessao.nome} · {sessao.perfil}
            </span>
            <Botao type="submit" variante="contorno" pequeno className="mt-1">
              Sair
            </Botao>
          </div>
        </form>
      </div>

      {temAcesso ? (
        <Alerta tipo="info" titulo="Autenticação pronta" className="mt-8">
          Login, sessão e proteção de perfil funcionando. A fila da triagem
          (assumir, aprovar, arquivar) entra no próximo passo, com a rota
          <code className="mx-1">/tramitar</code>.
        </Alerta>
      ) : (
        <Alerta tipo="atencao" titulo="Sem permissão para esta área" className="mt-8">
          Seu perfil ({sessao.perfil}) não tem acesso à triagem. Esta área é
          da Secretaria (perfil TRIAGEM) e da administração.
        </Alerta>
      )}
    </main>
  );
}
