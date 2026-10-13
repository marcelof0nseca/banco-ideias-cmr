/**
 * Prazo da triagem em dias uteis (especificacao, secao 3.3: 15 dias uteis,
 * parametrizavel por TRIAGEM_SLA_DIAS_UTEIS). DONO: Pessoa B.
 *
 * Conta segunda a sexta. Feriados nao entram ainda (a lista oficial depende
 * da Camara); quando vier, basta acrescentar a checagem em `ehDiaUtil`.
 */

export function slaDiasUteis(): number {
  const v = Number(process.env.TRIAGEM_SLA_DIAS_UTEIS);
  return Number.isFinite(v) && v > 0 ? v : 15;
}

function ehDiaUtil(d: Date): boolean {
  const dia = d.getDay();
  return dia !== 0 && dia !== 6;
}

/** Dias uteis completos entre duas datas (desde o dia seguinte a `de` ate `ate`). */
export function diasUteisEntre(de: Date, ate: Date): number {
  if (ate <= de) return 0;
  const cursor = new Date(de);
  cursor.setHours(0, 0, 0, 0);
  const fim = new Date(ate);
  fim.setHours(0, 0, 0, 0);
  let dias = 0;
  while (cursor < fim) {
    cursor.setDate(cursor.getDate() + 1);
    if (ehDiaUtil(cursor)) dias++;
  }
  return dias;
}

export type SituacaoPrazo = "no-prazo" | "perto" | "vencido";

export interface Prazo {
  usados: number;
  limite: number;
  restantes: number;
  situacao: SituacaoPrazo;
  /** Texto curto para a tela: "3 dias úteis restantes", "Vencido há 2 dias úteis". */
  texto: string;
}

/** Situacao do prazo de triagem de uma ideia recebida em `recebidaEm`. */
export function prazoTriagem(recebidaEm: Date, agora: Date = new Date()): Prazo {
  const limite = slaDiasUteis();
  const usados = diasUteisEntre(recebidaEm, agora);
  const restantes = limite - usados;

  if (restantes < 0) {
    const atraso = -restantes;
    return {
      usados, limite, restantes, situacao: "vencido",
      texto: `Vencido há ${atraso} ${atraso === 1 ? "dia útil" : "dias úteis"}`,
    };
  }
  const situacao: SituacaoPrazo = restantes <= 3 ? "perto" : "no-prazo";
  const texto =
    restantes === 0
      ? "Vence hoje"
      : `${restantes} ${restantes === 1 ? "dia útil restante" : "dias úteis restantes"}`;
  return { usados, limite, restantes, situacao, texto };
}
