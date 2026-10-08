import type { Contagem } from "@/lib/indicadores/indicadores";
import { Tabela } from "./Tabela";

/**
 * Grafico de barras horizontais renderizado no servidor (funciona sem JS e
 * sem estilo inline, respeitando a CSP). Uma serie so: sem legenda, o titulo
 * diz o que e medido.
 *
 * Acessibilidade (WCAG 1.1.1 / 1.4.1): cada linha tem rotulo e valor em
 * texto; a barra e decorativa (aria-hidden). Os mesmos dados ficam numa
 * tabela em <details>, aberta sem JS.
 *
 * Especificacao visual (skill dataviz): barra <= 24px, ponta arredondada de
 * 4px e base reta, valor na ponta em cor de texto, uma cor validada.
 */

interface GraficoBarrasProps {
  id: string;
  titulo: string;
  descricao?: string;
  dados: Contagem[];
  /** Unidade no singular e plural: ["ideia", "ideias"]. */
  unidade: [string, string];
  /** Cabecalho da 1a coluna da tabela equivalente. */
  rotuloCategoria: string;
  vazio?: string;
}

/** Largura da barra em % do maior valor (0..100), com minimo visivel. */
export function larguraBarra(quantidade: number, maximo: number): number {
  if (quantidade <= 0 || maximo <= 0) return 0;
  return Math.max(1, Math.round((quantidade / maximo) * 100));
}

export function GraficoBarras({
  id,
  titulo,
  descricao,
  dados,
  unidade,
  rotuloCategoria,
  vazio = "Ainda não há dados para este indicador.",
}: GraficoBarrasProps) {
  const maximo = Math.max(0, ...dados.map((d) => d.quantidade));
  const fmt = (n: number) => `${n.toLocaleString("pt-BR")} ${n === 1 ? unidade[0] : unidade[1]}`;

  return (
    <figure aria-labelledby={`${id}-titulo`} className="flex flex-col gap-4">
      <div>
        <h3 id={`${id}-titulo`} className="text-base font-semibold text-marca">
          {titulo}
        </h3>
        {descricao && <p className="text-sm text-muted-foreground">{descricao}</p>}
      </div>

      {dados.length === 0 || maximo === 0 ? (
        <p className="text-sm text-muted-foreground">{vazio}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {dados.map((d) => (
            <li
              key={d.rotulo}
              className="grid grid-cols-[minmax(7rem,12rem)_1fr] items-center gap-3 rounded-md px-1 py-1 hover:bg-muted sm:grid-cols-[14rem_1fr]"
            >
              <span className="text-sm leading-tight">{d.rotulo}</span>
              {/* pr-12 reserva a folga em que o valor cabe quando a barra e 100%. */}
              <span className="min-w-0 pr-12">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`block h-4 shrink-0 rounded-r-[4px] bg-chart-1 barra-${larguraBarra(d.quantidade, maximo)}`}
                  />
                  <span className="shrink-0 text-sm font-semibold whitespace-nowrap tabular-nums">
                    {d.quantidade.toLocaleString("pt-BR")}
                    <span className="sr-only"> {d.quantidade === 1 ? unidade[0] : unidade[1]}</span>
                  </span>
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {dados.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-primary underline underline-offset-4">
            Ver dados em tabela
          </summary>
          <div className="mt-3">
            <Tabela
              legenda={titulo}
              legendaOculta
              colunas={[
                { titulo: rotuloCategoria, celula: (l: Contagem) => l.rotulo, cabecalhoDaLinha: true },
                { titulo: "Quantidade", celula: (l) => fmt(l.quantidade) },
              ]}
              linhas={dados}
              chave={(l) => l.rotulo}
            />
          </div>
        </details>
      )}
    </figure>
  );
}
