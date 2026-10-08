import Link from "next/link";
import { urlCamara } from "@/lib/url";
import { INSTITUCIONAL } from "./institucional";

/** Rodape institucional, com os mesmos contatos do portal da Camara. */
export function Rodape() {
  const links = [
    { rotulo: "Fale Conosco", href: INSTITUCIONAL.faleConosco(), externo: true },
    { rotulo: "Ouvidoria", href: INSTITUCIONAL.ouvidoria(), externo: true },
    { rotulo: "Acessibilidade", href: "/acessibilidade", externo: false },
    { rotulo: "Site da Câmara", href: urlCamara(), externo: true },
  ];
  return (
    <footer data-fundo="escuro" className="mt-10 border-t-4 border-dourado bg-marca-noite px-4 py-8 text-sm text-white/80 print:hidden">
      <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2">
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
          <ul className="flex flex-col gap-1.5">
            {links.map((l) => (
              <li key={l.rotulo}>
                {l.externo ? (
                  <a className="text-white underline" href={l.href}>
                    {l.rotulo}
                  </a>
                ) : (
                  <Link className="text-white underline" href={l.href}>
                    {l.rotulo}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
