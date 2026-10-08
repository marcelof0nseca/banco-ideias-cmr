import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/sistema/utils";
import { Button, buttonVariants } from "./button";

/**
 * Botao e link com aparencia de botao, sobre o Button do shadcn/ui.
 * Mantem a API em portugues usada pelas telas (contrato com a Pessoa B).
 *
 * `BotaoLink` usa next/link, que ja aplica o basePath: passe a rota "crua"
 * ("/consulta"), nunca caminho("/consulta") - senao o prefixo duplica.
 */

export type VarianteBotao = "primario" | "secundario" | "sucesso" | "perigo" | "contorno";

const VARIANTE_SHADCN = {
  primario: "default",
  secundario: "secondary",
  sucesso: "success",
  perigo: "destructive",
  contorno: "outline",
} as const;

export function classesBotao(variante: VarianteBotao = "primario", pequeno = false): string {
  return buttonVariants({
    variant: VARIANTE_SHADCN[variante],
    size: pequeno ? "sm" : "default",
  });
}

type BotaoProps = Omit<ComponentProps<typeof Button>, "variant" | "size"> & {
  variante?: VarianteBotao;
  pequeno?: boolean;
};

export function Botao({ variante = "primario", pequeno, type = "button", ...resto }: BotaoProps) {
  return (
    <Button
      type={type}
      variant={VARIANTE_SHADCN[variante]}
      size={pequeno ? "sm" : "default"}
      {...resto}
    />
  );
}

interface BotaoLinkProps {
  href: string;
  children: ReactNode;
  variante?: VarianteBotao;
  pequeno?: boolean;
  className?: string;
}

export function BotaoLink({ href, children, variante, pequeno, className }: BotaoLinkProps) {
  return (
    <Link href={href} className={cn(classesBotao(variante, pequeno), "no-underline", className)}>
      {children}
    </Link>
  );
}
