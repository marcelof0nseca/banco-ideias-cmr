import { beforeEach, describe, expect, test } from "vitest";
import { diasUteisEntre, prazoTriagem } from "./prazo";

beforeEach(() => {
  delete process.env.TRIAGEM_SLA_DIAS_UTEIS;
});

// 2026-10-05 e uma segunda-feira.
const seg = new Date(2026, 9, 5, 10);
const dia = (n: number) => new Date(2026, 9, 5 + n, 10);

describe("diasUteisEntre", () => {
  test("segunda a sexta da mesma semana = 4 dias uteis", () => {
    expect(diasUteisEntre(seg, dia(4))).toBe(4);
  });
  test("fim de semana nao conta", () => {
    // segunda -> segunda seguinte = 5 dias uteis
    expect(diasUteisEntre(seg, dia(7))).toBe(5);
  });
  test("mesma data = 0", () => {
    expect(diasUteisEntre(seg, seg)).toBe(0);
  });
});

describe("prazoTriagem", () => {
  test("recem-recebida esta no prazo", () => {
    const p = prazoTriagem(seg, dia(1));
    expect(p.situacao).toBe("no-prazo");
    expect(p.restantes).toBe(14);
    expect(p.texto).toBe("14 dias úteis restantes");
  });
  test("faltando 3 dias uteis fica 'perto'", () => {
    // 12 dias uteis = 2 semanas + 2 dias
    const p = prazoTriagem(seg, dia(16));
    expect(p.restantes).toBe(3);
    expect(p.situacao).toBe("perto");
  });
  test("passou de 15 dias uteis = vencido", () => {
    const p = prazoTriagem(seg, dia(28)); // 20 dias uteis
    expect(p.situacao).toBe("vencido");
    expect(p.texto).toBe("Vencido há 5 dias úteis");
  });
  test("respeita TRIAGEM_SLA_DIAS_UTEIS", () => {
    process.env.TRIAGEM_SLA_DIAS_UTEIS = "5";
    expect(prazoTriagem(seg, dia(7)).texto).toBe("Vence hoje");
  });
});
