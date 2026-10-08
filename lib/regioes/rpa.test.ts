import { describe, expect, it } from "vitest";
import { BAIRROS_POR_RPA, NUMEROS_RPA, TODOS_BAIRROS, rpaDoBairro } from "./rpa";

describe("bairros por RPA", () => {
  it("tem os 94 bairros oficiais, sem repeticao", () => {
    expect(TODOS_BAIRROS).toHaveLength(94);
    expect(new Set(TODOS_BAIRROS).size).toBe(94);
  });

  it("toda RPA tem bairros", () => {
    for (const rpa of NUMEROS_RPA) expect(BAIRROS_POR_RPA[rpa].length).toBeGreaterThan(0);
  });

  it.each([
    ["Boa Viagem", 6],
    ["boa viagem", 6],
    ["  VARZEA ", 4],
    ["sao jose", 1],
    ["Pau Ferro", 3],
    ["Água Fria", 2],
    ["jiquia", 5],
  ])("rpaDoBairro(%j) = %i", (bairro, rpa) => {
    expect(rpaDoBairro(bairro)).toBe(rpa);
  });

  it("bairro desconhecido devolve null", () => {
    expect(rpaDoBairro("Copacabana")).toBeNull();
    expect(rpaDoBairro("")).toBeNull();
  });
});
