import { describe, expect, test } from "vitest";
import type { Prisma, StatusIdeia } from "@/prisma/gen/client";
import { MENSAGEM_CONFLITO, transitar } from "./tramitacao";

/**
 * Banco falso em memoria com so o que `transitar` usa. Permite testar as
 * regras (versao, motivo, perfil, gabinete) sem PostgreSQL.
 */
function bancoFalso(inicial: { status: StatusIdeia; versao?: number }) {
  const ideia = {
    id: "i1",
    status: inicial.status,
    versao: inicial.versao ?? 0,
    triadoEm: null as Date | null,
    publicadoEm: null as Date | null,
  };
  const tramitacoes: Record<string, unknown>[] = [];
  const interesses: { ideiaId: string; gabinete: string; tipo: string }[] = [];
  const motivos = [{ id: "m1", ativo: true }];

  const tx = {
    ideia: {
      findUnique: async () => ({ ...ideia }),
      updateMany: async ({ where, data }: { where: { versao: number }; data: Record<string, unknown> }) => {
        if (where.versao !== ideia.versao) return { count: 0 };
        ideia.status = data.status as StatusIdeia;
        ideia.versao += 1;
        if (data.triadoEm) ideia.triadoEm = data.triadoEm as Date;
        if (data.publicadoEm) ideia.publicadoEm = data.publicadoEm as Date;
        return { count: 1 };
      },
    },
    tramitacao: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        tramitacoes.push(data);
        return data;
      },
    },
    motivoArquivamento: {
      findFirst: async ({ where }: { where: { id: string } }) =>
        motivos.find((m) => m.id === where.id && m.ativo) ?? null,
    },
    interesseGabinete: {
      upsert: async ({ create, update }: { create: { gabinete: string; tipo: string; ideiaId: string }; update: { tipo?: string } }) => {
        const existente = interesses.find((i) => i.gabinete === create.gabinete);
        if (existente) Object.assign(existente, update);
        else interesses.push({ ideiaId: create.ideiaId, gabinete: create.gabinete, tipo: create.tipo });
      },
      deleteMany: async () => {
        interesses.length = 0;
      },
    },
  };

  return { tx: tx as unknown as Prisma.TransactionClient, ideia, tramitacoes, interesses };
}

const base = { ideiaId: "i1", usuarioId: "u1" };

describe("transitar", () => {
  test("RECEBIDA -> EM_TRIAGEM grava tramitacao com texto padrao e sobe a versao", async () => {
    const b = bancoFalso({ status: "RECEBIDA" });
    const r = await transitar(b.tx, { ...base, destino: "EM_TRIAGEM", perfil: "TRIAGEM", versaoConhecida: 0 });
    expect(r).toEqual({ ok: true, novoStatus: "EM_TRIAGEM", novaVersao: 1 });
    expect(b.ideia.versao).toBe(1);
    expect(b.tramitacoes[0]).toMatchObject({
      statusAnterior: "RECEBIDA",
      statusNovo: "EM_TRIAGEM",
      publica: true,
      justificativa: "Análise iniciada pela Secretaria.",
    });
  });

  test("versao desatualizada responde 409 e nao grava nada", async () => {
    const b = bancoFalso({ status: "RECEBIDA", versao: 3 });
    const r = await transitar(b.tx, { ...base, destino: "EM_TRIAGEM", perfil: "TRIAGEM", versaoConhecida: 2 });
    expect(r).toEqual({ ok: false, httpStatus: 409, motivo: MENSAGEM_CONFLITO });
    expect(b.tramitacoes).toHaveLength(0);
  });

  test("perfil errado responde 403", async () => {
    const b = bancoFalso({ status: "EM_TRIAGEM" });
    const r = await transitar(b.tx, { ...base, destino: "DISPONIVEL", perfil: "GABINETE", versaoConhecida: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.httpStatus).toBe(403);
  });

  test("arquivar sem motivo responde 422", async () => {
    const b = bancoFalso({ status: "EM_TRIAGEM" });
    const r = await transitar(b.tx, {
      ...base, destino: "ARQUIVADA", perfil: "TRIAGEM", versaoConhecida: 0, justificativa: "Fora do escopo.",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toContain("motivo");
  });

  test("arquivar sem justificativa responde 422", async () => {
    const b = bancoFalso({ status: "EM_TRIAGEM" });
    const r = await transitar(b.tx, {
      ...base, destino: "ARQUIVADA", perfil: "TRIAGEM", versaoConhecida: 0, motivoId: "m1", justificativa: "  ",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.httpStatus).toBe(422);
  });

  test("arquivar com motivo e justificativa grava tramitacao publica com o motivo", async () => {
    const b = bancoFalso({ status: "EM_TRIAGEM" });
    const r = await transitar(b.tx, {
      ...base, destino: "ARQUIVADA", perfil: "TRIAGEM", versaoConhecida: 0,
      motivoId: "m1", justificativa: "Matéria de competência estadual.",
    });
    expect(r.ok).toBe(true);
    expect(b.tramitacoes[0]).toMatchObject({ motivoId: "m1", publica: true, statusNovo: "ARQUIVADA" });
    expect(b.ideia.triadoEm).toBeInstanceOf(Date);
  });

  test("aprovar na triagem marca triadoEm e publicadoEm", async () => {
    const b = bancoFalso({ status: "EM_TRIAGEM" });
    await transitar(b.tx, { ...base, destino: "DISPONIVEL", perfil: "TRIAGEM", versaoConhecida: 0 });
    expect(b.ideia.triadoEm).toBeInstanceOf(Date);
    expect(b.ideia.publicadoEm).toBeInstanceOf(Date);
  });

  test("gabinete sem nome nao pode assumir a analise", async () => {
    const b = bancoFalso({ status: "DISPONIVEL" });
    const r = await transitar(b.tx, { ...base, destino: "EM_ANALISE", perfil: "GABINETE", versaoConhecida: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.httpStatus).toBe(422);
  });

  test("gabinete assume e depois adota: interesse vira ADOCAO", async () => {
    const b = bancoFalso({ status: "DISPONIVEL" });
    await transitar(b.tx, {
      ...base, destino: "EM_ANALISE", perfil: "GABINETE", versaoConhecida: 0, gabinete: "Gabinete Ver. Ana",
    });
    expect(b.interesses).toEqual([{ ideiaId: "i1", gabinete: "Gabinete Ver. Ana", tipo: "ANALISE" }]);
    await transitar(b.tx, {
      ...base, destino: "ADOTADA", perfil: "GABINETE", versaoConhecida: 1, gabinete: "Gabinete Ver. Ana",
    });
    expect(b.interesses[0]?.tipo).toBe("ADOCAO");
    expect(b.tramitacoes[1]).toMatchObject({ statusNovo: "ADOTADA", gabinete: "Gabinete Ver. Ana" });
  });

  test("pulo de etapa RECEBIDA -> DISPONIVEL e recusado (422)", async () => {
    const b = bancoFalso({ status: "RECEBIDA" });
    const r = await transitar(b.tx, { ...base, destino: "DISPONIVEL", perfil: "ADMIN", versaoConhecida: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.httpStatus).toBe(422);
  });
});
