import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StatusIdeia } from "@/prisma/gen/client";
import { exibicaoAutor } from "@/lib/ideias/publico";
import { Alerta } from "./Alerta";
import { Botao } from "./Botao";
import { CampoSelecao, CampoTexto } from "./Campo";
import { SeloStatus } from "./SeloStatus";
import { APARENCIA_STATUS } from "./status";
import { Tabela } from "./Tabela";

describe("SeloStatus", () => {
  it("toda situacao tem texto e forma propria (nunca so cor)", () => {
    const formas = new Set<string>();
    for (const status of Object.values(StatusIdeia)) {
      const html = renderToStaticMarkup(<SeloStatus status={status} />);
      expect(html).toContain(APARENCIA_STATUS[status].rotulo);
      expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
      formas.add(APARENCIA_STATUS[status].forma);
    }
    expect(formas.size).toBe(Object.values(StatusIdeia).length);
  });

  it("usa o Badge do shadcn", () => {
    expect(renderToStaticMarkup(<SeloStatus status="DISPONIVEL" />)).toContain("group/badge");
  });
});

describe("CampoTexto", () => {
  it("associa label, dica e erro ao controle (aceite 9)", () => {
    const html = renderToStaticMarkup(
      <CampoTexto id="cpf" rotulo="CPF" dica="Somente números" erro="CPF inválido" obrigatorio />,
    );
    expect(html).toContain('for="cpf"');
    expect(html).toContain('aria-describedby="cpf-dica cpf-erro"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('data-invalid="true"');
    // Erro anunciado pelo leitor de tela ao aparecer.
    expect(html).toMatch(/role="alert"[^>]*id="cpf-erro"[^>]*>CPF inválido</);
    // Instrucao antes do controle.
    expect(html.indexOf('id="cpf-dica"')).toBeLessThan(html.indexOf("<input"));
    // Obrigatorio dito em texto, nao so pelo asterisco.
    expect(html).toContain("(obrigatório)");
  });

  it("sem erro, nao marca invalido nem referencia erro inexistente", () => {
    const html = renderToStaticMarkup(<CampoTexto id="nome" rotulo="Nome" />);
    expect(html).not.toContain("aria-invalid=");
    expect(html).not.toContain("aria-describedby=");
    expect(html).not.toContain('id="nome-erro"');
  });

  it("selecao usa <select> nativo (funciona sem JS)", () => {
    const html = renderToStaticMarkup(
      <CampoSelecao id="tema" rotulo="Tema">
        <option value="a">A</option>
      </CampoSelecao>,
    );
    expect(html).toMatch(/<select[^>]*id="tema"/);
  });
});

describe("Botao", () => {
  it("e um <button> com type explicito e altura de toque confortavel", () => {
    const html = renderToStaticMarkup(<Botao>Enviar</Botao>);
    expect(html).toMatch(/^<button[^>]*type="button"/);
    expect(html).toContain("h-10");
  });
});

describe("Alerta", () => {
  it("erro e anunciado como alert; demais como status", () => {
    expect(renderToStaticMarkup(<Alerta tipo="erro">x</Alerta>)).toContain('role="alert"');
    expect(renderToStaticMarkup(<Alerta>x</Alerta>)).toContain('role="status"');
  });

  it("tem icone decorativo escondido do leitor de tela", () => {
    expect(renderToStaticMarkup(<Alerta tipo="sucesso">x</Alerta>)).toMatch(
      /<svg[^>]*aria-hidden="true"/,
    );
  });
});

describe("Tabela", () => {
  it("tem caption, cabecalhos com scope e rolagem pelo teclado", () => {
    const html = renderToStaticMarkup(
      <Tabela
        legenda="Ideias por tema"
        colunas={[
          { titulo: "Tema", celula: (l: { t: string; n: number }) => l.t, cabecalhoDaLinha: true },
          { titulo: "Quantidade", celula: (l) => l.n },
        ]}
        linhas={[{ t: "Mobilidade", n: 3 }]}
        chave={(l) => l.t}
      />,
    );
    expect(html).toContain("<caption");
    expect(html).toContain('scope="col"');
    expect(html).toContain('scope="row"');
    expect(html).toMatch(/tabindex="0" role="region" aria-label="Ideias por tema"/);
  });
});

describe("exibicaoAutor (aceite 6)", () => {
  it("sem autorizacao, o autor aparece como Cidadão(ã) do Recife", () => {
    expect(exibicaoAutor({ nome: "Maria", nomePublico: false, tipo: "FISICA" })).toBe(
      "Cidadão(ã) do Recife",
    );
    expect(exibicaoAutor({ nome: "ONG X", nomePublico: false, tipo: "JURIDICA" })).toBe(
      "Entidade do Recife",
    );
    expect(exibicaoAutor({ nome: "Maria", nomePublico: true, tipo: "FISICA" })).toBe("Maria");
  });
});
