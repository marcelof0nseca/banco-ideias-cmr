import { describe, expect, test } from "vitest";
import { mesmaOrigem } from "./origem";

const req = (headers: Record<string, string>) => new Request("http://localhost:3000/api/x", { method: "POST", headers });

describe("mesmaOrigem (CSRF)", () => {
  test("aceita a propria origem", () => {
    expect(mesmaOrigem(req({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBe(true);
  });
  test("recusa outro site", () => {
    expect(mesmaOrigem(req({ origin: "https://site-malicioso.com", host: "localhost:3000" }))).toBe(false);
  });
  test("respeita o host repassado pelo proxy", () => {
    expect(
      mesmaOrigem(req({ origin: "https://bancodeideias.recife.pe.leg.br", host: "127.0.0.1:3000", "x-forwarded-host": "bancodeideias.recife.pe.leg.br" })),
    ).toBe(true);
  });
  test("origin invalida e recusada", () => {
    expect(mesmaOrigem(req({ origin: "nao-e-url", host: "localhost:3000" }))).toBe(false);
  });
});
