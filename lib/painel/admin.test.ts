import { describe, expect, test } from "vitest";
import { codigoDoTexto } from "./admin";

describe("codigoDoTexto (codigo de motivo de arquivamento)", () => {
  test("remove acento, espaco e pontuacao", () => {
    expect(codigoDoTexto("Fora da competência do Município")).toBe("FORA_DA_COMPETENCIA_DO_MUNICIPIO");
    expect(codigoDoTexto("  Conteúdo ofensivo / discriminatório! ")).toBe("CONTEUDO_OFENSIVO_DISCRIMINATORIO");
  });
  test("texto so de simbolos vira vazio", () => {
    expect(codigoDoTexto("!!!")).toBe("");
  });
});
