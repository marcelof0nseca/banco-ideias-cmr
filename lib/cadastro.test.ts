import { beforeAll, describe, expect, it } from "vitest";
import {
  assinarInicio,
  conferirInicio,
  errosPorCampo,
  esquemaCadastro,
  gerarToken,
  hashToken,
  VERSAO_AVISO,
} from "./cadastro";

beforeAll(() => {
  process.env.DOCUMENTO_PEPPER ??= "pepper-de-teste";
});

const valido = {
  temaId: "tema1",
  titulo: "Ecopontos nos bairros",
  descricao: "Criar ecopontos em todos os bairros para descarte correto de entulho.",
  bairro: "",
  rpa: "",
  tipoAutor: "FISICA",
  documento: "529.982.247-25",
  nome: "Maria da Silva",
  email: "  Maria@Exemplo.com ",
  telefone: "",
  cienciaTratamento: true,
  autorizaNomePublico: false,
  versaoAviso: VERSAO_AVISO,
};

describe("esquemaCadastro", () => {
  it("aceita um cadastro valido e normaliza opcionais", () => {
    const r = esquemaCadastro.parse(valido);
    expect(r.email).toBe("maria@exemplo.com");
    expect(r.bairro).toBeNull();
    expect(r.rpa).toBeNull();
    expect(r.telefone).toBeNull();
  });

  it("aceita RPA de 1 a 6 e recusa fora disso", () => {
    expect(esquemaCadastro.parse({ ...valido, rpa: "3" }).rpa).toBe(3);
    expect(esquemaCadastro.safeParse({ ...valido, rpa: "7" }).success).toBe(false);
  });

  it("CPF com digito verificador invalido gera erro NO CAMPO documento (aceite 9)", () => {
    const r = esquemaCadastro.safeParse({ ...valido, documento: "529.982.247-24" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(errosPorCampo(r.error).documento).toBe(
        "CPF inválido. Confira os números digitados.",
      );
    }
  });

  it("valida CNPJ quando o autor e pessoa juridica", () => {
    const r = esquemaCadastro.safeParse({ ...valido, tipoAutor: "JURIDICA" });
    expect(r.success).toBe(false);
    if (!r.success) expect(errosPorCampo(r.error).documento).toMatch(/CNPJ/);
    expect(
      esquemaCadastro.safeParse({
        ...valido,
        tipoAutor: "JURIDICA",
        documento: "11.222.333/0001-81",
      }).success,
    ).toBe(true);
  });

  it("ciencia do tratamento e obrigatoria; divulgacao do nome nao", () => {
    const r = esquemaCadastro.safeParse({ ...valido, cienciaTratamento: false });
    expect(r.success).toBe(false);
    if (!r.success) expect(errosPorCampo(r.error).cienciaTratamento).toBeDefined();
  });

  it("respeita limites de titulo e descricao", () => {
    const erros = (dados: object) => {
      const r = esquemaCadastro.safeParse({ ...valido, ...dados });
      return r.success ? {} : errosPorCampo(r.error);
    };
    expect(erros({ titulo: "x".repeat(151) }).titulo).toBeDefined();
    expect(erros({ descricao: "curta" }).descricao).toBeDefined();
    expect(erros({ descricao: "x".repeat(5001) }).descricao).toBeDefined();
  });
});

describe("tempo minimo de preenchimento", () => {
  it("recusa envio rapido demais, aceita depois e expira", () => {
    const t0 = 1_000_000;
    const v = assinarInicio(t0);
    expect(conferirInicio(v, t0 + 1_000)).toBe("rapido");
    expect(conferirInicio(v, t0 + 60_000)).toBe("ok");
    expect(conferirInicio(v, t0 + 25 * 3600_000)).toBe("expirado");
  });

  it("recusa valor adulterado ou ausente", () => {
    const v = assinarInicio(1_000_000);
    const adulterado = v.replace(/^\d+/, "1");
    expect(conferirInicio(adulterado, 2_000_000)).toBe("invalido");
    expect(conferirInicio("", 2_000_000)).toBe("invalido");
    expect(conferirInicio(null)).toBe("invalido");
  });
});

describe("token de acompanhamento", () => {
  it("tem formato legivel e hash insensivel a caixa e hifens", () => {
    const t = gerarToken();
    expect(t).toMatch(/^[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}$/);
    expect(t).not.toMatch(/[01OIL]/);
    expect(hashToken(t.toLowerCase().replaceAll("-", " "))).toBe(hashToken(t));
  });
});
