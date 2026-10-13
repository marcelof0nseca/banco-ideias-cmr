import { describe, expect, test } from "vitest";
import { gerarNonce, politicaCsp } from "./csp";

describe("CSP", () => {
  const prod = politicaCsp("abc123", { desenvolvimento: false });
  const dev = politicaCsp("abc123", { desenvolvimento: true });
  const diretiva = (csp: string, nome: string) => csp.split("; ").find((d) => d.startsWith(`${nome} `)) ?? "";

  test("scripts so com nonce + strict-dynamic, nunca unsafe-inline", () => {
    const script = diretiva(prod, "script-src");
    expect(script).toContain("'nonce-abc123'");
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain("'unsafe-inline'");
  });

  test("unsafe-eval so em desenvolvimento", () => {
    expect(diretiva(prod, "script-src")).not.toContain("'unsafe-eval'");
    expect(diretiva(dev, "script-src")).toContain("'unsafe-eval'");
  });

  test("bloqueia iframe de terceiros, plugins e troca de base", () => {
    expect(prod).toContain("frame-ancestors 'none'");
    expect(prod).toContain("object-src 'none'");
    expect(prod).toContain("base-uri 'self'");
    expect(prod).toContain("form-action 'self'");
  });

  test("a unica origem externa e o VLibras (site oficial + repositorio oficial no jsDelivr)", () => {
    const externas = prod.match(/https:\/\/[^\s;]+/g) ?? [];
    expect(externas.length).toBeGreaterThan(0);
    for (const url of externas) {
      expect(url).toMatch(/(vlibras\.gov\.br|cdn\.jsdelivr\.net\/gh\/spbgovbr-vlibras\/)$/);
    }
    // nunca o CDN inteiro
    expect(prod).not.toMatch(/https:\/\/cdn\.jsdelivr\.net[ ;]/);
  });

  test("upgrade-insecure-requests so em producao (quebraria o localhost)", () => {
    expect(prod).toContain("upgrade-insecure-requests");
    expect(dev).not.toContain("upgrade-insecure-requests");
  });

  test("nonce muda a cada requisicao", () => {
    expect(gerarNonce()).not.toBe(gerarNonce());
  });
});
