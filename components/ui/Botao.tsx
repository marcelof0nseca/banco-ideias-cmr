import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Botao e link com aparencia de botao.
 *
 * `BotaoLink` usa next/link, que ja aplica o basePath: passe a rota "crua"
 * ("/consulta"), nunca caminho("/consulta") - senao o prefixo duplica.
 */

export type VarianteBotao = "primario" | "secundario" | "sucesso" | "perigo";

const VARIANTES: Record<VarianteBotao, string> = {
  primario: "bg-azul-acao text-white hover:bg-[#1d4fd0]",
  secundario: "bg-azul-suave text-azul-cmr hover:bg-[#d9e3f3]",
  sucesso: "bg-verde-cmr text-white hover:bg-[#10583a]",
  perigo: "bg-vermelho-cmr text-white hover:bg-[#981d14]",
};

export function classesBotao(
  variante: VarianteBotao = "primario",
  pequeno = false,
): string {
  const tamanho = pequeno ? "px-3 py-1.5 text-sm" : "px-4.5 py-2.5 text-[15px]";
  return (
    "inline-flex items-center justify-center gap-2 rounded-md font-semibold no-underline " +
    "cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 " +
    `${tamanho} ${VARIANTES[variante]}`
  );
}

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao;
  pequeno?: boolean;
}

export function Botao({
  variante,
  pequeno,
  className,
  type = "button",
  ...resto
}: BotaoProps) {
  return (
    <button
      type={type}
      className={`${classesBotao(variante, pequeno)} ${className ?? ""}`}
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

export function BotaoLink({
  href,
  children,
  variante,
  pequeno,
  className,
}: BotaoLinkProps) {
  return (
    <Link
      href={href}
      className={`${classesBotao(variante, pequeno)} ${className ?? ""}`}
    >
      {children}
    </Link>
  );
}
