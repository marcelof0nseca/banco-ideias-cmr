"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { anonimizarTitular, localizarTitular, revogarConsentimento, type Titular } from "@/lib/painel/titular";
import { urlRetorno } from "@/lib/painel/retorno";
import { exigirPerfil, ipHashAtual } from "@/lib/seguranca/auth";

/**
 * Acoes de atendimento ao titular (LGPD). DONO: Pessoa B. So ADMIN.
 * O documento buscado viaja no corpo do POST e o resultado no estado da acao
 * - nunca na URL (nao fica em historico nem em log de acesso).
 */

const VOLTA = "/admin/titulares";

export type EstadoBusca =
  | { fase: "inicial" }
  | { fase: "erro"; mensagem: string }
  | { fase: "ok"; titular: Titular };

export async function localizarAcao(_anterior: EstadoBusca, fd: FormData): Promise<EstadoBusca> {
  const acesso = await exigirPerfil(["ADMIN"]);
  if (!acesso.ok) return { fase: "erro", mensagem: "Somente a administração atende pedidos de titulares." };

  const tipo = fd.get("tipo") === "JURIDICA" ? "JURIDICA" : "FISICA";
  const documento = String(fd.get("documento") ?? "");
  const titular = await localizarTitular(documento, tipo);
  if (!titular) {
    return {
      fase: "erro",
      mensagem: `Nenhum titular encontrado com este ${tipo === "JURIDICA" ? "CNPJ" : "CPF"}. Confira os números.`,
    };
  }
  return { fase: "ok", titular };
}

async function admin() {
  const acesso = await exigirPerfil(["ADMIN"]);
  if (!acesso.ok) redirect(acesso.status === 401 ? "/login" : urlRetorno(VOLTA, { erro: "permissao" }));
  return { usuarioId: acesso.sessao.usuarioId, perfil: acesso.sessao.perfil, ipHash: await ipHashAtual() };
}

export async function revogarAcao(fd: FormData) {
  const ok = await revogarConsentimento(await admin(), String(fd.get("autorId") ?? ""));
  revalidatePath("/consulta");
  redirect(urlRetorno(VOLTA, ok ? { ok: "consentimento-revogado" } : { erro: "invalido" }));
}

export async function anonimizarAcao(fd: FormData) {
  const quem = await admin();
  if (fd.get("confirmo") !== "sim") redirect(urlRetorno(VOLTA, { erro: "confirmacao" }));
  const ok = await anonimizarTitular(quem, String(fd.get("autorId") ?? ""));
  revalidatePath("/consulta");
  redirect(urlRetorno(VOLTA, ok ? { ok: "titular-anonimizado" } : { erro: "invalido" }));
}
