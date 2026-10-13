"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { StatusIdeia } from "@/prisma/gen/client";
import { editarRedacao, revelarDocumento } from "@/lib/painel/acoes-ideia";
import { codigoDaFalha } from "@/lib/painel/retorno";
import { exigirPerfil, ipHashAtual } from "@/lib/seguranca/auth";
import { tramitarIdeia } from "@/lib/tramitacao/tramitacao";

/**
 * Server Actions da Triagem. DONO: Pessoa B.
 *
 * Toda acao confere sessao e perfil AQUI DENTRO: Server Actions podem ser
 * chamadas por POST direto, sem passar pela tela (doc do Next 16, "Mutating
 * Data"). O retorno vai pela URL como codigo (lib/painel/retorno.ts).
 */

const PERFIS = ["TRIAGEM", "ADMIN"] as const;

function texto(fd: FormData, campo: string): string {
  const v = fd.get(campo);
  return typeof v === "string" ? v : "";
}

function urlDetalhe(protocolo: string, parametro: string) {
  return `/triagem/${encodeURIComponent(protocolo)}?${parametro}`;
}

async function mudarSituacao(fd: FormData, destino: StatusIdeia, okCodigo: string, voltarParaFila: boolean) {
  const protocolo = texto(fd, "protocolo");
  const acesso = await exigirPerfil([...PERFIS]);
  if (!acesso.ok) redirect(acesso.status === 401 ? "/login" : urlDetalhe(protocolo, "erro=permissao"));

  const r = await tramitarIdeia({
    ideiaId: texto(fd, "ideiaId"),
    destino,
    perfil: acesso.sessao.perfil,
    versaoConhecida: Number(texto(fd, "versao")),
    justificativa: texto(fd, "justificativa") || null,
    motivoId: texto(fd, "motivoId") || null,
    usuarioId: acesso.sessao.usuarioId,
    ipHash: await ipHashAtual(),
  });

  revalidatePath("/triagem");
  revalidatePath("/consulta");
  if (!r.ok) redirect(urlDetalhe(protocolo, `erro=${codigoDaFalha(r)}`));
  redirect(
    voltarParaFila
      ? `/triagem?ok=${okCodigo}&protocolo=${encodeURIComponent(protocolo)}`
      : urlDetalhe(protocolo, `ok=${okCodigo}`),
  );
}

export async function assumir(fd: FormData) {
  await mudarSituacao(fd, "EM_TRIAGEM", "assumida", false);
}

export async function aprovar(fd: FormData) {
  await mudarSituacao(fd, "DISPONIVEL", "aprovada", true);
}

export async function arquivar(fd: FormData) {
  await mudarSituacao(fd, "ARQUIVADA", "arquivada", true);
}

export async function editar(fd: FormData) {
  const protocolo = texto(fd, "protocolo");
  const acesso = await exigirPerfil([...PERFIS]);
  if (!acesso.ok) redirect(acesso.status === 401 ? "/login" : urlDetalhe(protocolo, "erro=permissao"));

  const r = await editarRedacao(
    { usuarioId: acesso.sessao.usuarioId, perfil: acesso.sessao.perfil, ipHash: await ipHashAtual() },
    {
      ideiaId: texto(fd, "ideiaId"),
      versaoConhecida: Number(texto(fd, "versao")),
      titulo: texto(fd, "titulo"),
      descricao: texto(fd, "descricao"),
    },
  );
  revalidatePath("/triagem");
  if (!r.ok) redirect(urlDetalhe(protocolo, `erro=${codigoDaFalha(r)}`));
  redirect(urlDetalhe(protocolo, "ok=editada"));
}

// ---------------------------------------------------------------------------
// Revelar documento: devolve o CPF/CNPJ no estado da acao (nunca na URL)
// ---------------------------------------------------------------------------

export type EstadoRevelar =
  | { fase: "inicial" }
  | { fase: "ok"; documento: string }
  | { fase: "erro"; mensagem: string };

export async function revelar(_anterior: EstadoRevelar, fd: FormData): Promise<EstadoRevelar> {
  const acesso = await exigirPerfil([...PERFIS]);
  if (!acesso.ok) return { fase: "erro", mensagem: "Seu perfil não pode revelar documentos." };

  const r = await revelarDocumento(
    { usuarioId: acesso.sessao.usuarioId, perfil: acesso.sessao.perfil, ipHash: await ipHashAtual() },
    texto(fd, "ideiaId"),
  );
  return r.ok ? { fase: "ok", documento: r.valor } : { fase: "erro", mensagem: r.motivo };
}
