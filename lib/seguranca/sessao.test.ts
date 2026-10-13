import { beforeAll, describe, expect, test } from "vitest";
import { ABSOLUTO_MS, INATIVIDADE_MS, assinarSessao, verificarSessao } from "./sessao";

beforeAll(() => {
  process.env.AUTH_SECRET = "segredo-de-teste-com-mais-de-32-bytes-aqui!!";
});

const base = {
  usuarioId: "u1",
  perfil: "TRIAGEM" as const,
  nome: "Servidor",
  gabinete: null,
};

describe("assinar/verificar sessao", () => {
  test("ida e volta preserva os dados", async () => {
    const token = await assinarSessao(base);
    const s = await verificarSessao(token);
    expect(s?.usuarioId).toBe("u1");
    expect(s?.perfil).toBe("TRIAGEM");
    expect(s?.nome).toBe("Servidor");
  });

  test("token adulterado e rejeitado", async () => {
    const token = await assinarSessao(base);
    const adulterado = token.slice(0, -3) + "aaa";
    expect(await verificarSessao(adulterado)).toBeNull();
  });

  test("token vazio ou nulo retorna null", async () => {
    expect(await verificarSessao(null)).toBeNull();
    expect(await verificarSessao("")).toBeNull();
    expect(await verificarSessao("nao-e-um-jwt")).toBeNull();
  });

  test("inatividade: token alem de 30 min e invalido", async () => {
    const agora = Date.now();
    const token = await assinarSessao(base, agora);
    // valido logo depois, invalido passados 31 min
    expect(await verificarSessao(token, agora + 60_000)).not.toBeNull();
    expect(await verificarSessao(token, agora + INATIVIDADE_MS + 60_000)).toBeNull();
  });

  test("prazo absoluto: alem de 8 h e invalido mesmo renovando", async () => {
    const agora = Date.now();
    const absoluto = agora + ABSOLUTO_MS;
    // renovacao deslizante no minuto 59 mantem o mesmo absoluto
    const renovado = await assinarSessao({ ...base, absoluto }, agora + 59 * 60_000);
    // logo apos a renovacao, ainda vale
    expect(await verificarSessao(renovado, agora + 59 * 60_000 + 1_000)).not.toBeNull();
    // passado o absoluto (8 h), invalida
    expect(await verificarSessao(renovado, absoluto + 1_000)).toBeNull();
  });
});
