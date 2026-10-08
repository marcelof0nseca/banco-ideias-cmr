import type { ReactNode } from "react";

/**
 * Caixa de aviso. Erro usa role="alert" (anunciado na hora); os demais,
 * role="status" (anunciado sem interromper o leitor de tela).
 */

export type TipoAlerta = "info" | "sucesso" | "erro" | "atencao";

const ESTILO: Record<TipoAlerta, string> = {
  info: "bg-[#eef3fb] border-azul-medio",
  sucesso: "bg-verde-fundo border-verde-cmr",
  erro: "bg-vermelho-fundo border-vermelho-cmr",
  atencao: "bg-ambar-fundo border-ambar-cmr",
};

interface AlertaProps {
  tipo?: TipoAlerta;
  titulo?: string;
  children: ReactNode;
  /** Para levar o foco ao alerta (ex.: resumo de erros do formulario). */
  id?: string;
}

export function Alerta({ tipo = "info", titulo, children, id }: AlertaProps) {
  return (
    <div
      id={id}
      tabIndex={id ? -1 : undefined}
      role={tipo === "erro" ? "alert" : "status"}
      className={`my-3.5 rounded-md border-l-4 px-4 py-3 text-sm ${ESTILO[tipo]}`}
    >
      {titulo && <p className="mb-0.5 font-bold">{titulo}</p>}
      <div>{children}</div>
    </div>
  );
}
