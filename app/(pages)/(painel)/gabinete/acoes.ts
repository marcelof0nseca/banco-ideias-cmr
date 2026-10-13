"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { codigoDaFalha } from "@/lib/painel/retorno";
import { exigirPerfil, ipHashAtual } from "@/lib/seguranca/auth";
import {
  adotarIdeia,
  desistirDaAnalise,
  manifestarInteresse,
  type PedidoTransicao,
  type ResultadoTramitar,
} from "@/lib/tramitacao/tramitacao";

/**
 * Server Actions do painel do Gabinete. DONO: Pessoa B.
 * Sessao e perfil conferidos AQUI (Server Action aceita POST direto).
 * O gabinete vem da sessao; o ADMIN, que nao tem gabinete, informa no form.
 */

function texto(fd: FormData, campo: string): string {
  const v = fd.get(campo);
  return typeof v === "string" ? v.trim() : "";
}

async function executar(
  fd: FormData,
  okCodigo: string,
  acao: (pedido: Omit<PedidoTransicao, "destino">) => Promise<ResultadoTramitar>,
) {
  const protocolo = texto(fd, "protocolo");
  const volta = (q: string) => `/gabinete/${encodeURIComponent(protocolo)}?${q}`;

  const acesso = await exigirPerfil(["GABINETE", "ADMIN"]);
  if (!acesso.ok) redirect(acesso.status === 401 ? "/login" : volta("erro=permissao"));

  const r = await acao({
    ideiaId: texto(fd, "ideiaId"),
    perfil: acesso.sessao.perfil,
    versaoConhecida: Number(texto(fd, "versao")),
    justificativa: texto(fd, "justificativa") || null,
    gabinete: acesso.sessao.gabinete ?? texto(fd, "gabinete"),
    usuarioId: acesso.sessao.usuarioId,
    ipHash: await ipHashAtual(),
  });

  revalidatePath("/gabinete");
  revalidatePath("/consulta");
  if (!r.ok) redirect(volta(`erro=${codigoDaFalha(r)}`));
  redirect(volta(`ok=${okCodigo}`));
}

export async function analisar(fd: FormData) {
  await executar(fd, "interesse", manifestarInteresse);
}

export async function adotar(fd: FormData) {
  await executar(fd, "adotada", adotarIdeia);
}

export async function desistir(fd: FormData) {
  await executar(fd, "desistencia", desistirDaAnalise);
}
