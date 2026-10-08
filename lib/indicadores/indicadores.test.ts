import { describe, expect, it } from "vitest";
import {
  calcularIndicadores,
  formatarPercentual,
  SEM_GABINETE,
  SEM_RPA,
  type IdeiaParaIndicador,
  type TramitacaoParaIndicador,
} from "./indicadores";

const d = (dia: number) => new Date(Date.UTC(2026, 0, dia));

const ideias: IdeiaParaIndicador[] = [
  { id: "a", criadoEm: d(1), status: "DISPONIVEL", tema: "Mobilidade Urbana", rpa: 1 },
  { id: "b", criadoEm: d(1), status: "ADOTADA", tema: "Mobilidade Urbana", rpa: 6 },
  { id: "c", criadoEm: d(2), status: "ARQUIVADA", tema: "Educação", rpa: null },
  { id: "e", criadoEm: d(3), status: "EM_TRIAGEM", tema: "Saúde Pública", rpa: 1 },
  { id: "f", criadoEm: d(4), status: "RECEBIDA", tema: "Educação", rpa: 3 },
];

const tramitacoes: TramitacaoParaIndicador[] = [
  { ideiaId: "a", statusAnterior: "EM_TRIAGEM", statusNovo: "DISPONIVEL", gabinete: null, criadoEm: d(5) },
  { ideiaId: "b", statusAnterior: "EM_TRIAGEM", statusNovo: "DISPONIVEL", gabinete: null, criadoEm: d(3) },
  { ideiaId: "b", statusAnterior: "EM_ANALISE", statusNovo: "ADOTADA", gabinete: "Gabinete Ver. Ana", criadoEm: d(20) },
  { ideiaId: "c", statusAnterior: "EM_TRIAGEM", statusNovo: "ARQUIVADA", gabinete: null, criadoEm: d(8) },
  // Arquivamento posterior pelo Admin nao e decisao de triagem.
  { ideiaId: "a", statusAnterior: "DISPONIVEL", statusNovo: "ARQUIVADA", gabinete: null, criadoEm: d(30) },
];

describe("calcularIndicadores", () => {
  const ind = calcularIndicadores(ideias, tramitacoes, d(31));

  it("totaliza por situacao", () => {
    expect(ind.totais).toEqual({
      recebidas: 5,
      aguardandoTriagem: 2,
      publicadas: 2,
      adotadas: 1,
      arquivadas: 1,
    });
  });

  it("tempo medio de triagem usa so a primeira decisao da Triagem", () => {
    // a: 4 dias, b: 2 dias, c: 6 dias -> 4,0
    expect(ind.tempoMedioTriagemDias).toBe(4);
  });

  it("taxas de aprovacao e de adocao", () => {
    expect(ind.taxaAprovacao).toBeCloseTo(2 / 3);
    expect(ind.taxaAdocao).toBeCloseTo(1 / 2);
    expect(formatarPercentual(ind.taxaAprovacao)).toBe("67%");
  });

  it("por tema em ordem decrescente, empate alfabetico", () => {
    expect(ind.porTema).toEqual([
      { rotulo: "Educação", quantidade: 2 },
      { rotulo: "Mobilidade Urbana", quantidade: 2 },
      { rotulo: "Saúde Pública", quantidade: 1 },
    ]);
  });

  it("por RPA em ordem fixa 1..6, com zeros e 'nao informada' no fim", () => {
    expect(ind.porRpa.map((r) => r.quantidade)).toEqual([2, 0, 1, 0, 0, 1, 1]);
    expect(ind.porRpa.at(-1)?.rotulo).toBe(SEM_RPA);
  });

  it("adocao por gabinete", () => {
    expect(ind.adocaoPorGabinete).toEqual([{ rotulo: "Gabinete Ver. Ana", quantidade: 1 }]);
  });

  it("sem dados: nada de divisao por zero", () => {
    const vazio = calcularIndicadores([], []);
    expect(vazio.tempoMedioTriagemDias).toBeNull();
    expect(vazio.taxaAprovacao).toBeNull();
    expect(vazio.taxaAdocao).toBeNull();
    expect(formatarPercentual(null)).toBe("—");
    expect(vazio.porRpa).toHaveLength(6);
  });

  it("adocao sem gabinete registrado vai para o rotulo generico", () => {
    const r = calcularIndicadores(
      [ideias[1]!],
      [{ ideiaId: "b", statusAnterior: "EM_ANALISE", statusNovo: "ADOTADA", gabinete: null, criadoEm: d(9) }],
    );
    expect(r.adocaoPorGabinete[0]?.rotulo).toBe(SEM_GABINETE);
  });

  it("nao expoe nenhum dado pessoal (so contagens, rotulos e taxas)", () => {
    const json = JSON.stringify(ind);
    expect(json).not.toMatch(/documento|email|telefone|ip|"nome"/i);
  });
});
