import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

/**
 * Tabela de dados acessivel, sobre o Table do shadcn/ui: <caption>
 * obrigatoria e cabecalhos com scope. Em telas estreitas a tabela rola dentro
 * da propria caixa, que e focavel para rolar pelo teclado.
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
    <Table rotuloRolagem={legenda}>
      <TableCaption
        className={legendaOculta ? "sr-only" : "mt-0 mb-2 caption-top text-left font-semibold text-foreground"}
      >
        {legenda}
      </TableCaption>
      <TableHeader className="bg-muted">
        <TableRow>
          {colunas.map((c) => (
            <TableHead key={c.titulo} scope="col" className="font-semibold text-secondary-foreground">
              {c.titulo}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {linhas.length === 0 ? (
          <TableRow>
            <TableCell colSpan={colunas.length} className="py-4 text-muted-foreground">
              {vazio}
            </TableCell>
          </TableRow>
        ) : (
          linhas.map((linha) => (
            <TableRow key={chave(linha)}>
              {colunas.map((c) =>
                c.cabecalhoDaLinha ? (
                  <TableHead key={c.titulo} scope="row" className="font-semibold">
                    {c.celula(linha)}
                  </TableHead>
                ) : (
                  <TableCell key={c.titulo}>{c.celula(linha)}</TableCell>
                ),
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
