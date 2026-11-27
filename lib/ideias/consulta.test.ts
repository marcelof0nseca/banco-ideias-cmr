import { describe, expect, it } from "vitest";
import { condicaoConsulta, hrefConsulta, lerFiltrosConsulta, paginasVisiveis, temFiltro } from "./consulta";

describe("lerFiltrosConsulta", () => {
  it("sem parametros: sem filtro, pagina 1", () => {
    const f = lerFiltrosConsulta({});
    expect(f).toEqual({ busca: "", temaId: null, situacao: null, pagina: 1 });
    expect(temFiltro(f)).toBe(false);
  });

  it("limpa espacos e corta a busca longa", () => {
    expect(lerFiltrosConsulta({ busca: "  praça   do  bairro " }).busca).toBe("praça do bairro");
    expect(lerFiltrosConsulta({ busca: "a".repeat(500) }).busca).toHaveLength(100);
  });

  it("so aceita situacao publica (nunca expoe triagem ou arquivada)", () => {
    expect(lerFiltrosConsulta({ situacao: "EM_ANALISE" }).situacao).toBe("EM_ANALISE");
    expect(lerFiltrosConsulta({ situacao: "EM_TRIAGEM" }).situacao).toBeNull();
    expect(lerFiltrosConsulta({ situacao: "ARQUIVADA" }).situacao).toBeNull();
    expect(lerFiltrosConsulta({ situacao: "qualquer" }).situacao).toBeNull();
  });

  it("pagina invalida vira 1", () => {
    expect(lerFiltrosConsulta({ pagina: "3" }).pagina).toBe(3);
    for (const p of ["0", "-2", "abc", ""]) expect(lerFiltrosConsulta({ pagina: p }).pagina).toBe(1);
  });

  it("tema com caractere estranho e ignorado; parametro repetido usa o primeiro", () => {
    expect(lerFiltrosConsulta({ tema: "clx123abc" }).temaId).toBe("clx123abc");
    expect(lerFiltrosConsulta({ tema: "x' OR 1=1" }).temaId).toBeNull();
    expect(lerFiltrosConsulta({ busca: ["um", "dois"] }).busca).toBe("um");
  });
});

describe("hrefConsulta", () => {
  it("omite o que esta vazio e a pagina 1", () => {
    expect(hrefConsulta(lerFiltrosConsulta({}))).toBe("/consulta");
    expect(hrefConsulta(lerFiltrosConsulta({ pagina: "4" }), 1)).toBe("/consulta");
  });
  it("mantem os filtros ao trocar de pagina", () => {
    const f = lerFiltrosConsulta({ busca: "ônibus 2", tema: "t1", situacao: "ADOTADA" });
    expect(hrefConsulta(f, 2)).toBe("/consulta?busca=%C3%B4nibus+2&tema=t1&situacao=ADOTADA&pagina=2");
  });
});

describe("condicaoConsulta", () => {
  it("sem situacao escolhida, restringe as situacoes publicas", () => {
    expect(condicaoConsulta(lerFiltrosConsulta({})).status).toEqual({
      in: ["DISPONIVEL", "EM_ANALISE", "ADOTADA"],
    });
  });
  it("busca em titulo, descricao e protocolo", () => {
    const w = condicaoConsulta(lerFiltrosConsulta({ busca: "bil-2026" }));
    expect(w.OR).toHaveLength(3);
    expect(w.OR?.[2]).toEqual({ protocolo: { contains: "BIL-2026" } });
  });
});

describe("paginasVisiveis", () => {
  it("poucas paginas: todas", () => {
    expect(paginasVisiveis(1, 3)).toEqual([1, 2, 3]);
  });
  it("muitas paginas: primeira, ultima, vizinhas e saltos", () => {
    expect(paginasVisiveis(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(paginasVisiveis(1, 10)).toEqual([1, 2, null, 10]);
    expect(paginasVisiveis(10, 10)).toEqual([1, null, 9, 10]);
  });
});
