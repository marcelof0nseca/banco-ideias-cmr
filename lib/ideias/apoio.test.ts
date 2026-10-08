import { describe, expect, it } from "vitest";
import { apoiarIdeia, documentoDeApoioValido } from "./apoio";
import { assinarInicio } from "./cadastro";
import { resumir, STATUS_ACEITAM_APOIO } from "./consulta";

// No topo, e nao em beforeAll: assinarInicio() roda ao montar os describe,
// antes de qualquer hook. Sem isso o teste so passa onde existe .env (nao na CI).
process.env.DOCUMENTO_PEPPER ??= "pepper-de-teste";

describe("documentoDeApoioValido", () => {
  it("aceita CPF e CNPJ validos, com ou sem pontuacao", () => {
    expect(documentoDeApoioValido("529.982.247-25")).toBe(true);
    expect(documentoDeApoioValido("11.222.333/0001-81")).toBe(true);
  });
  it("recusa digito verificador errado e tamanhos estranhos", () => {
    expect(documentoDeApoioValido("529.982.247-24")).toBe(false);
    expect(documentoDeApoioValido("11222333000182")).toBe(false);
    expect(documentoDeApoioValido("123")).toBe(false);
    expect(documentoDeApoioValido("")).toBe(false);
  });
});

describe("apoiarIdeia: defesas antes de tocar no banco", () => {
  const base = {
    protocolo: "BIL-2026-000002",
    documento: "52998224725",
    iniciadoEm: assinarInicio(Date.now() - 60_000),
    armadilha: "",
    ip: null,
  };

  it("campo-armadilha preenchido e recusado", async () => {
    expect(await apoiarIdeia({ ...base, armadilha: "x" })).toMatchObject({ ok: false, httpStatus: 400 });
  });

  it("envio rapido demais e recusado", async () => {
    expect(await apoiarIdeia({ ...base, iniciadoEm: assinarInicio() })).toMatchObject({
      ok: false,
      httpStatus: 422,
    });
  });

  it("CPF invalido gera erro no campo documento", async () => {
    expect(await apoiarIdeia({ ...base, documento: "52998224724" })).toMatchObject({
      ok: false,
      httpStatus: 422,
      campo: "documento",
    });
  });
});

describe("regras de exibicao publica", () => {
  it("so ideias disponiveis ou em analise recebem apoio", () => {
    expect(STATUS_ACEITAM_APOIO).toEqual(["DISPONIVEL", "EM_ANALISE"]);
  });

  it("resumo corta em palavra inteira e marca reticencias", () => {
    const texto = "palavra ".repeat(60);
    const r = resumir(texto, 30);
    expect(r.length).toBeLessThanOrEqual(31);
    expect(r.endsWith("palavra…")).toBe(true);
    expect(resumir("curto")).toBe("curto");
  });
});
