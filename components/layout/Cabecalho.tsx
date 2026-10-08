import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import logoCmr from "@/public/logo-cmr.png";
import { urlCamara } from "@/lib/sistema/url";
import { NavPublica } from "./NavPublica";

/**
 * Cabecalho institucional (especificacao, secao 12 - Parte A).
 *
 *   1. Faixa branca com o logo oficial da Camara (versao horizontal, cores
 *      originais: o texto azul do logo nao pode ir sobre fundo escuro) e o
 *      link fixo "Voltar ao site da Camara". Fio dourado do brasao embaixo.
 *   2. Faixa azul (cor do portal) com o nome do sistema e o menu principal.
 *
 * O logo vem por import estatico: o next/image aplica o basePath sozinho.
 *
 * DONO: Pessoa A.  CONSUMIDOR: Pessoa B (painel pode reaproveitar passando
 * `navegacao` propria).
 */
export function Cabecalho({ navegacao = <NavPublica /> }: { navegacao?: React.ReactNode }) {
  return (
    <header className="print:hidden">
      <div className="border-b-4 border-dourado bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
          <Image
            src={logoCmr}
            alt="Câmara Municipal do Recife — Casa de José Mariano"
            priority
            className="h-12 w-auto sm:h-16"
          />
          <a
            href={urlCamara()}
            className="group inline-flex items-center gap-2 rounded-full border-2 border-faixa bg-white py-2 pr-4 pl-2 text-sm font-semibold text-marca no-underline shadow-sm transition-colors hover:bg-faixa hover:text-white"
          >
            <span className="grid size-7 place-items-center rounded-full bg-faixa text-white transition-colors group-hover:bg-white group-hover:text-faixa">
              <ArrowLeft
                aria-hidden="true"
                className="size-4 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none"
              />
            </span>
            Voltar ao site da Câmara
          </a>
        </div>
      </div>
      <div data-fundo="escuro" className="bg-faixa text-white">
        <div className="mx-auto max-w-6xl px-4 pt-5">
          <Link href="/" className="text-white no-underline">
            <span className="block text-2xl leading-tight font-bold">Banco de Ideias Legislativas</span>
          </Link>
          <p className="mt-1 mb-4 text-sm text-white">
            Participação Popular · Resolução nº 2.690/2018
          </p>
          {navegacao}
        </div>
      </div>
    </header>
  );
}
