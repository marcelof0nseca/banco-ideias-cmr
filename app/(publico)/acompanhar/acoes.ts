"use server";

import { headers } from "next/headers";
import { acompanharIdeia } from "@/lib/acompanhamento";
import { ipDe } from "@/lib/cadastro-registro";
import type { AcompanhamentoPrivado } from "@/types/publico";

/**
 * Server Action do Acompanhar. Funciona sem JS (o <form> faz POST e a pagina
 * volta com este estado). O documento nunca volta no estado.
 */
export type EstadoAcompanhar =
  | { fase: "inicial" }
  | {
      fase: "erro";
      mensagem: string;
      campo?: "protocolo" | "credencial";
      protocolo: string;
      tentativa: number;
    }
  | { fase: "ok"; acompanhamento: AcompanhamentoPrivado; tentativa: number };

export async function consultarAcompanhamento(
  anterior: EstadoAcompanhar,
  form: FormData,
): Promise<EstadoAcompanhar> {
  const texto = (c: string) => {
    const v = form.get(c);
    return typeof v === "string" ? v : "";
  };
  const protocolo = texto("protocolo");
  const tentativa = anterior.fase === "inicial" ? 1 : anterior.tentativa + 1;

  try {
    const r = await acompanharIdeia({
      protocolo,
      documento: texto("documento"),
      token: texto("token"),
      ip: ipDe(await headers()),
    });
    if (r.ok) return { fase: "ok", acompanhamento: r.acompanhamento, tentativa };
    return { fase: "erro", mensagem: r.mensagem, campo: r.campo, protocolo, tentativa };
  } catch {
    return {
      fase: "erro",
      mensagem: "Erro interno. Tente novamente em instantes.",
      protocolo,
      tentativa,
    };
  }
}
