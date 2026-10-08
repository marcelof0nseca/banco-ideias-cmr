"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Menu das telas publicas. Componente de cliente so para ler a rota atual
 * (aria-current); o HTML ja sai completo do servidor e funciona sem JS.
 *
 * usePathname devolve a rota SEM o basePath, e next/link o acrescenta:
 * por isso as rotas aqui sao "cruas".
 */

const ITENS = [
  { href: "/", rotulo: "Início" },
  { href: "/participar", rotulo: "Enviar ideia" },
  { href: "/consulta", rotulo: "Consultar ideias" },
  { href: "/acompanhar", rotulo: "Acompanhar" },
  { href: "/indicadores", rotulo: "Indicadores" },
];

function ativo(rotaAtual: string, href: string): boolean {
  return href === "/" ? rotaAtual === "/" : rotaAtual.startsWith(href);
}

export function NavPublica() {
  const rota = usePathname() ?? "/";
  return (
    <nav aria-label="Principal">
      <ul className="flex flex-wrap gap-0.5">
        {ITENS.map((item) => {
          const atual = ativo(rota, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={atual ? "page" : undefined}
                className={
                  "block whitespace-nowrap rounded-t-md border-t-4 px-3.5 py-2.5 text-sm font-semibold no-underline " +
                  (atual
                    ? "border-azul-claro bg-fundo text-azul-cmr"
                    : "border-transparent bg-azul-escuro text-[#dbe7f8] hover:bg-[#2a5299] hover:text-white")
                }
              >
                {item.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
