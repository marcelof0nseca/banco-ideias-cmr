"use server";

import { headers } from "next/headers";
import type { ErrosCampo } from "@/lib/cadastro";
import { cadastrarIdeia, ipDe } from "@/lib/cadastro-registro";

/**
 * Server Action do assistente de cadastro. Funciona com e sem JS: sem JS o
 * navegador envia o <form> normalmente e a pagina volta com este estado.
 */

/** Campos que voltam preenchidos depois de um erro. Nunca o documento. */
export type ValoresDevolvidos = Partial<
  Record<
    "temaId" | "titulo" | "descricao" | "bairro" | "rpa" | "tipoAutor" | "nome" | "email" | "telefone",
    string
  > & { cienciaTratamento: boolean; autorizaNomePublico: boolean }
>;

export type EstadoCadastro =
  | { fase: "inicial" }
  | { fase: "erro"; mensagem: string; erros: ErrosCampo; valores: ValoresDevolvidos; tentativa: number }
  | { fase: "ok"; protocolo: string; token: string; prazoTriagem: string };

const CAMPOS_DEVOLVIDOS = [
  "temaId",
  "titulo",
  "descricao",
  "bairro",
  "rpa",
  "tipoAutor",
  "nome",
  "email",
  "telefone",
] as const;

function texto(form: FormData, campo: string): string {
  const v = form.get(campo);
  return typeof v === "string" ? v : "";
}

export async function enviarIdeia(
  anterior: EstadoCadastro,
  form: FormData,
): Promise<EstadoCadastro> {
  const dados: Record<string, unknown> = {
    cienciaTratamento: form.get("cienciaTratamento") === "on",
    autorizaNomePublico: form.get("autorizaNomePublico") === "on",
    versaoAviso: texto(form, "versaoAviso"),
    documento: texto(form, "documento"),
  };
  for (const campo of CAMPOS_DEVOLVIDOS) dados[campo] = texto(form, campo);

  let r;
  try {
    r = await cadastrarIdeia({
      dados,
      iniciadoEm: texto(form, "iniciadoEm"),
      armadilha: texto(form, "site"),
      chaveIdempotencia: texto(form, "chaveIdempotencia"),
      ip: ipDe(await headers()),
    });
  } catch {
    r = { ok: false as const, mensagem: "Erro interno. Tente novamente em instantes." };
  }

  if (r.ok) {
    return { fase: "ok", protocolo: r.protocolo, token: r.token, prazoTriagem: r.prazoTriagem };
  }

  const valores: ValoresDevolvidos = {
    cienciaTratamento: dados.cienciaTratamento === true,
    autorizaNomePublico: dados.autorizaNomePublico === true,
  };
  for (const campo of CAMPOS_DEVOLVIDOS) valores[campo] = texto(form, campo);

  return {
    fase: "erro",
    mensagem: r.mensagem,
    erros: "erros" in r ? (r.erros ?? {}) : {},
    valores,
    tentativa: anterior.fase === "erro" ? anterior.tentativa + 1 : 1,
  };
}
