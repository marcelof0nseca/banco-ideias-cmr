import { beforeEach, describe, expect, test } from "vitest";
import { verificarLimite, zerarLimites } from "./limite";

beforeEach(() => {
  zerarLimites();
  delete process.env.LIMITE_CADASTRO_POR_IP_HORA;
  delete process.env.LIMITE_IDEIAS_POR_DOCUMENTO_DIA;
});

describe("limite de taxa", () => {
  test("cadastro: 5 por IP por hora, a 6a e bloqueada", async () => {
    const agora = Date.now();
    for (let i = 0; i < 5; i++) {
      expect((await verificarLimite({ acao: "cadastro", ipHash: "ip1" }, agora + i)).permitido).toBe(true);
    }
    const sexta = await verificarLimite({ acao: "cadastro", ipHash: "ip1" }, agora + 10);
    expect(sexta.permitido).toBe(false);
    expect(sexta.tentarEmSegundos).toBeGreaterThan(0);
  });

  test("janela desliza: depois de 1 h libera de novo", async () => {
    const agora = Date.now();
    for (let i = 0; i < 5; i++) await verificarLimite({ acao: "cadastro", ipHash: "ip1" }, agora);
    const depois = await verificarLimite({ acao: "cadastro", ipHash: "ip1" }, agora + 60 * 60 * 1000 + 1);
    expect(depois.permitido).toBe(true);
  });

  test("cadastro: 3 ideias por documento por dia", async () => {
    const agora = Date.now();
    for (let i = 0; i < 3; i++) {
      expect((await verificarLimite({ acao: "cadastro", documentoHash: "d1" }, agora)).permitido).toBe(true);
    }
    expect((await verificarLimite({ acao: "cadastro", documentoHash: "d1" }, agora)).permitido).toBe(false);
  });

  test("chaves diferentes nao se misturam", async () => {
    const agora = Date.now();
    for (let i = 0; i < 5; i++) await verificarLimite({ acao: "cadastro", ipHash: "ip1" }, agora);
    expect((await verificarLimite({ acao: "cadastro", ipHash: "ip2" }, agora)).permitido).toBe(true);
    expect((await verificarLimite({ acao: "apoio", ipHash: "ip1" }, agora)).permitido).toBe(true);
  });

  test("respeita o valor do .env", async () => {
    process.env.LIMITE_CADASTRO_POR_IP_HORA = "2";
    const agora = Date.now();
    await verificarLimite({ acao: "cadastro", ipHash: "ip9" }, agora);
    await verificarLimite({ acao: "cadastro", ipHash: "ip9" }, agora);
    expect((await verificarLimite({ acao: "cadastro", ipHash: "ip9" }, agora)).permitido).toBe(false);
  });

  test("acompanhar: anti-varredura com 10 tentativas por IP", async () => {
    const agora = Date.now();
    for (let i = 0; i < 10; i++) await verificarLimite({ acao: "acompanhar", ipHash: "ipx" }, agora);
    expect((await verificarLimite({ acao: "acompanhar", ipHash: "ipx" }, agora)).permitido).toBe(false);
  });
});
