import Link from "next/link";
import { urlCamara } from "@/lib/url";
import { INSTITUCIONAL } from "./institucional";

/** Rodape institucional, com os mesmos contatos do portal da Camara. */
export function Rodape() {
  return (
    <footer className="mt-8 bg-azul-cmr px-4 py-6 text-[13px] text-[#c6d8f3]">
      <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2">
        <address className="not-italic">
          <strong className="block text-white">{INSTITUCIONAL.nome}</strong>
          {INSTITUCIONAL.endereco}
          {INSTITUCIONAL.telefone && (
            <>
              <br />
              Telefone: {INSTITUCIONAL.telefone}
            </>
          )}
        </address>
        <nav aria-label="Rodapé">
          <ul className="space-y-1">
            <li>
              <a className="text-white" href={INSTITUCIONAL.faleConosco()}>
                Fale Conosco
              </a>
            </li>
            <li>
              <a className="text-white" href={INSTITUCIONAL.ouvidoria()}>
                Ouvidoria
              </a>
            </li>
            <li>
              <Link className="text-white" href="/acessibilidade">
                Acessibilidade
              </Link>
            </li>
            <li>
              <a className="text-white" href={urlCamara()}>
                Site da Câmara
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
