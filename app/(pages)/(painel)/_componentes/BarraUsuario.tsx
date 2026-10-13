import { LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { Sessao } from "@/lib/seguranca/sessao";
import { sair } from "../login/acoes";

/**
 * Faixa fina sob o cabecalho: lembra que a area e restrita, mostra quem esta
 * logado e oferece "Sair". Formulario puro: funciona sem JS. DONO: Pessoa B.
 */

export const ROTULO_PERFIL = {
  TRIAGEM: "Secretaria · Triagem",
  GABINETE: "Gabinete",
  ADMIN: "Administração",
} as const;

export function BarraUsuario({ sessao }: { sessao: Sessao }) {
  return (
    <div className="border-b border-border bg-marca-fundo print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 text-sm">
        <p className="flex items-center gap-2 text-secondary-foreground">
          <ShieldCheck aria-hidden="true" className="size-4 text-marca-medio" />
          <span>
            Área interna · <span className="font-semibold">{sessao.nome}</span>
            {sessao.gabinete && <> ({sessao.gabinete})</>} · {ROTULO_PERFIL[sessao.perfil]}
          </span>
        </p>
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold">
            Ver site público
          </Link>
          <form action={sair}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md border border-marca-medio/40 bg-card px-3 py-1 font-semibold text-marca hover:bg-secondary"
            >
              <LogOut aria-hidden="true" className="size-4" />
              Sair
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
