import { describe, expect, test } from "vitest";
import { codigoDaFalha, mensagemErro, mensagemOk } from "./retorno";

describe("retorno das acoes pela URL", () => {
  test("codigo conhecido vira mensagem; desconhecido vira null", () => {
    expect(mensagemOk("aprovada")).toContain("publicada");
    expect(mensagemOk("<script>")).toBeNull();
    expect(mensagemErro("conflito")).toContain("outra pessoa");
    expect(mensagemErro("qualquer-coisa")).toBeNull();
    expect(mensagemErro(undefined)).toBeNull();
  });

  test("falhas de dominio viram o codigo certo", () => {
    expect(codigoDaFalha({ httpStatus: 409, motivo: "x" })).toBe("conflito");
    expect(codigoDaFalha({ httpStatus: 403, motivo: "x" })).toBe("permissao");
    expect(codigoDaFalha({ httpStatus: 422, motivo: "Escolha o motivo do arquivamento." })).toBe("motivo");
    expect(codigoDaFalha({ httpStatus: 422, motivo: "Arquivamento exige justificativa" })).toBe("justificativa");
    expect(codigoDaFalha({ httpStatus: 422, motivo: "Transição não permitida: A -> B" })).toBe("situacao");
    expect(codigoDaFalha({ httpStatus: 422, motivo: "Informe o gabinete ou a comissão responsável." })).toBe("gabinete");
  });
});
