import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinhaDoTempo } from "@/components/ui/LinhaDoTempo";
import { SeloStatus } from "@/components/ui/SeloStatus";
import { Separator } from "@/components/ui/separator";
import { assinarInicio } from "@/lib/cadastro";
import { carregarIdeiaPublica, STATUS_ACEITAM_APOIO } from "@/lib/consulta";
import { RPAS } from "@/lib/rpa";
import { urlIdeiaAbsoluta } from "@/lib/url";
import { FormApoio } from "./FormApoio";

/**
 * Detalhe publico da ideia (especificacao, secao 3.4). DONO: Pessoa A.
 * SSR, indexavel e com Open Graph (link compartilhado no WhatsApp mostra
 * titulo e resumo). Ideia em triagem ou inexistente -> 404 igual.
 */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ protocolo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ideia = await carregarIdeiaPublica((await params).protocolo);
  if (!ideia) return { title: "Ideia não encontrada", robots: { index: false } };
  const url = urlIdeiaAbsoluta(ideia.protocolo);
  return {
    title: ideia.titulo,
    description: ideia.resumo,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: ideia.titulo,
      description: ideia.resumo,
      siteName: "Banco de Ideias Legislativas — Câmara Municipal do Recife",
      locale: "pt_BR",
    },
  };
}

const FORMATO_DATA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Recife" });

function Dado({ termo, children }: { termo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-muted-foreground">{termo}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

export default async function DetalheIdeiaPage({ params }: Props) {
  const ideia = await carregarIdeiaPublica((await params).protocolo);
  if (!ideia) notFound();

  const aceitaApoio = STATUS_ACEITAM_APOIO.includes(ideia.status);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/consulta" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Voltar à consulta
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <article aria-labelledby="titulo-ideia" className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <SeloStatus status={ideia.status} />
                <span className="font-mono text-sm text-muted-foreground">{ideia.protocolo}</span>
              </div>
              <CardTitle>
                <h1 id="titulo-ideia" className="text-2xl leading-tight font-bold text-marca">
                  {ideia.titulo}
                </h1>
              </CardTitle>
              <CardDescription>
                Proposta por {ideia.autor.exibicao} em{" "}
                <time dateTime={ideia.criadoEm}>{FORMATO_DATA.format(new Date(ideia.criadoEm))}</time>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {/* Texto do cidadao: escapado pelo React, quebras de linha preservadas. */}
              <p className="text-base whitespace-pre-line">{ideia.descricao}</p>
              <Separator />
              <dl className="grid gap-4 sm:grid-cols-3">
                <Dado termo="Tema">{ideia.tema}</Dado>
                <Dado termo="Região">{ideia.rpa ? RPAS[ideia.rpa] : "Não informada"}</Dado>
                <Dado termo="Bairro">{ideia.bairro ?? "Não informado"}</Dado>
              </dl>
              {ideia.gabinetesInteressados.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h2 className="text-sm text-muted-foreground">Gabinetes interessados</h2>
                    <ul className="mt-1 flex flex-wrap gap-2">
                      {ideia.gabinetesInteressados.map((g) => (
                        <li key={g} className="rounded-md bg-secondary px-2.5 py-1 text-sm text-secondary-foreground">
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2 className="text-lg font-bold text-marca">Tramitação</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LinhaDoTempo eventos={ideia.linhaDoTempo} mostrarJustificativa={false} />
            </CardContent>
          </Card>
        </article>

        <aside aria-labelledby="titulo-apoio">
          <Card className="lg:sticky lg:top-4">
            <CardHeader>
              <CardTitle>
                <h2 id="titulo-apoio" className="text-lg font-bold text-marca">
                  Apoie esta ideia
                </h2>
              </CardTitle>
              <CardDescription>
                Apoios mostram aos vereadores quais ideias têm mais respaldo da população. A adoção
                continua sendo decisão de cada gabinete.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aceitaApoio ? (
                <FormApoio
                  protocolo={ideia.protocolo}
                  iniciadoEm={assinarInicio()}
                  apoiosIniciais={ideia.apoiosCount}
                />
              ) : (
                <p>
                  <strong className="text-2xl font-semibold text-marca">
                    {ideia.apoiosCount.toLocaleString("pt-BR")}
                  </strong>{" "}
                  {ideia.apoiosCount === 1 ? "apoio recebido" : "apoios recebidos"}. Esta ideia não
                  está mais recebendo apoios.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
