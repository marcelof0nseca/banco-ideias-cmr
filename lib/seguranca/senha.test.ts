import { describe, expect, test } from "vitest";
import { SENHA_MINIMA, hashSenha, senhaForte, verificarSenha } from "./senha";

describe("politica de senha", () => {
  test("exige o minimo de caracteres", () => {
    expect(senhaForte("a".repeat(SENHA_MINIMA))).toBe(true);
    expect(senhaForte("a".repeat(SENHA_MINIMA - 1))).toBe(false);
    expect(senhaForte("")).toBe(false);
  });
});

describe("hash argon2id", () => {
  test("verifica a senha correta e rejeita a errada", async () => {
    const h = await hashSenha("banco-ideias-2026");
    expect(await verificarSenha(h, "banco-ideias-2026")).toBe(true);
    expect(await verificarSenha(h, "senha-errada-1234")).toBe(false);
  });

  test("usa argon2id", async () => {
    const h = await hashSenha("banco-ideias-2026");
    expect(h.startsWith("$argon2id$")).toBe(true);
  });

  test("hash invalido nao lanca, retorna false", async () => {
    expect(await verificarSenha("nao-e-hash", "qualquer")).toBe(false);
  });
});
