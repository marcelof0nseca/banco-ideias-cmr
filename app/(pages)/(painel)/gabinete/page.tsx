import type { Metadata } from "next";
import Link from "next/link";
import type { StatusIdeia } from "@/prisma/gen/client";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { CampoSelecao, CampoTexto } from "@/components/ui/Campo";
import { Card, CardContent } from "@/components/ui/card";
import { SeloStatus } from "@/components/ui/SeloStatus";
import { Tabela } from "@/components/ui/Tabela";
import { listarAcervoGabinete, listarTemas, type OrdemAcervo } from "@/lib/painel/consultas";
import { sessaoDaPagina } from "@/lib/seguranca/auth";
import { cn } from "@/lib/sistema/utils";
import { CabecalhoPagina, Indicador, SemPermissao } from "../_componentes/Blocos";

export const metadata: Metadata = { title: "Gabinete", robots: { index: false } };

const SITUACOES: { valor: StatusIdeia; rotulo: string }[] = [
  { valor: "DISPONIVEL", rotulo: "Disponível" },
  { valor: "EM_ANALISE", rotulo: "Em análise" },
  { valor: "ADOTADA", rotulo: "Adotada" },
];

/**
 * Acervo para os gabinetes (especificacao, secao 3.4). DONO: Pessoa B.
 * Ordem padrao: numero de apoios - o volume de apoio popular orienta a
 * priorizacao. Varios gabinetes podem analisar a mesma ideia.
 */
export default async function GabinetePage({
  searchParams,
}: {
  searchParams: Promise<{ visao?: string; situacao?: string; tema?: string; busca?: string; ordem?: string }>;
}) {
  const sessao = await sessaoDaPagina("/gabinete");
  if (sessao.perfil !== "GABINETE" && sessao.perfil !== "ADMIN") {
    return <SemPermissao area="gabinete" inicio="/triagem" />;
  }

  const p = await searchParams;
  const meuGabinete = sessao.gabinete;
  const minhas = p.visao === "minhas" && !!meuGabinete;
  const ordem: OrdemAcervo = p.ordem === "recentes" ? "recentes" : "apoios";
  const situacao = SITUACOES.find((s) => s.valor === p.situacao)?.valor ?? null;

  const [temas, lista, todas, minhasTodas] = await Promise.all([
    listarTemas(),
    listarAcervoGabinete({
      ordem,
      situacao,
      temaId: p.tema || null,
      busca: p.busca || null,
      doGabinete: minhas ? meuGabinete : null,
    }),
    listarAcervoGabinete({ ordem: "apoios" }),
    meuGabinete ? listarAcervoGabinete({ ordem: "apoios", doGabinete: meuGabinete }) : Promise.resolve([]),
  ]);

  const conta = (lst: typeof todas, s: StatusIdeia) => lst.filter((i) => i.status === s).length;

  return (
    <div className="flex flex-col gap-8">
      <CabecalhoPagina sobretitulo={meuGabinete ?? "Administração"} titulo="Acervo de ideias para os gabinetes">
        Ideias aprovadas pela triagem, ordenadas pelo apoio da população. Inicie a análise das que interessam ao
        seu mandato e registre a adoção quando a ideia virar proposição.
      </CabecalhoPagina>

      <section aria-labelledby="titulo-resumo-gab">
        <h2 id="titulo-resumo-gab" className="sr-only">
          Resumo
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <li>
            <Indicador rotulo="Disponíveis" valor={conta(todas, "DISPONIVEL")} detalhe="Aguardando um gabinete" />
          </li>
          <li>
            <Indicador rotulo="Em análise" valor={conta(todas, "EM_ANALISE")} detalhe="Por algum gabinete" />
          </li>
          <li>
            <Indicador
              rotulo={meuGabinete ? "Em análise pelo meu gabinete" : "Adotadas"}
              valor={meuGabinete ? conta(minhasTodas, "EM_ANALISE") : conta(todas, "ADOTADA")}
              detalhe={meuGabinete ? meuGabinete : "Viraram proposta de um gabinete"}
            />
          </li>
          <li>
            <Indicador
              rotulo={meuGabinete ? "Adotadas pelo meu gabinete" : "Apoios no acervo"}
              valor={meuGabinete ? conta(minhasTodas, "ADOTADA") : todas.reduce((s, i) => s + i.apoiosCount, 0)}
              detalhe={meuGabinete ? "Convertidas em proposição" : "Soma dos apoios da população"}
            />
          </li>
        </ul>
      </section>

      <section aria-labelledby="titulo-acervo" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="titulo-acervo" className="text-xl font-bold text-marca">
            {minhas ? "Minhas ideias" : "Acervo completo"}
          </h2>
          {meuGabinete && (
            <nav aria-label="Visão do acervo" className="flex gap-1 rounded-lg bg-muted p-1">
              {[
                { href: "/gabinete", rotulo: "Acervo completo", atual: !minhas },
                { href: "/gabinete?visao=minhas", rotulo: `Minhas ideias (${minhasTodas.length})`, atual: minhas },
              ].map((v) => (
                <Link
                  key={v.href}
                  href={v.href}
                  aria-current={v.atual ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-semibold no-underline",
                    v.atual ? "bg-card text-marca shadow-sm" : "text-secondary-foreground hover:bg-card/60",
                  )}
                >
                  {v.rotulo}
                </Link>
              ))}
            </nav>
          )}
        </div>

        <Card>
          <CardContent>
            <form className="grid items-end gap-4 md:grid-cols-[1fr_1fr_1fr_1.3fr_auto]" role="search">
              {minhas && <input type="hidden" name="visao" value="minhas" />}
              <CampoSelecao id="situacao" rotulo="Situação" name="situacao" defaultValue={situacao ?? ""}>
                <option value="">Todas</option>
                {SITUACOES.map((s) => (
                  <option key={s.valor} value={s.valor}>
                    {s.rotulo}
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
              <CampoSelecao id="ordem" rotulo="Ordenar por" name="ordem" defaultValue={ordem}>
                <option value="apoios">Mais apoiadas</option>
                <option value="recentes">Mais recentes</option>
              </CampoSelecao>
              <CampoTexto id="busca" rotulo="Buscar" name="busca" type="search" defaultValue={p.busca ?? ""} />
              <Botao type="submit">Filtrar</Botao>
            </form>
          </CardContent>
        </Card>

        <Tabela
          legenda={`${lista.length} ${lista.length === 1 ? "ideia" : "ideias"}`}
          chave={(i) => i.id}
          linhas={lista}
          vazio={minhas ? "Seu gabinete ainda não iniciou a análise de nenhuma ideia." : "Nenhuma ideia encontrada."}
          colunas={[
            {
              titulo: "Protocolo",
              cabecalhoDaLinha: true,
              celula: (i) => (
                <Link href={`/gabinete/${i.protocolo}`} className="font-mono whitespace-nowrap">
                  {i.protocolo}
                </Link>
              ),
            },
            {
              titulo: "Ideia",
              celula: (i) => (
                <div className="max-w-sm">
                  <p className="font-semibold">{i.titulo}</p>
                  <p className="text-xs text-muted-foreground">{i.tema}</p>
                </div>
              ),
            },
            {
              titulo: "Apoios",
              celula: (i) => <span className="text-lg font-semibold text-marca">{i.apoiosCount.toLocaleString("pt-BR")}</span>,
            },
            { titulo: "Situação", celula: (i) => <SeloStatus status={i.status} /> },
            {
              titulo: "Gabinetes",
              celula: (i) =>
                i.gabinetes.length ? (
                  <span className="text-sm">{i.gabinetes.join(", ")}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">Nenhum ainda</span>
                ),
            },
            {
              titulo: "Ação",
              celula: (i) => (
                <BotaoLink href={`/gabinete/${i.protocolo}`} pequeno variante={i.status === "DISPONIVEL" ? "primario" : "contorno"}>
                  {i.status === "DISPONIVEL" ? "Analisar" : "Ver"}
                </BotaoLink>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}
