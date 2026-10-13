import { Prisma, type AcaoAuditoria, type Perfil } from "@/prisma/gen/client";
import { registrarEvento } from "../seguranca/auditoria";
import { hashSenha, senhaForte } from "../seguranca/senha";
import { prisma } from "../sistema/prisma";
import type { CodigoErro } from "./retorno";

/**
 * Regras da area de Administracao (especificacao, secao 3.1): usuarios,
 * listas controladas e trilha de auditoria. DONO: Pessoa B.
 * Toda alteracao fica registrada em EventoAuditoria.
 */

export interface Quem {
  usuarioId: string;
  perfil: Perfil;
  ipHash?: string | null;
}

export type ResultadoAdmin = { ok: true } | { ok: false; codigo: CodigoErro };

const PERFIS: Perfil[] = ["TRIAGEM", "GABINETE", "ADMIN"];

function soAdmin(quem: Quem): ResultadoAdmin | null {
  return quem.perfil === "ADMIN" ? null : { ok: false, codigo: "permissao" };
}

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------

export function listarUsuarios() {
  return prisma.usuario.findMany({
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    select: {
      id: true, nome: true, email: true, perfil: true, gabinete: true, ativo: true,
      ultimoLoginEm: true, bloqueadoAte: true, tentativasFalhas: true,
    },
  });
}

export interface NovoUsuario {
  nome: string;
  email: string;
  perfil: string;
  gabinete?: string | null;
  senha: string;
}

export async function criarUsuario(quem: Quem, d: NovoUsuario): Promise<ResultadoAdmin> {
  const negado = soAdmin(quem);
  if (negado) return negado;

  const nome = d.nome.trim();
  const email = d.email.trim().toLowerCase();
  const perfil = d.perfil as Perfil;
  const gabinete = d.gabinete?.trim() || null;
  if (nome.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !PERFIS.includes(perfil)) {
    return { ok: false, codigo: "dados-usuario" };
  }
  if (perfil === "GABINETE" && !gabinete) return { ok: false, codigo: "dados-usuario" };
  if (!senhaForte(d.senha)) return { ok: false, codigo: "senha-fraca" };
  if (await prisma.usuario.findUnique({ where: { email }, select: { id: true } })) {
    return { ok: false, codigo: "email-repetido" };
  }

  const criado = await prisma.usuario.create({
    data: { nome, email, perfil, gabinete: perfil === "GABINETE" ? gabinete : null, senhaHash: await hashSenha(d.senha) },
    select: { id: true },
  });
  await registrarEvento({
    acao: "USUARIO_CRIADO", usuarioId: quem.usuarioId, alvoTipo: Prisma.ModelName.Usuario, alvoId: criado.id,
    detalhe: `perfil ${perfil}`, ipHash: quem.ipHash,
  });
  return { ok: true };
}

export async function definirAtivo(quem: Quem, usuarioId: string, ativo: boolean): Promise<ResultadoAdmin> {
  const negado = soAdmin(quem);
  if (negado) return negado;
  if (!ativo && usuarioId === quem.usuarioId) return { ok: false, codigo: "proprio-usuario" };

  await prisma.usuario.update({
    where: { id: usuarioId },
    // Reativar tambem desbloqueia.
    data: ativo ? { ativo, tentativasFalhas: 0, bloqueadoAte: null } : { ativo },
  });
  await registrarEvento({
    acao: ativo ? "USUARIO_ALTERADO" : "USUARIO_DESATIVADO",
    usuarioId: quem.usuarioId, alvoTipo: Prisma.ModelName.Usuario, alvoId: usuarioId,
    detalhe: ativo ? "reativado" : "desativado", ipHash: quem.ipHash,
  });
  return { ok: true };
}

export async function redefinirSenha(quem: Quem, usuarioId: string, senha: string): Promise<ResultadoAdmin> {
  const negado = soAdmin(quem);
  if (negado) return negado;
  if (!senhaForte(senha)) return { ok: false, codigo: "senha-fraca" };

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { senhaHash: await hashSenha(senha), tentativasFalhas: 0, bloqueadoAte: null },
  });
  await registrarEvento({
    acao: "USUARIO_ALTERADO", usuarioId: quem.usuarioId, alvoTipo: Prisma.ModelName.Usuario, alvoId: usuarioId,
    detalhe: "senha redefinida", ipHash: quem.ipHash,
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Listas controladas: temas e motivos de arquivamento
// ---------------------------------------------------------------------------

/** "Fora da competência do Município" -> "FORA_DA_COMPETENCIA_DO_MUNICIPIO" */
export function codigoDoTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);
}

async function registrarLista(quem: Quem, alvoTipo: string, alvoId: string, detalhe: string) {
  await registrarEvento({
    acao: "LISTA_CONTROLADA_ALTERADA", usuarioId: quem.usuarioId, alvoTipo, alvoId, detalhe, ipHash: quem.ipHash,
  });
}

export async function incluirTema(quem: Quem, nome: string): Promise<ResultadoAdmin> {
  const negado = soAdmin(quem);
  if (negado) return negado;
  const n = nome.trim();
  if (n.length < 3) return { ok: false, codigo: "lista-vazia" };
  if (await prisma.tema.findUnique({ where: { nome: n }, select: { id: true } })) {
    return { ok: false, codigo: "lista-repetida" };
  }
  const ordem = await prisma.tema.count();
  const t = await prisma.tema.create({ data: { nome: n, ordem } });
  await registrarLista(quem, Prisma.ModelName.Tema, t.id, `incluído: ${n}`);
  return { ok: true };
}

export async function incluirMotivo(quem: Quem, descricao: string): Promise<ResultadoAdmin> {
  const negado = soAdmin(quem);
  if (negado) return negado;
  const d = descricao.trim();
  const codigo = codigoDoTexto(d);
  if (d.length < 5 || !codigo) return { ok: false, codigo: "lista-vazia" };
  if (await prisma.motivoArquivamento.findUnique({ where: { codigo }, select: { id: true } })) {
    return { ok: false, codigo: "lista-repetida" };
  }
  const ordem = await prisma.motivoArquivamento.count();
  const m = await prisma.motivoArquivamento.create({ data: { codigo, descricao: d, ordem } });
  await registrarLista(quem, Prisma.ModelName.MotivoArquivamento, m.id, `incluído: ${d}`);
  return { ok: true };
}

/**
 * Itens de lista nao sao apagados (ideias antigas apontam para eles): sao
 * desativados e deixam de aparecer nos formularios.
 */
export async function alternarItemLista(
  quem: Quem,
  tipo: "tema" | "motivo",
  id: string,
  ativo: boolean,
): Promise<ResultadoAdmin> {
  const negado = soAdmin(quem);
  if (negado) return negado;
  if (tipo === "tema") await prisma.tema.update({ where: { id }, data: { ativo } });
  else await prisma.motivoArquivamento.update({ where: { id }, data: { ativo } });
  await registrarLista(quem, tipo === "tema" ? Prisma.ModelName.Tema : Prisma.ModelName.MotivoArquivamento, id, ativo ? "reativado" : "desativado");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Auditoria
// ---------------------------------------------------------------------------

/**
 * Le a trilha. A propria consulta e registrada (secao 8.6): quem olha a
 * auditoria tambem deixa rastro.
 */
export async function consultarAuditoria(quem: Quem, filtro: { acao?: AcaoAuditoria | null; limite?: number }) {
  if (quem.perfil !== "ADMIN") return null;
  await registrarEvento({ acao: "CONSULTA_AUDITORIA", usuarioId: quem.usuarioId, ipHash: quem.ipHash });
  return prisma.eventoAuditoria.findMany({
    where: filtro.acao ? { acao: filtro.acao } : {},
    orderBy: { criadoEm: "desc" },
    take: filtro.limite ?? 300,
    select: {
      id: true, acao: true, alvoTipo: true, alvoId: true, detalhe: true, criadoEm: true,
      usuario: { select: { nome: true, perfil: true } },
    },
  });
}

export async function resumoAdmin() {
  const trintaDias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const [usuariosAtivos, ideias, eventosHoje, revelacoes, recusas] = await Promise.all([
    prisma.usuario.count({ where: { ativo: true } }),
    prisma.ideia.count(),
    prisma.eventoAuditoria.count({ where: { criadoEm: { gte: hoje } } }),
    prisma.eventoAuditoria.count({ where: { acao: "REVELACAO_DOCUMENTO", criadoEm: { gte: trintaDias } } }),
    prisma.eventoAuditoria.count({ where: { acao: "LOGIN_FALHA", criadoEm: { gte: trintaDias } } }),
  ]);
  return { usuariosAtivos, ideias, eventosHoje, revelacoes, recusas };
}
