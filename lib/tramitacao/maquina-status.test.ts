import { describe, expect, test } from "vitest";
import { StatusIdeia } from "@/prisma/gen/client";
import { ehStatusPublico, validarTransicao } from "./maquina-status";

describe("validarTransicao - grafo", () => {
  test("RECEBIDA -> EM_TRIAGEM pela Triagem e permitido", () => {
    expect(
      validarTransicao({
        de: "RECEBIDA",
        para: "EM_TRIAGEM",
        perfil: "TRIAGEM",
      }).ok,
    ).toBe(true);
  });

  test("pulo de etapa RECEBIDA -> ADOTADA retorna 422", () => {
    const r = validarTransicao({
      de: "RECEBIDA",
      para: "ADOTADA",
      perfil: "ADMIN",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.httpStatus).toBe(422);
  });

  test("DISPONIVEL -> ADOTADA (sem passar por EM_ANALISE) retorna 422", () => {
    const r = validarTransicao({
      de: "DISPONIVEL",
      para: "ADOTADA",
      perfil: "GABINETE",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.httpStatus).toBe(422);
  });

  test("ARQUIVADA e estado final", () => {
    const r = validarTransicao({
      de: "ARQUIVADA",
      para: "DISPONIVEL",
      perfil: "ADMIN",
    });
    expect(r.ok).toBe(false);
  });
});

describe("validarTransicao - autorizacao por perfil", () => {
  test("GABINETE nao pode triar (403)", () => {
    const r = validarTransicao({
      de: "EM_TRIAGEM",
      para: "DISPONIVEL",
      perfil: "GABINETE",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.httpStatus).toBe(403);
  });

  test("TRIAGEM nao pode adotar (403)", () => {
    const r = validarTransicao({
      de: "EM_ANALISE",
      para: "ADOTADA",
      perfil: "TRIAGEM",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.httpStatus).toBe(403);
  });
});

describe("validarTransicao - arquivar fora da triagem e so da administracao", () => {
  test("GABINETE nao arquiva ideia DISPONIVEL (403)", () => {
    const r = validarTransicao({ de: "DISPONIVEL", para: "ARQUIVADA", perfil: "GABINETE", justificativa: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.httpStatus).toBe(403);
  });

  test("GABINETE nao arquiva ideia EM_ANALISE (403)", () => {
    const r = validarTransicao({ de: "EM_ANALISE", para: "ARQUIVADA", perfil: "GABINETE", justificativa: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.httpStatus).toBe(403);
  });

  test("ADMIN arquiva ideia DISPONIVEL com justificativa", () => {
    expect(
      validarTransicao({ de: "DISPONIVEL", para: "ARQUIVADA", perfil: "ADMIN", justificativa: "Conteúdo ofensivo." }).ok,
    ).toBe(true);
  });

  test("TRIAGEM arquiva durante a triagem", () => {
    expect(
      validarTransicao({ de: "EM_TRIAGEM", para: "ARQUIVADA", perfil: "TRIAGEM", justificativa: "Fora do escopo." }).ok,
    ).toBe(true);
  });

  test("GABINETE continua podendo assumir, adotar e devolver", () => {
    expect(validarTransicao({ de: "DISPONIVEL", para: "EM_ANALISE", perfil: "GABINETE" }).ok).toBe(true);
    expect(validarTransicao({ de: "EM_ANALISE", para: "ADOTADA", perfil: "GABINETE" }).ok).toBe(true);
    expect(validarTransicao({ de: "EM_ANALISE", para: "DISPONIVEL", perfil: "GABINETE" }).ok).toBe(true);
  });
});

describe("validarTransicao - justificativa de arquivamento", () => {
  test("arquivar sem justificativa retorna 422", () => {
    const r = validarTransicao({
      de: "EM_TRIAGEM",
      para: "ARQUIVADA",
      perfil: "TRIAGEM",
      justificativa: "   ",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.httpStatus).toBe(422);
  });

  test("arquivar com justificativa e permitido", () => {
    expect(
      validarTransicao({
        de: "EM_TRIAGEM",
        para: "ARQUIVADA",
        perfil: "TRIAGEM",
        justificativa: "Materia de competencia estadual.",
      }).ok,
    ).toBe(true);
  });
});

describe("ehStatusPublico", () => {
  test("DISPONIVEL, EM_ANALISE e ADOTADA sao publicos", () => {
    for (const s of ["DISPONIVEL", "EM_ANALISE", "ADOTADA"] as StatusIdeia[]) {
      expect(ehStatusPublico(s)).toBe(true);
    }
  });
  test("RECEBIDA, EM_TRIAGEM e ARQUIVADA NAO sao publicos", () => {
    for (const s of ["RECEBIDA", "EM_TRIAGEM", "ARQUIVADA"] as StatusIdeia[]) {
      expect(ehStatusPublico(s)).toBe(false);
    }
  });
});
