"use server";

import { redirect } from "next/navigation";
import { registrarEvento } from "@/lib/seguranca/auditoria";
import {
  autenticar,
  definirCookieSessao,
  ipHashAtual,
  limparCookieSessao,
  sessaoAtual,
} from "@/lib/seguranca/auth";

/**
 * Acoes de login/logout do painel interno. DONO: Pessoa B.
 * Funcionam sem JavaScript (Server Actions + redirect).
 * Entradas, saidas e recusas vao para a trilha de auditoria (secao 8.6).
 */

/** So aceita caminho interno do painel; evita open redirect. */
function destinoSeguro(destino: FormDataEntryValue | null): string {
  const p = typeof destino === "string" ? destino : "";
  const permitido =
    p.startsWith("/") &&
    !p.startsWith("//") &&
    ["/triagem", "/gabinete", "/admin"].some((base) => p === base || p.startsWith(`${base}/`));
  return permitido ? p : "";
}

/** Tela inicial de cada perfil. */
function inicioDoPerfil(perfil: string): string {
  if (perfil === "GABINETE") return "/gabinete";
  if (perfil === "ADMIN") return "/admin";
  return "/triagem";
}

export async function entrar(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const destinoPedido = destinoSeguro(formData.get("destino"));
  const voltar = (erro: string) =>
    `/login?erro=${erro}${destinoPedido ? `&destino=${encodeURIComponent(destinoPedido)}` : ""}`;

  if (!email || !senha) redirect(voltar("credenciais"));

  const ipHash = await ipHashAtual();
  const r = await autenticar(email, senha);
  if (!r.ok) {
    await registrarEvento({ acao: "LOGIN_FALHA", detalhe: r.motivo, ipHash });
    redirect(voltar(r.motivo === "bloqueado" ? `bloqueado-${r.tentarEmMin ?? 15}` : "credenciais"));
  }

  await registrarEvento({ acao: "LOGIN", usuarioId: r.sessao.usuarioId, ipHash });
  await definirCookieSessao(r.sessao);
  redirect(destinoPedido || inicioDoPerfil(r.sessao.perfil));
}

export async function sair() {
  const sessao = await sessaoAtual();
  if (sessao) {
    await registrarEvento({ acao: "LOGOUT", usuarioId: sessao.usuarioId, ipHash: await ipHashAtual() });
  }
  await limparCookieSessao();
  redirect("/login");
}
