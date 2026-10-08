import type { ReactNode } from "react";

/**
 * Tabela de dados acessivel: <caption> obrigatoria, cabecalhos com scope.
 * Em telas estreitas a tabela rola dentro da propria caixa (a pagina nao
 * ganha rolagem horizontal); a caixa e focavel para rolar pelo teclado.
 */

export interface ColunaTabela<T> {
  titulo: string;
  celula: (linha: T) => ReactNode;
  /** A coluna marcada vira cabecalho da linha (<th scope="row">). */
  cabecalhoDaLinha?: boolean;
}

interface TabelaProps<T> {
  legenda: string;
  /** Esconde a legenda visualmente, mantendo-a para leitores de tela. */
  legendaOculta?: boolean;
  colunas: ColunaTabela<T>[];
  linhas: T[];
  chave: (linha: T) => string;
  vazio?: string;
}

export function Tabela<T>({
  legenda,
  legendaOculta,
  colunas,
  linhas,
  chave,
  vazio = "Nenhum registro encontrado.",
}: TabelaProps<T>) {
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={legenda}>
      <table className="w-full border-collapse text-sm">
        <caption
          className={
            legendaOculta ? "sr-only" : "mb-2 text-left font-semibold text-azul-cmr"
          }
        >
          {legenda}
        </caption>
        <thead>
          <tr>
            {colunas.map((c) => (
              <th
                key={c.titulo}
                scope="col"
                className="border-b-2 border-linha bg-[#eef2f9] px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-azul-cmr"
              >
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.length === 0 ? (
            <tr>
              <td colSpan={colunas.length} className="px-3 py-4 text-cinza">
                {vazio}
              </td>
            </tr>
          ) : (
            linhas.map((linha) => (
              <tr key={chave(linha)} className="hover:bg-[#f8fafd]">
                {colunas.map((c) =>
                  c.cabecalhoDaLinha ? (
                    <th
                      key={c.titulo}
                      scope="row"
                      className="border-b border-linha px-3 py-2.5 text-left align-top font-semibold"
                    >
                      {c.celula(linha)}
                    </th>
                  ) : (
                    <td key={c.titulo} className="border-b border-linha px-3 py-2.5 align-top">
                      {c.celula(linha)}
                    </td>
                  ),
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
