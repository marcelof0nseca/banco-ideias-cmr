"use server";

import { headers } from "next/headers";
import { apoiarIdeia } from "@/lib/apoio";
import { ipDe } from "@/lib/cadastro-registro";

/** Server Action do apoio (funciona sem JS). O documento nunca volta no estado. */
export type EstadoApoio =
  | { fase: "inicial" }
  | { fase: "ok"; apoiosCount: number; tentativa: number }
  | { fase: "erro"; mensagem: string; campo?: "documento"; jaApoiou?: boolean; tentativa: number };

export async function registrarApoio(anterior: EstadoApoio, form: FormData): Promise<EstadoApoio> {
  const texto = (c: string) => {
    const v = form.get(c);
    return typeof v === "string" ? v : "";
  };
  const tentativa = anterior.fase === "inicial" ? 1 : anterior.tentativa + 1;
  try {
    const r = await apoiarIdeia({
      protocolo: texto("protocolo"),
      documento: texto("documento"),
      iniciadoEm: texto("iniciadoEm"),
      armadilha: texto("site"),
      ip: ipDe(await headers()),
    });
    if (r.ok) return { fase: "ok", apoiosCount: r.apoiosCount, tentativa };
    return { fase: "erro", mensagem: r.mensagem, campo: r.campo, jaApoiou: r.jaApoiou, tentativa };
  } catch {
    return { fase: "erro", mensagem: "Erro interno. Tente novamente em instantes.", tentativa };
  }
}
