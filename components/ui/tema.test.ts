import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Tema visual: contraste WCAG 2.1 AA dos tokens do globals.css e ausencia
 * de recursos externos (so o VLibras sera permitido, na Fase 6).
 */

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

/** Le "--nome: #rrggbb;" do CSS (primeira ocorrencia). */
function cor(nome: string): string {
  const m = css.match(new RegExp(`--${nome}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!m?.[1]) throw new Error(`Token --${nome} nao encontrado em hexadecimal.`);
  return m[1];
}

function luminancia(hex: string): number {
  const canais = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canais.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

describe("contraste dos tokens (WCAG 2.1 AA)", () => {
  const TEXTO = 4.5;
  const COMPONENTE = 3;

  const pares: [string, string, string, number][] = [
    ["texto comum", "foreground", "background", TEXTO],
    ["texto em cartao", "card-foreground", "card", TEXTO],
    ["texto secundario no fundo", "muted-foreground", "background", TEXTO],
    ["texto secundario no cartao", "muted-foreground", "card", TEXTO],
    ["texto secundario em area muted", "muted-foreground", "muted", TEXTO],
    ["botao principal", "primary-foreground", "primary", TEXTO],
    ["botao principal (hover)", "primary-foreground", "primary-hover", TEXTO],
    ["links no fundo", "primary", "background", TEXTO],
    ["links no cartao", "primary", "card", TEXTO],
    ["botao secundario", "secondary-foreground", "secondary", TEXTO],
    ["destaque", "accent-foreground", "accent", TEXTO],
    ["erro no cartao", "destructive", "card", TEXTO],
    ["borda de campo", "input", "card", COMPONENTE],
    ["indicador de foco no fundo", "ring", "background", COMPONENTE],
    ["indicador de foco no cartao", "ring", "card", COMPONENTE],
  ];

  it.each(pares)("%s (--%s sobre --%s) >= %s:1", (_n, frente, fundo, minimo) => {
    expect(contraste(cor(frente), cor(fundo))).toBeGreaterThanOrEqual(minimo);
  });

  const selos: [string, string][] = [
    ["cinza-selo", "cinza-fundo"],
    ["ambar-cmr", "ambar-fundo"],
    ["azul-medio", "azul-fundo"],
    ["roxo-cmr", "roxo-fundo"],
    ["verde-cmr", "verde-fundo"],
    ["vermelho-cmr", "vermelho-fundo"],
  ];

  it.each(selos)("selo de situacao --color-%s sobre --color-%s >= 4,5:1", (frente, fundo) => {
    expect(contraste(cor(`color-${frente}`), cor(`color-${fundo}`))).toBeGreaterThanOrEqual(TEXTO);
  });

  it("faixa do cabecalho: texto branco e foco ambar sobre o azul", () => {
    expect(contraste("#ffffff", cor("color-azul-cmr"))).toBeGreaterThanOrEqual(TEXTO);
    expect(contraste("#ffffff", cor("color-azul-escuro"))).toBeGreaterThanOrEqual(TEXTO);
    expect(contraste(cor("color-foco-escuro"), cor("color-azul-cmr"))).toBeGreaterThanOrEqual(
      COMPONENTE,
    );
  });

  it("calculo de contraste confere com valores de referencia", () => {
    expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contraste("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
  });
});

describe("tema claro fixo", () => {
  it("variantes dark: so com a classe .dark (nao seguem o modo escuro do sistema)", () => {
    expect(css).toMatch(/@custom-variant\s+dark\s+\(&:is\(\.dark \*\)\);/);
  });
});

describe("sem recursos externos", () => {
  function fontes(pasta: string): string[] {
    return readdirSync(pasta).flatMap((nome) => {
      const caminho = join(pasta, nome);
      if (statSync(caminho).isDirectory()) return fontes(caminho);
      return /\.(tsx?|css)$/.test(nome) && !nome.includes(".test.") ? [caminho] : [];
    });
  }

  it("nenhuma fonte do Google, CDN ou CSS remoto", () => {
    const proibidos = [/next\/font\/google/, /fonts\.googleapis/, /@import\s+url\(\s*["']?https?:/, /cdn\./i];
    const achados = [...fontes("app"), ...fontes("components")].flatMap((arq) => {
      const conteudo = readFileSync(arq, "utf8");
      return proibidos.filter((re) => re.test(conteudo)).map((re) => `${arq}: ${re}`);
    });
    expect(achados).toEqual([]);
  });
});
