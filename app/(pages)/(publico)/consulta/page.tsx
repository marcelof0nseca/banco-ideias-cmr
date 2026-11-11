import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { CampoSelecao, CampoTexto } from "@/components/ui/Campo";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SeloStatus } from "@/components/ui/SeloStatus";
import { rotuloStatus } from "@/components/ui/status";
import { STATUS_PUBLICOS } from "@/lib/tramitacao/maquina-status";
import {
  BUSCA_MAX,
  hrefConsulta,
  lerFiltrosConsulta,
  listarIdeiasPublicas,
  paginasVisiveis,
  temFiltro,
  type FiltrosConsulta,
} from "@/lib/ideias/consulta";
import { prisma } from "@/lib/sistema/prisma";

export const metadata: Metadata = {
  title: "Consulta pública de ideias",
  description: "Ideias legislativas publicadas no Banco de Ideias da Câmara Municipal do Recife.",
};

/**
 * Consulta publica (dono: Pessoa A). Busca, filtros e paginacao vem da URL
 * (formulario GET): funciona sem JS e o link de uma busca pode ser copiado.
 * NAO expoe dado pessoal (contrato types/publico.ts).
 */
export const dynamic = "force-dynamic";

export default async function ConsultaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filtros = lerFiltrosConsulta(await searchParams);
  const [resultado, temas] = await Promise.all([
    listarIdeiasPublicas(filtros),
    // So temas que tem alguma ideia publica: opcao que nunca traz resultado so atrapalha.
    prisma.tema.findMany({
      where: { ideias: { some: { status: { in: STATUS_PUBLICOS } } } },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true },
    }),
  ]);
  const { ideias, total, pagina, totalPaginas } = resultado;
  const filtrando = temFiltro(filtros);

  const contagem =
    total === 0
      ? "Nenhuma ideia encontrada."
      : `${total.toLocaleString("pt-BR")} ${total === 1 ? "ideia" : "ideias"} ${
          filtrando ? (total === 1 ? "encontrada" : "encontradas") : total === 1 ? "publicada" : "publicadas"
        }${totalPaginas > 1 ? ` · página ${pagina} de ${totalPaginas}` : ""}.`;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-marca">Consulta pública de ideias</h1>

      <Card className="mt-6">
        <CardContent>
          <form role="search" aria-label="Buscar ideias" className="flex flex-col gap-4">
            <CampoTexto
              id="busca"
              name="busca"
              type="search"
              rotulo="Buscar"
              dica="Palavra do título ou da descrição, ou o número do protocolo."
              maxLength={BUSCA_MAX}
              defaultValue={filtros.busca}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoSelecao id="tema" name="tema" rotulo="Tema" defaultValue={filtros.temaId ?? ""}>
                <option value="">Todos os temas</option>
                {temas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </CampoSelecao>
              <CampoSelecao id="situacao" name="situacao" rotulo="Situação" defaultValue={filtros.situacao ?? ""}>
                <option value="">Todas as situações</option>
                {STATUS_PUBLICOS.map((s) => (
                  <option key={s} value={s}>
                    {rotuloStatus(s)}
                  </option>
                ))}
              </CampoSelecao>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Botao type="submit">Buscar</Botao>
              {filtrando && <Link href="/consulta">Limpar filtros</Link>}
            </div>
          </form>
        </CardContent>
      </Card>

      <h2 id="titulo-resultados" className="mt-8 text-xl font-bold text-marca">
        {filtrando ? "Resultado da busca" : "Ideias publicadas"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{contagem}</p>

      {ideias.length === 0 ? (
        <p className="mt-6">
          {filtrando
            ? "Tente outra palavra ou retire algum filtro."
            : "Ainda não há ideias publicadas. Que tal ser a primeira pessoa a participar?"}{" "}
          {filtrando ? <Link href="/consulta">Ver todas as ideias</Link> : <Link href="/participar">Enviar uma ideia</Link>}
        </p>
      ) : (
        <ul aria-labelledby="titulo-resultados" className="mt-6 flex flex-col gap-4">
          {ideias.map((i) => (
            <li key={i.protocolo}>
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <CardTitle className="text-lg font-bold">
                      <h3>
                        <Link href={`/consulta/${i.protocolo}`} className="text-marca hover:text-primary">
                          {i.titulo}
                        </Link>
                      </h3>
                    </CardTitle>
                    <SeloStatus status={i.status} />
                  </div>
                  <CardDescription>
                    <span className="font-mono">{i.protocolo}</span> · {i.tema} · {i.autor.exibicao}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p>{i.resumo}</p>
                </CardContent>
                <CardFooter className="text-muted-foreground">
                  <span>
                    <strong className="text-foreground">{i.apoiosCount.toLocaleString("pt-BR")}</strong>{" "}
                    {i.apoiosCount === 1 ? "apoio" : "apoios"}
                  </span>
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {totalPaginas > 1 && <Paginacao filtros={filtros} pagina={pagina} totalPaginas={totalPaginas} />}
    </div>
  );
}

/** Anterior / numeros / Proxima. Links comuns: funciona sem JS. */
function Paginacao({
  filtros,
  pagina,
  totalPaginas,
}: {
  filtros: FiltrosConsulta;
  pagina: number;
  totalPaginas: number;
}) {
  const numeros = paginasVisiveis(pagina, totalPaginas);
  const classeItem =
    "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md border border-border px-3 font-semibold no-underline";

  return (
    <nav aria-label="Páginas de resultados" className="mt-8">
      <ul className="flex flex-wrap items-center gap-2">
        {pagina > 1 && (
          <li>
            <Link href={hrefConsulta(filtros, pagina - 1)} className={`${classeItem} hover:bg-muted`}>
              <ChevronLeft aria-hidden="true" className="size-4" />
              Anterior
            </Link>
          </li>
        )}
        {numeros.map((n, idx) =>
          n === null ? (
            <li key={`salto-${idx}`} aria-hidden="true" className="px-1 text-muted-foreground">
              …
            </li>
          ) : (
            <li key={n}>
              <Link
                href={hrefConsulta(filtros, n)}
                aria-current={n === pagina ? "page" : undefined}
                className={
                  n === pagina
                    ? `${classeItem} border-primary bg-primary text-primary-foreground`
                    : `${classeItem} hover:bg-muted`
                }
              >
                <span className="sr-only">Página </span>
                {n}
              </Link>
            </li>
          ),
        )}
        {pagina < totalPaginas && (
          <li>
            <Link href={hrefConsulta(filtros, pagina + 1)} className={`${classeItem} hover:bg-muted`}>
              Próxima
              <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
