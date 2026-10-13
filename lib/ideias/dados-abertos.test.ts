import { describe, expect, test } from "vitest";
import { paraCsv, type IdeiaAberta } from "./dados-abertos";

const base: IdeiaAberta = {
  protocolo: "BIL-2026-000001",
  titulo: "Hortas; nas escolas",
  descricao: 'Texto com "aspas"',
  tema: "Meio Ambiente",
  situacao: "Disponível",
  bairro: "Várzea",
  rpa: 4,
  regiao: "RPA 4 — Oeste",
  apoios: 23,
  publicadaEm: "2026-09-09",
  gabinetesInteressados: [],
  adotadaPor: null,
  url: "https://exemplo/consulta/BIL-2026-000001",
};

describe("dados abertos em CSV", () => {
  test("cabecalho sem nenhum campo de dado pessoal", () => {
    const cabecalho = paraCsv([]).replace("﻿", "").split("\r\n")[0]!;
    for (const proibido of ["autor", "nome", "cpf", "cnpj", "documento", "email", "telefone", "ip"]) {
      expect(cabecalho.split(";")).not.toContain(proibido);
    }
  });

  test("escapa ponto-e-virgula e aspas", () => {
    const linha = paraCsv([base]).split("\r\n")[1]!;
    expect(linha).toContain('"Hortas; nas escolas"');
    expect(linha).toContain('"Texto com ""aspas"""');
  });

  test("neutraliza injecao de formula do Excel", () => {
    const linha = paraCsv([{ ...base, titulo: "=HYPERLINK(\"http://mal\")" }]).split("\r\n")[1]!;
    expect(linha).toContain("'=HYPERLINK");
  });

  test("comeca com BOM para o Excel reconhecer UTF-8", () => {
    expect(paraCsv([]).startsWith("﻿")).toBe(true);
  });
});
