import type { Metadata } from "next";
import Link from "next/link";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { CampoSelecao, CampoTexto } from "@/components/ui/Campo";
import { Card, CardContent } from "@/components/ui/card";
import { SeloStatus } from "@/components/ui/SeloStatus";
import { Tabela } from "@/components/ui/Tabela";
import { listarFilaTriagem, listarTemas, resumoTriagem, type FiltroFila } from "@/lib/painel/consultas";
import { slaDiasUteis } from "@/lib/painel/prazo";
import { sessaoDaPagina } from "@/lib/seguranca/auth";
import { CabecalhoPagina, Indicador, Retorno, SeloPrazo, SemPermissao } from "../_componentes/Blocos";

export const metadata: Metadata = { title: "Triagem", robots: { index: false } };

const FORMATO_DATA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Recife" });

const FILTROS: { valor: FiltroFila; rotulo: string }[] = [
  { valor: "pendentes", rotulo: "Aguardando triagem" },
  { valor: "todas", rotulo: "Todas as ideias" },
  { valor: "arquivadas", rotulo: "Arquivadas" },
];

/**
 * Fila da Triagem (especificacao, secao 3.3). DONO: Pessoa B.
 * Ordenada pela ideia mais antiga - a que esta mais perto de vencer o prazo.
 */
export default async function TriagemPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; tema?: string; busca?: string; ok?: string; erro?: string; protocolo?: string }>;
}) {
  const sessao = await sessaoDaPagina("/triagem");
  if (sessao.perfil !== "TRIAGEM" && sessao.perfil !== "ADMIN") {
    return <SemPermissao area="triagem" inicio="/gabinete" />;
  }

  const p = await searchParams;
  const filtro: FiltroFila = FILTROS.some((f) => f.valor === p.filtro) ? (p.filtro as FiltroFila) : "pendentes";
  const [resumo, temas, fila] = await Promise.all([
    resumoTriagem(),
    listarTemas(),
    listarFilaTriagem({ filtro, temaId: p.tema || null, busca: p.busca || null }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <CabecalhoPagina sobretitulo="Secretaria" titulo="Triagem de ideias">
        Confira o conteúdo e a identificação de cada ideia e decida: publicar no acervo ou arquivar com
        justificativa. Prazo de referência: {slaDiasUteis()} dias úteis.
      </CabecalhoPagina>

      <Retorno ok={p.ok} erro={p.erro} />

      <section aria-labelledby="titulo-resumo">
        <h2 id="titulo-resumo" className="sr-only">
          Resumo da triagem
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <li>
            <Indicador rotulo="Recebidas" valor={resumo.recebidas} detalhe="Ainda sem análise iniciada" />
          </li>
          <li>
            <Indicador rotulo="Em triagem" valor={resumo.emTriagem} detalhe="Análise em andamento" />
          </li>
          <li>
            <Indicador
              rotulo="Fora do prazo"
              valor={resumo.vencidas}
              detalhe={`Mais de ${slaDiasUteis()} dias úteis sem decisão`}
              destaque={resumo.vencidas > 0 ? "alerta" : undefined}
            />
          </li>
          <li>
            <Indicador rotulo="Publicadas" valor={resumo.publicadas} detalhe="No acervo público" />
          </li>
          <li>
            <Indicador rotulo="Arquivadas" valor={resumo.arquivadas} detalhe="Com motivo informado ao autor" />
          </li>
        </ul>
      </section>

      <section aria-labelledby="titulo-fila" className="flex flex-col gap-4">
        <h2 id="titulo-fila" className="text-xl font-bold text-marca">
          Fila de ideias
        </h2>

        <Card>
          <CardContent>
            <form className="grid items-end gap-4 md:grid-cols-[1fr_1fr_1.4fr_auto]" role="search">
              <CampoSelecao id="filtro" rotulo="Situação" name="filtro" defaultValue={filtro}>
                {FILTROS.map((f) => (
                  <option key={f.valor} value={f.valor}>
                    {f.rotulo}
                  </option>
                ))}
              </CampoSelecao>
              <CampoSelecao id="tema" rotulo="Tema" name="tema" defaultValue={p.tema ?? ""}>
                <option value="">Todos os temas</option>
                {temas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </CampoSelecao>
              <CampoTexto
                id="busca"
                rotulo="Buscar"
                name="busca"
                type="search"
                defaultValue={p.busca ?? ""}
                placeholder="Protocolo, título ou trecho da descrição"
              />
              <Botao type="submit">Filtrar</Botao>
            </form>
          </CardContent>
        </Card>

        <Tabela
          legenda={`${fila.length} ${fila.length === 1 ? "ideia" : "ideias"} — ${FILTROS.find((f) => f.valor === filtro)?.rotulo}`}
          chave={(i) => i.id}
          linhas={fila}
          vazio="Nenhuma ideia nesta situação. Bom trabalho!"
          colunas={[
            {
              titulo: "Protocolo",
              cabecalhoDaLinha: true,
              celula: (i) => (
                <Link href={`/triagem/${i.protocolo}`} className="font-mono whitespace-nowrap">
                  {i.protocolo}
                </Link>
              ),
            },
            {
              titulo: "Ideia",
              celula: (i) => (
                <div className="max-w-xs">
                  <p className="font-semibold">{i.titulo}</p>
                  <p className="text-xs text-muted-foreground">{i.tema}</p>
                </div>
              ),
            },
            {
              titulo: "Autor",
              celula: (i) => (
                <div>
                  <p>{i.autorNome}</p>
                  <p className="font-mono text-xs text-muted-foreground">{i.documentoMascarado}</p>
                </div>
              ),
            },
            {
              titulo: "Recebida em",
              celula: (i) => <time dateTime={i.criadoEm.toISOString()}>{FORMATO_DATA.format(i.criadoEm)}</time>,
            },
            { titulo: "Prazo", celula: (i) => (i.prazo ? <SeloPrazo prazo={i.prazo} /> : "—") },
            { titulo: "Situação", celula: (i) => <SeloStatus status={i.status} /> },
            {
              titulo: "Ação",
              celula: (i) => (
                <BotaoLink href={`/triagem/${i.protocolo}`} pequeno variante={i.prazo ? "primario" : "contorno"}>
                  {i.prazo ? "Analisar" : "Ver"}
                </BotaoLink>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}
