"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/sistema/utils";

/**
 * Sub-menu de uma area do painel (ex.: Administracao). Cliente so para
 * marcar a pagina atual; funciona sem JS. DONO: Pessoa B.
 */
export function NavSecundaria({ rotulo, itens }: { rotulo: string; itens: { href: string; rotulo: string }[] }) {
  const rota = usePathname() ?? "/";
  return (
    <nav aria-label={rotulo}>
      <ul className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
        {itens.map((item) => {
          const atual = item.href === rota || (item.href !== itens[0]?.href && rota.startsWith(`${item.href}/`));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={atual ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-1.5 text-sm font-semibold no-underline",
                  atual ? "bg-card text-marca shadow-sm" : "text-secondary-foreground hover:bg-card/60",
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
