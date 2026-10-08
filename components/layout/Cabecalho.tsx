import { ArrowLeft, Landmark } from "lucide-react";
import Link from "next/link";
import { urlCamara } from "@/lib/url";
import { NavPublica } from "./NavPublica";

/**
 * Cabecalho institucional (especificacao, secao 12 - Parte A): faixa da
 * Camara, link fixo "Voltar ao site da Camara" e menu principal.
 *
 * DONO: Pessoa A.  CONSUMIDOR: Pessoa B (painel pode reaproveitar a faixa
 * passando `navegacao` propria).
 */
export function Cabecalho({ navegacao = <NavPublica /> }: { navegacao?: React.ReactNode }) {
  return (
    <header data-fundo="escuro" className="bg-azul-cmr text-white print:hidden">
      <div className="bg-azul-noite">
        <div className="mx-auto flex max-w-6xl justify-end px-4 py-1.5">
          <a
            href={urlCamara()}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white underline"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Voltar ao site da Câmara
          </a>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 pt-5">
        <Link href="/" className="inline-flex items-center gap-3 text-white no-underline">
          <span className="grid size-11 place-items-center rounded-lg bg-white/10" aria-hidden="true">
            <Landmark className="size-6" />
          </span>
          <span>
            <span className="block text-xs font-semibold tracking-[0.13em] text-[#a9c4ec] uppercase">
              Câmara Municipal do Recife
            </span>
            <span className="block text-xl leading-tight font-bold">Banco de Ideias Legislativas</span>
          </span>
        </Link>
        <p className="mt-1 mb-4 text-[13px] text-[#c6d8f3]">
          Participação Popular · Resolução nº 2.690/2018
        </p>
        {navegacao}
      </div>
    </header>
  );
}
