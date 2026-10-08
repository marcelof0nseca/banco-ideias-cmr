import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GraficoBarras, larguraBarra } from "./GraficoBarras";
import { LinhaDoTempo } from "./LinhaDoTempo";

describe("GraficoBarras", () => {
  const html = renderToStaticMarkup(
    <GraficoBarras
      id="t"
      titulo="Ideias por tema"
      dados={[
        { rotulo: "Mobilidade Urbana", quantidade: 4 },
        { rotulo: "Educação", quantidade: 1 },
      ]}
      unidade={["ideia", "ideias"]}
      rotuloCategoria="Tema"
    />,
  );

  it("cada barra tem rotulo e valor em texto (cor nunca e o unico meio)", () => {
    expect(html).toContain("Mobilidade Urbana");
    expect(html).toMatch(/4<span class="sr-only"> ideias<\/span>/);
    expect(html).toMatch(/1<span class="sr-only"> ideia<\/span>/);
  });

  it("barra e decorativa, proporcional e sem estilo inline (CSP)", () => {
    expect(html).toContain("barra-100");
    expect(html).toContain("barra-25");
    expect(html).not.toContain("style=");
    expect(html).toMatch(/aria-hidden="true" class="block h-4 shrink-0/);
  });

  it("tem tabela equivalente que abre sem JS", () => {
    expect(html).toContain("<details");
    expect(html).toContain("Ver dados em tabela");
    expect(html).toContain('scope="row"');
    expect(html).toContain("4 ideias");
  });

  it("sem dados mostra mensagem em vez de grafico vazio", () => {
    const vazio = renderToStaticMarkup(
      <GraficoBarras id="v" titulo="X" dados={[]} unidade={["a", "b"]} rotuloCategoria="C" vazio="Nada ainda." />,
    );
    expect(vazio).toContain("Nada ainda.");
    expect(vazio).not.toContain("<details");
  });

  it("largura: proporcional ao maior, minimo 1% para valor positivo", () => {
    expect(larguraBarra(50, 100)).toBe(50);
    expect(larguraBarra(1, 1000)).toBe(1);
    expect(larguraBarra(0, 10)).toBe(0);
    expect(larguraBarra(3, 0)).toBe(0);
  });
});

describe("LinhaDoTempo", () => {
  const eventos = [
    { statusNovo: "RECEBIDA" as const, autoria: "Portal do cidadão", justificativa: "Ideia registrada.", em: "2026-01-02T12:00:00.000Z" },
    { statusNovo: "ARQUIVADA" as const, autoria: "Secretaria da Câmara", justificativa: "Motivo interno", em: "2026-01-05T12:00:00.000Z" },
  ];

  it("lista ordenada com situacao em texto, data e situacao atual marcada", () => {
    const html = renderToStaticMarkup(<LinhaDoTempo eventos={eventos} />);
    expect(html).toContain("<ol");
    expect(html).toContain("Recebida");
    expect(html).toContain('<time dateTime="2026-01-05T12:00:00.000Z">05 de janeiro de 2026</time>');
    expect(html).toContain("(situação atual)");
    expect(html).toContain("Motivo interno");
  });

  it("na consulta publica esconde a justificativa", () => {
    const html = renderToStaticMarkup(<LinhaDoTempo eventos={eventos} mostrarJustificativa={false} />);
    expect(html).not.toContain("Motivo interno");
  });
});
