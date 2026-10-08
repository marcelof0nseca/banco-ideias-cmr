import type { StatusIdeia } from "@/prisma/gen/client";

/**
 * Apresentacao de cada situacao da ideia: texto + forma + cor.
 * A cor nunca e o unico meio de distinguir (WCAG 1.4.1): todo selo leva o
 * texto e uma forma propria.
 *
 * DONO: Pessoa A.  CONSUMIDOR: Pessoa B (painel usa o mesmo SeloStatus).
 */

export type FormaSelo =
  | "triangulo"
  | "anel"
  | "circulo"
  | "losango"
  | "check"
  | "quadrado";

export interface AparenciaStatus {
  rotulo: string;
  forma: FormaSelo;
  /** Classes Tailwind de texto, borda e fundo (contraste >= 4,5:1). */
  classes: string;
}

export const APARENCIA_STATUS: Record<StatusIdeia, AparenciaStatus> = {
  RECEBIDA: {
    rotulo: "Recebida",
    forma: "triangulo",
    classes: "text-cinza-selo border-[#b7c0cd] bg-cinza-fundo",
  },
  EM_TRIAGEM: {
    rotulo: "Em triagem",
    forma: "anel",
    classes: "text-ambar-cmr border-ambar-cmr bg-ambar-fundo",
  },
  DISPONIVEL: {
    rotulo: "Disponível",
    forma: "circulo",
    classes: "text-marca-medio border-marca-medio bg-marca-fundo",
  },
  EM_ANALISE: {
    rotulo: "Em análise",
    forma: "losango",
    classes: "text-roxo-cmr border-roxo-cmr bg-roxo-fundo",
  },
  ADOTADA: {
    rotulo: "Adotada",
    forma: "check",
    classes: "text-verde-cmr border-verde-cmr bg-verde-fundo",
  },
  ARQUIVADA: {
    rotulo: "Arquivada",
    forma: "quadrado",
    classes: "text-vermelho-cmr border-vermelho-cmr bg-vermelho-fundo",
  },
};

/** Texto da situacao para leitura humana ("Em análise"). */
export function rotuloStatus(status: StatusIdeia): string {
  return APARENCIA_STATUS[status].rotulo;
}
