import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "./alert";

/**
 * Caixa de aviso sobre o Alert do shadcn/ui. A cor nunca e o unico sinal:
 * cada tipo tem icone e, normalmente, titulo.
 *
 * Erro usa role="alert" (anunciado na hora); os demais, role="status"
 * (anunciado sem interromper o leitor de tela).
 */

export type TipoAlerta = "info" | "sucesso" | "erro" | "atencao";

const APARENCIA: Record<TipoAlerta, { icone: LucideIcon; classes: string }> = {
  info: { icone: Info, classes: "border-azul-medio/40 bg-azul-fundo *:[svg]:text-azul-medio" },
  sucesso: { icone: CircleCheck, classes: "border-verde-cmr/40 bg-verde-fundo *:[svg]:text-verde-cmr" },
  erro: { icone: CircleAlert, classes: "border-vermelho-cmr/40 bg-vermelho-fundo *:[svg]:text-vermelho-cmr" },
  atencao: { icone: TriangleAlert, classes: "border-ambar-cmr/40 bg-ambar-fundo *:[svg]:text-ambar-cmr" },
};

interface AlertaProps {
  tipo?: TipoAlerta;
  titulo?: string;
  children: ReactNode;
  /** Para levar o foco ao alerta (ex.: resumo de erros do formulario). */
  id?: string;
  className?: string;
}

export function Alerta({ tipo = "info", titulo, children, id, className }: AlertaProps) {
  const { icone: Icone, classes } = APARENCIA[tipo];
  return (
    <Alert
      id={id}
      tabIndex={id ? -1 : undefined}
      role={tipo === "erro" ? "alert" : "status"}
      className={cn("px-4 py-3", classes, className)}
    >
      <Icone aria-hidden="true" />
      {titulo && <AlertTitle className="font-semibold">{titulo}</AlertTitle>}
      <AlertDescription className="text-foreground">{children}</AlertDescription>
    </Alert>
  );
}
