import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StatusIdeia } from "@/prisma/gen/client";
import { Alerta } from "./Alerta";
import { CampoTexto } from "./Campo";
import { SeloStatus } from "./SeloStatus";
import { APARENCIA_STATUS } from "./status";
import { Tabela } from "./Tabela";

describe("SeloStatus", () => {
  it("toda situacao tem texto e forma propria (nunca so cor)", () => {
    const formas = new Set<string>();
    for (const status of Object.values(StatusIdeia)) {
      const html = renderToStaticMarkup(<SeloStatus status={status} />);
      expect(html).toContain(APARENCIA_STATUS[status].rotulo);
      expect(html).toContain('aria-hidden="true"');
      formas.add(APARENCIA_STATUS[status].forma);
    }
    expect(formas.size).toBe(Object.values(StatusIdeia).length);
  });
});

describe("CampoTexto", () => {
  it("associa label, dica e erro ao controle", () => {
    const html = renderToStaticMarkup(
      <CampoTexto
        id="cpf"
        rotulo="CPF"
        dica="Somente números"
        erro="CPF inválido"
        obrigatorio
      />,
    );
    expect(html).toContain('for="cpf"');
    expect(html).toContain('aria-describedby="cpf-dica cpf-erro"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toMatch(/id="cpf-erro" aria-live="polite"[^>]*>CPF inválido</);
    // instrucao antes do controle
    expect(html.indexOf("cpf-dica")).toBeLessThan(html.indexOf("<input"));
  });

  it("sem erro, nao marca invalido mas mantem a regiao viva", () => {
    const html = renderToStaticMarkup(<CampoTexto id="nome" rotulo="Nome" />);
    expect(html).not.toContain("aria-invalid=");
    expect(html).not.toContain("aria-describedby=");
    expect(html).toContain('id="nome-erro" aria-live="polite"');
  });
});

describe("Alerta", () => {
  it("erro e anunciado como alert; demais como status", () => {
    expect(renderToStaticMarkup(<Alerta tipo="erro">x</Alerta>)).toContain('role="alert"');
    expect(renderToStaticMarkup(<Alerta>x</Alerta>)).toContain('role="status"');
  });
});

describe("Tabela", () => {
  it("tem caption e cabecalhos com scope", () => {
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
  });
});
