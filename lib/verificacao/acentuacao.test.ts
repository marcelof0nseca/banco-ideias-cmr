import { describe, expect, it } from "vitest";
import { verificarFonte, verificarProjeto } from "./acentuacao";

/**
 * Todo texto que chega ao cidadao precisa estar com a acentuacao correta
 * (eMAG / linguagem simples; leitores de tela pronunciam errado "Camara").
 */

const RAIZ = process.cwd();

/** Onde mora texto visivel: telas, componentes, regras com mensagens e seed. */
const ALVOS = ["app", "components", "lib", "types", "prisma/seed.ts"];

describe("acentuacao do texto visivel", () => {
  it("nenhuma tela, componente, mensagem ou dado de exemplo tem palavra sem acento", () => {
    const ocorrencias = verificarProjeto(RAIZ, ALVOS);
    const relatorio = ocorrencias.map(
      (o) => `${o.arquivo}:${o.linha}  "${o.palavra}" -> "${o.sugestao}"  (${o.trecho})`,
    );
    expect(relatorio, `Palavras sem acento:\n${relatorio.join("\n")}`).toEqual([]);
  });
});

describe("verificador de acentuacao", () => {
  const achar = (fonte: string) => verificarFonte("x.tsx", fonte).map((o) => o.palavra);

  it("acha palavra sem acento em texto JSX, atributo visivel e string", () => {
    expect(achar(`const a = <p>Consulta publica</p>;`)).toEqual(["publica"]);
    expect(achar(`const a = <Campo rotulo="Titulo da ideia" />;`)).toEqual(["Titulo"]);
    expect(achar(`const t = ["Saude Publica"];`)).toEqual(["Saude", "Publica"]);
    expect(achar("const m = `Ate ${n} dias`;")).toEqual(["Ate"]);
  });

  it("aceita o texto acentuado", () => {
    expect(achar(`const a = <p>Consulta pública na Câmara</p>;`)).toEqual([]);
  });

  it("ignora comentarios, identificadores, classes CSS, imports e erros internos", () => {
    const fonte = `
      // Camara publica: comentario de codigo fica sem acento de proposito.
      import { x } from "./descricao";
      const campos = ["titulo", "descricao"];
      const a = <input id="titulo" name="descricao" className="text-publica" />;
      if (tipo === "Nao") {}
      throw new Error("contador nao retornou valor");
      console.log("Seed concluido");
      const o = { "descricao": 1 };
      const sql = tx.$queryRaw\`UPDATE contador SET ultimo = ultimo + 1\`;
      const dica = "Ex.: voce@exemplo.com ou https://camara.exemplo/publica";
    `;
    expect(achar(fonte)).toEqual([]);
  });
});
