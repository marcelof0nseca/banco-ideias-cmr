"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Menu das telas publicas. Componente de cliente so para ler a rota atual
 * (aria-current); o HTML ja sai completo do servidor e funciona sem JS.
 *
 * usePathname devolve a rota SEM o basePath, e next/link o acrescenta:
 * por isso as rotas aqui sao "cruas".
 */

export const ITENS_MENU = [
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
      <ul className="-mb-px flex flex-wrap gap-1">
        {ITENS_MENU.map((item) => {
          const atual = ativo(rota, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={atual ? "page" : undefined}
                className={cn(
                  "block rounded-t-lg border-t-4 px-4 py-2.5 text-sm font-semibold whitespace-nowrap no-underline transition-colors",
                  atual
                    ? "border-dourado bg-background text-marca"
                    : "border-transparent bg-marca-escuro text-white hover:bg-marca-medio",
                )}
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
