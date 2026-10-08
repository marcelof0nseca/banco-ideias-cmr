import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraficoBarras } from "@/components/ui/GraficoBarras";
import { formatarPercentual } from "@/lib/indicadores";
import { carregarIndicadores } from "@/lib/indicadores-dados";
import { caminho } from "@/lib/url";

export const metadata: Metadata = {
  title: "Indicadores",
  description:
    "Números do Banco de Ideias Legislativas: ideias por tema e região, tempo de triagem, aprovação e adoção.",
};

/** Dados agregados, recalculados a cada visita (volume pequeno). */
export const dynamic = "force-dynamic";

const FORMATO_DATA_HORA = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Recife",
});

function Numero({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe: string }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardDescription className="font-medium">{rotulo}</CardDescription>
        <CardTitle className="text-3xl font-semibold text-marca">{valor}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{detalhe}</CardContent>
    </Card>
  );
}

export default async function IndicadoresPage() {
  const ind = await carregarIndicadores();
  const tempo =
    ind.tempoMedioTriagemDias === null
      ? "—"
      : `${ind.tempoMedioTriagemDias.toLocaleString("pt-BR")} ${ind.tempoMedioTriagemDias === 1 ? "dia" : "dias"}`;

  return (
    <div className="flex flex-col gap-8">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-marca">Indicadores</h1>
        <p className="mt-1 text-muted-foreground">
          Números do programa, sem nenhum dado pessoal. Atualizado em{" "}
          <time dateTime={ind.geradoEm}>{FORMATO_DATA_HORA.format(new Date(ind.geradoEm))}</time>.
        </p>
      </div>

      <section aria-labelledby="titulo-resumo">
        <h2 id="titulo-resumo" className="sr-only">
          Resumo
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <li>
            <Numero
              rotulo="Ideias recebidas"
              valor={ind.totais.recebidas.toLocaleString("pt-BR")}
              detalhe={`${ind.totais.aguardandoTriagem.toLocaleString("pt-BR")} aguardando triagem`}
            />
          </li>
          <li>
            <Numero
              rotulo="Publicadas no acervo"
              valor={ind.totais.publicadas.toLocaleString("pt-BR")}
              detalhe="Disponíveis, em análise ou adotadas"
            />
          </li>
          <li>
            <Numero
              rotulo="Tempo médio de triagem"
              valor={tempo}
              detalhe="Do envio até a decisão da Secretaria (dias corridos)"
            />
          </li>
          <li>
            <Numero
              rotulo="Taxa de aprovação"
              valor={formatarPercentual(ind.taxaAprovacao)}
              detalhe="Ideias triadas que foram publicadas"
            />
          </li>
          <li>
            <Numero
              rotulo="Taxa de adoção"
              valor={formatarPercentual(ind.taxaAdocao)}
              detalhe="Ideias publicadas adotadas por um gabinete"
            />
          </li>
        </ul>
      </section>

      <section aria-labelledby="titulo-distribuicao" className="flex flex-col gap-4">
        <h2 id="titulo-distribuicao" className="text-xl font-bold text-marca">
          Distribuição das ideias
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent>
              <GraficoBarras
                id="por-tema"
                titulo="Ideias recebidas por tema"
                descricao="Todas as ideias enviadas, em qualquer situação."
                dados={ind.porTema}
                unidade={["ideia", "ideias"]}
                rotuloCategoria="Tema"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <GraficoBarras
                id="por-rpa"
                titulo="Ideias recebidas por região (RPA)"
                descricao="Região do Recife a que a ideia se refere."
                dados={ind.porRpa}
                unidade={["ideia", "ideias"]}
                rotuloCategoria="Região"
              />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardContent>
              <GraficoBarras
                id="por-gabinete"
                titulo="Ideias adotadas por gabinete"
                descricao="Quantas ideias do acervo cada gabinete transformou em proposta."
                dados={ind.adocaoPorGabinete}
                unidade={["ideia adotada", "ideias adotadas"]}
                rotuloCategoria="Gabinete"
                vazio="Nenhuma ideia foi adotada até agora."
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <p className="text-sm text-muted-foreground">
        Os mesmos dados estão disponíveis em formato aberto em{" "}
        <a href={caminho("/api/indicadores")}>/api/indicadores</a>.
      </p>
    </div>
  );
}
