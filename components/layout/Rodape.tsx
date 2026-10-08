import { INSTITUCIONAL, type RedeSocial } from "./institucional";

/**
 * Rodape institucional, no mesmo formato do portal da Camara: Midias
 * Sociais, Endereco e Horario. Faixa na cor do portal (token `faixa`).
 */
export function Rodape() {
  const { endereco, horario, listaTelefones } = INSTITUCIONAL;
  return (
    <footer data-fundo="escuro" className="mt-10 bg-faixa px-4 py-10 text-sm text-white print:hidden">
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3">
        <section aria-labelledby="rodape-redes">
          <TituloRodape id="rodape-redes">Mídias Sociais</TituloRodape>
          <ul className="flex gap-2">
            {INSTITUCIONAL.redes.map((r) => (
              <li key={r.rede}>
                <a
                  href={r.href}
                  aria-label={`${r.rotulo} da Câmara`}
                  className="flex size-9 items-center justify-center rounded-full bg-white text-foreground hover:bg-marca-fundo"
                >
                  <IconeRede rede={r.rede} />
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="rodape-endereco">
          <TituloRodape id="rodape-endereco">Endereço</TituloRodape>
          <address className="not-italic">
            {endereco.map((linha) => (
              <span key={linha} className="block">
                {linha}
              </span>
            ))}
            <span className="block">
              Telefones: {INSTITUCIONAL.telefone} / Fax {INSTITUCIONAL.fax}
            </span>
            <span className="block">
              Lista de Telefones:{" "}
              <a className="text-white underline" href={listaTelefones.gabinetes}>
                Gabinetes
              </a>{" "}
              /{" "}
              <a className="text-white underline" href={listaTelefones.administracao}>
                Administração
              </a>
            </span>
          </address>
        </section>

        <section aria-labelledby="rodape-horario">
          <TituloRodape id="rodape-horario">Horário</TituloRodape>
          {horario.map((linha) => (
            <span key={linha} className="block">
              {linha}
            </span>
          ))}
        </section>
      </div>
    </footer>
  );
}

function TituloRodape({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mb-5 inline-block border-b border-white px-1 pb-1 text-xl font-semibold text-white">
      {children}
    </h2>
  );
}

/** Marcas das redes em SVG inline: o lucide nao traz icones de marca e a CSP proibe recursos externos. */
function IconeRede({ rede }: { rede: RedeSocial }) {
  const comum = { "aria-hidden": true, className: "size-4", fill: "currentColor" } as const;
  switch (rede) {
    case "facebook":
      return (
        <svg {...comum} viewBox="0 0 320 512">
          <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
        </svg>
      );
    case "x":
      return (
        <svg {...comum} viewBox="0 0 24 24">
          <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...comum} viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...comum} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
          <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.6" cy="6.4" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}
