"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Perfil } from "@/prisma/gen/client";
import { cn } from "@/lib/sistema/utils";

/**
 * Menu do painel interno: mesmas abas do menu publico (NavPublica), com os
 * itens que o perfil pode ver. Cliente so para ler a rota atual
 * (aria-current); o HTML sai completo do servidor e funciona sem JS.
 * DONO: Pessoa B.
 */

const ITENS: { href: string; rotulo: string; perfis: Perfil[] }[] = [
  { href: "/triagem", rotulo: "Triagem", perfis: ["TRIAGEM", "ADMIN"] },
  { href: "/gabinete", rotulo: "Gabinete", perfis: ["GABINETE", "ADMIN"] },
  { href: "/admin", rotulo: "Administração", perfis: ["ADMIN"] },
];

export function NavPainel({ perfil }: { perfil: Perfil }) {
  const rota = usePathname() ?? "/";
  const itens = ITENS.filter((i) => i.perfis.includes(perfil));
  return (
    <nav aria-label="Painel interno">
      <ul className="-mb-px flex flex-wrap gap-1">
        {itens.map((item) => {
          const atual = rota === item.href || rota.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={atual ? "page" : undefined}
                className={cn(
                  "block rounded-t-lg border-t-4 px-4 py-2.5 text-sm font-semibold whitespace-nowrap no-underline transition-colors motion-reduce:transition-none",
                  atual
                    ? "border-dourado bg-background text-marca"
                    : "border-transparent bg-marca-escuro text-white hover:bg-marca",
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

/** Aba unica exibida no login, antes de haver sessao. */
export function AbaAcessoInterno() {
  return (
    <ul className="-mb-px flex">
      <li className="block rounded-t-lg border-t-4 border-dourado bg-background px-4 py-2.5 text-sm font-semibold text-marca">
        Acesso interno
      </li>
    </ul>
  );
}
