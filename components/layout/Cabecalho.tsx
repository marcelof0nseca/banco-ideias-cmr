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
    <header className="bg-azul-cmr text-white print:hidden">
      <div className="border-b border-azul-escuro bg-[#10264f]">
        <div className="mx-auto flex max-w-6xl justify-end px-4 py-1.5">
          <a href={urlCamara()} className="text-sm font-semibold text-white underline">
            <span aria-hidden="true">← </span>Voltar ao site da Câmara
          </a>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <Link href="/" className="inline-block text-white no-underline">
          <span className="block text-xs font-semibold uppercase tracking-[0.13em] text-[#a9c4ec]">
            Câmara Municipal do Recife
          </span>
          <span className="block text-xl font-bold">Banco de Ideias Legislativas</span>
        </Link>
        <p className="mb-3.5 mt-0.5 text-[13px] text-[#c6d8f3]">
          Participação Popular · Resolução nº 2.690/2018
        </p>
        {navegacao}
      </div>
    </header>
  );
}
