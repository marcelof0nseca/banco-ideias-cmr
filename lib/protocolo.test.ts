import { afterAll, describe, expect, it } from "vitest";
import { ehProtocoloValido, formatarProtocolo, gerarProtocolo } from "./protocolo";

describe("formato do protocolo", () => {
  it("formata com 6 digitos e valida", () => {
    expect(formatarProtocolo(2026, 123)).toBe("BIL-2026-000123");
    expect(ehProtocoloValido("BIL-2026-000123")).toBe(true);
    expect(ehProtocoloValido(" bil-2026-000123 ")).toBe(true);
    expect(ehProtocoloValido("BIL-26-123")).toBe(false);
  });
});

/**
 * Integracao com o Postgres: so roda com DATABASE_URL (local). No CI, sem
 * banco, fica pulado. Usa anos ficticios e limpa o contador no fim.
 */
const temBanco = Boolean(process.env.DATABASE_URL);
const ANO_A = 1901;
const ANO_B = 1902;

const { prisma } = temBanco ? await import("./prisma") : ({} as never);

describe.skipIf(!temBanco)("gerarProtocolo (banco)", () => {
  afterAll(async () => {
    await prisma.contadorProtocolo.deleteMany({ where: { ano: { in: [ANO_A, ANO_B] } } });
  });

  it("e sequencial por ano e recomeca a cada ano", async () => {
    const um = await prisma.$transaction((tx) => gerarProtocolo(tx, ANO_A));
    const dois = await prisma.$transaction((tx) => gerarProtocolo(tx, ANO_A));
    const outroAno = await prisma.$transaction((tx) => gerarProtocolo(tx, ANO_B));
    expect(um).toBe(`BIL-${ANO_A}-000001`);
    expect(dois).toBe(`BIL-${ANO_A}-000002`);
    expect(outroAno).toBe(`BIL-${ANO_B}-000001`);
  });

  it("nao repete numero sob concorrencia", async () => {
    const gerados = await Promise.all(
      Array.from({ length: 15 }, () =>
        prisma.$transaction((tx) => gerarProtocolo(tx, ANO_A)),
      ),
    );
    expect(new Set(gerados).size).toBe(gerados.length);
  });

  it("transacao desfeita nao consome numero", async () => {
    const antes = await prisma.contadorProtocolo.findUnique({ where: { ano: ANO_A } });
    await expect(
      prisma.$transaction(async (tx) => {
        await gerarProtocolo(tx, ANO_A);
        throw new Error("falha simulada");
      }),
    ).rejects.toThrow("falha simulada");
    const depois = await prisma.contadorProtocolo.findUnique({ where: { ano: ANO_A } });
    expect(depois?.ultimo).toBe(antes?.ultimo);
  });
});
