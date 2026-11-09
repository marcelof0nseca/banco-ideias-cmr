"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  alternarItemLista,
  criarUsuario,
  definirAtivo,
  incluirMotivo,
  incluirTema,
  redefinirSenha,
  type Quem,
  type ResultadoAdmin,
} from "@/lib/painel/admin";
import { mensagemErro } from "@/lib/painel/retorno";
import { exigirPerfil, ipHashAtual } from "@/lib/seguranca/auth";

/**
 * Server Actions da Administracao. DONO: Pessoa B.
 * Perfil ADMIN conferido aqui dentro (Server Action aceita POST direto).
 */

function texto(fd: FormData, campo: string): string {
  const v = fd.get(campo);
  return typeof v === "string" ? v : "";
}

async function quem(volta: string): Promise<Quem> {
  const acesso = await exigirPerfil(["ADMIN"]);
  if (!acesso.ok) redirect(acesso.status === 401 ? "/login" : `${volta}?erro=permissao`);
  return { usuarioId: acesso.sessao.usuarioId, perfil: acesso.sessao.perfil, ipHash: await ipHashAtual() };
}

function concluir(volta: string, r: ResultadoAdmin, okCodigo: string): never {
  revalidatePath(volta);
  redirect(r.ok ? `${volta}?ok=${okCodigo}` : `${volta}?erro=${r.codigo}`);
}

// --- usuarios ---------------------------------------------------------------

const USUARIOS = "/admin/acessos";

/** Valores digitados que voltam ao formulario num erro (a senha nunca volta). */
export interface ValoresNovoUsuario {
  nome: string;
  email: string;
  perfil: string;
  gabinete: string;
}

export interface EstadoNovoUsuario {
  valores: ValoresNovoUsuario;
  erro?: { mensagem: string; campo?: "nome" | "email" | "gabinete" | "senha" };
  /** Muda a cada envio: remonta o form para os valores voltarem. */
  tentativa: number;
}

/**
 * Criar usuario com useActionState: num erro, devolve o que foi digitado
 * (menos a senha) e aponta o campo. Funciona sem JS. No sucesso, redireciona.
 */
export async function criarUsuarioAcao(anterior: EstadoNovoUsuario, fd: FormData): Promise<EstadoNovoUsuario> {
  const valores: ValoresNovoUsuario = {
    nome: texto(fd, "nome"),
    email: texto(fd, "email"),
    perfil: texto(fd, "perfil"),
    gabinete: texto(fd, "gabinete"),
  };
  const r = await criarUsuario(await quem(USUARIOS), { ...valores, senha: texto(fd, "senha") });
  if (r.ok) concluir(USUARIOS, r, "usuario-criado");

  const tentativa = anterior.tentativa + 1;
  const mensagem = mensagemErro(r.codigo) ?? "Não foi possível criar o usuário.";
  if (r.codigo === "email-repetido") return { valores, tentativa, erro: { mensagem, campo: "email" } };
  if (r.codigo === "senha-fraca") return { valores, tentativa, erro: { mensagem, campo: "senha" } };
  if (r.codigo === "dados-usuario" && valores.perfil === "GABINETE" && !valores.gabinete.trim()) {
    return { valores, tentativa, erro: { mensagem: "Informe o gabinete ou a comissão desta pessoa.", campo: "gabinete" } };
  }
  return { valores, tentativa, erro: { mensagem } };
}

export async function ativarUsuarioAcao(fd: FormData) {
  const r = await definirAtivo(await quem(USUARIOS), texto(fd, "usuarioId"), true);
  concluir(USUARIOS, r, "usuario-ativado");
}

export async function desativarUsuarioAcao(fd: FormData) {
  const r = await definirAtivo(await quem(USUARIOS), texto(fd, "usuarioId"), false);
  concluir(USUARIOS, r, "usuario-desativado");
}

export async function redefinirSenhaAcao(fd: FormData) {
  const r = await redefinirSenha(await quem(USUARIOS), texto(fd, "usuarioId"), texto(fd, "senha"));
  concluir(USUARIOS, r, "senha-redefinida");
}

// --- listas controladas ------------------------------------------------------

const LISTAS = "/admin/listas";

export async function incluirTemaAcao(fd: FormData) {
  const r = await incluirTema(await quem(LISTAS), texto(fd, "nome"));
  concluir(LISTAS, r, "lista-incluida");
}

export async function incluirMotivoAcao(fd: FormData) {
  const r = await incluirMotivo(await quem(LISTAS), texto(fd, "descricao"));
  concluir(LISTAS, r, "lista-incluida");
}

export async function alternarItemAcao(fd: FormData) {
  const tipo = texto(fd, "tipo") === "motivo" ? "motivo" : "tema";
  const r = await alternarItemLista(await quem(LISTAS), tipo, texto(fd, "id"), texto(fd, "ativo") === "true");
  concluir(LISTAS, r, "lista-alterada");
}
