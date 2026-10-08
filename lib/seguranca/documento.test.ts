import { beforeAll, describe, expect, test } from "vitest";
import {
  cifrarDocumento,
  decifrarDocumento,
  formatarDocumento,
  hashDocumento,
  mascararDocumento,
  validarCNPJ,
  validarCPF,
} from "./documento";

// Chaves de teste (NAO sao segredos de producao).
beforeAll(() => {
  process.env.DOCUMENTO_CHAVE = Buffer.alloc(32, 7).toString("base64");
  process.env.DOCUMENTO_PEPPER = "pepper-de-teste";
});

describe("validarCPF", () => {
  test("aceita CPF valido", () => {
    expect(validarCPF("529.982.247-25")).toBe(true);
    expect(validarCPF("168.995.350-09")).toBe(true);
  });
  test("rejeita digito verificador errado (ex. do mockup)", () => {
    expect(validarCPF("111.222.333-44")).toBe(false);
  });
  test("rejeita todos os digitos iguais", () => {
    expect(validarCPF("111.111.111-11")).toBe(false);
  });
  test("rejeita tamanho incorreto", () => {
    expect(validarCPF("5299822472")).toBe(false);
  });
});

describe("validarCNPJ", () => {
  test("aceita CNPJ valido", () => {
    expect(validarCNPJ("11.222.333/0001-81")).toBe(true);
  });
  test("rejeita digito verificador errado", () => {
    expect(validarCNPJ("11.222.333/0001-80")).toBe(false);
  });
  test("rejeita todos os digitos iguais", () => {
    expect(validarCNPJ("11.111.111/1111-11")).toBe(false);
  });
});

describe("mascararDocumento", () => {
  test("CPF", () => {
    expect(mascararDocumento("52998224725", "FISICA")).toBe("529.***.***-25");
  });
  test("CNPJ", () => {
    expect(mascararDocumento("11222333000181", "JURIDICA")).toBe(
      "11.***.***/****-81",
    );
  });
});

describe("formatarDocumento", () => {
  test("CPF", () => {
    expect(formatarDocumento("52998224725", "FISICA")).toBe("529.982.247-25");
  });
  test("CNPJ", () => {
    expect(formatarDocumento("11222333000181", "JURIDICA")).toBe(
      "11.222.333/0001-81",
    );
  });
});

describe("hashDocumento", () => {
  test("e estavel para o mesmo documento", () => {
    expect(hashDocumento("529.982.247-25")).toBe(hashDocumento("52998224725"));
  });
  test("difere entre documentos diferentes", () => {
    expect(hashDocumento("52998224725")).not.toBe(hashDocumento("16899535009"));
  });
  test("nao contem o documento em claro", () => {
    expect(hashDocumento("52998224725")).not.toContain("52998224725");
  });
});

describe("cifra AES-256-GCM", () => {
  test("decifrar(cifrar(x)) == x", () => {
    const original = "52998224725";
    expect(decifrarDocumento(cifrarDocumento(original))).toBe(original);
  });
  test("o texto cifrado nao contem o documento em claro", () => {
    expect(cifrarDocumento("52998224725")).not.toContain("52998224725");
  });
  test("cada cifragem usa nonce novo (saidas diferentes)", () => {
    expect(cifrarDocumento("52998224725")).not.toBe(
      cifrarDocumento("52998224725"),
    );
  });
  test("adulteracao do texto cifrado e detectada", () => {
    const c = cifrarDocumento("52998224725");
    const partes = c.split(":");
    const adulterado = [
      partes[0],
      partes[1],
      Buffer.from("outro-conteudo").toString("base64"),
    ].join(":");
    expect(() => decifrarDocumento(adulterado)).toThrow();
  });
});
