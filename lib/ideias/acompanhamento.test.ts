import { beforeAll, describe, expect, it } from "vitest";
import {
  acompanharIdeia,
  autoriaDoEvento,
  credencialConfere,
  montarAcompanhamento,
  type TramitacaoLida,
} from "./acompanhamento";
import { hashToken } from "./cadastro";
import { hashDocumento } from "../seguranca/documento";

beforeAll(() => {
  process.env.DOCUMENTO_PEPPER ??= "pepper-de-teste";
});

describe("credencialConfere", () => {
  const gravado = () => ({
    documentoHash: hashDocumento("52998224725"),
    tokenAcompHash: hashToken("ABCD-EFGH-JKMN"),
  });

  it("aceita o CPF do autor com ou sem pontuacao", () => {
    expect(credencialConfere(gravado(), { documento: "529.982.247-25" })).toBe(true);
    expect(credencialConfere(gravado(), { documento: "52998224725" })).toBe(true);
  });

  it("aceita o token, sem diferenciar caixa nem hifens", () => {
    expect(credencialConfere(gravado(), { token: "abcd efgh jkmn" })).toBe(true);
  });

  it("recusa documento ou token errados e credencial vazia", () => {
    expect(credencialConfere(gravado(), { documento: "11144477735" })).toBe(false);
    expect(credencialConfere(gravado(), { token: "ABCD-EFGH-JKMP" })).toBe(false);
    expect(credencialConfere(gravado(), {})).toBe(false);
    expect(credencialConfere(gravado(), { documento: "  ", token: "" })).toBe(false);
  });
});

const t = (statusNovo: TramitacaoLida["statusNovo"], dia: number, extra: Partial<TramitacaoLida> = {}): TramitacaoLida => ({
  statusNovo,
  justificativa: null,
  gabinete: null,
  criadoEm: new Date(Date.UTC(2026, 0, dia)),
  motivo: null,
  ...extra,
});

describe("montarAcompanhamento", () => {
  it("linha do tempo em ordem cronologica, com autoria apresentavel", () => {
    const r = montarAcompanhamento({
      protocolo: "BIL-2026-000001",
      titulo: "X",
      status: "EM_ANALISE",
      tramitacoes: [
        t("EM_ANALISE", 9, { gabinete: "Gabinete Ver. Ana" }),
        t("RECEBIDA", 1),
        t("DISPONIVEL", 5),
      ],
    });
    expect(r.linhaDoTempo.map((e) => e.statusNovo)).toEqual(["RECEBIDA", "DISPONIVEL", "EM_ANALISE"]);
    expect(r.linhaDoTempo.map((e) => e.autoria)).toEqual([
      "Portal do cidadão",
      "Secretaria da Câmara",
      "Gabinete Ver. Ana",
    ]);
    expect(r.motivoArquivamento).toBeNull();
  });

  it("motivo de arquivamento so quando arquivada (visivel apenas ao autor)", () => {
    const r = montarAcompanhamento({
      protocolo: "BIL-2026-000002",
      titulo: "Y",
      status: "ARQUIVADA",
      tramitacoes: [
        t("RECEBIDA", 1),
        t("ARQUIVADA", 4, {
          motivo: { descricao: "Fora da competência do Município" },
          justificativa: "O tema é de competência estadual",
        }),
      ],
    });
    expect(r.motivoArquivamento).toBe(
      "Fora da competência do Município. O tema é de competência estadual",
    );
  });

  it("autoria nunca expoe usuario interno", () => {
    expect(autoriaDoEvento({ statusNovo: "DISPONIVEL", gabinete: null })).toBe("Secretaria da Câmara");
  });
});

describe("acompanharIdeia: validacao antes de consultar o banco", () => {
  it("protocolo fora do formato e recusado com erro no campo", async () => {
    const r = await acompanharIdeia({ protocolo: "123", documento: "52998224725", ip: null });
    expect(r).toMatchObject({ ok: false, httpStatus: 400, campo: "protocolo" });
  });

  it("sem documento e sem token, pede um dos dois", async () => {
    const r = await acompanharIdeia({ protocolo: "BIL-2026-000001", documento: "", token: " ", ip: null });
    expect(r).toMatchObject({ ok: false, httpStatus: 400, campo: "credencial" });
  });
});
