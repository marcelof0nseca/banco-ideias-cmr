"use server";

import { redirect } from "next/navigation";
import { autenticar, definirCookieSessao, limparCookieSessao } from "@/lib/seguranca/auth";

/**
 * Acoes de login/logout do painel interno. DONO: Pessoa B.
 * Funcionam sem JavaScript (Server Actions + redirect).
 */

/** So aceita caminho interno do painel; evita open redirect. */
function destinoSeguro(destino: FormDataEntryValue | null): string {
  const p = typeof destino === "string" ? destino : "";
  const permitido =
    p.startsWith("/") &&
    !p.startsWith("//") &&
    ["/triagem", "/gabinete", "/admin"].some((base) => p === base || p.startsWith(`${base}/`));
  return permitido ? p : "/triagem";
}

export async function entrar(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const destino = destinoSeguro(formData.get("destino"));
  const voltar = (erro: string) =>
    `/login?erro=${erro}&destino=${encodeURIComponent(destino)}`;

  if (!email || !senha) redirect(voltar("credenciais"));

  const r = await autenticar(email, senha);
  if (!r.ok) {
    redirect(voltar(r.motivo === "bloqueado" ? `bloqueado-${r.tentarEmMin ?? 15}` : "credenciais"));
  }

  await definirCookieSessao(r.sessao);
  redirect(destino);
}

export async function sair() {
  await limparCookieSessao();
  redirect("/login");
}
