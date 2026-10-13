import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Prisma, type AcaoAuditoria } from "@/prisma/gen/client";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { CampoSelecao } from "@/components/ui/Campo";
import { Card, CardContent } from "@/components/ui/card";
import { Tabela } from "@/components/ui/Tabela";
import { consultarAuditoria } from "@/lib/painel/admin";
import { ROTULO_ACAO } from "@/lib/seguranca/auditoria";
import { ipHashAtual, sessaoDaPagina } from "@/lib/seguranca/auth";
import { CabecalhoPagina } from "../../_componentes/Blocos";
import { ROTULO_PERFIL } from "../../_componentes/BarraUsuario";

export const metadata: Metadata = { title: "Trilha de auditoria", robots: { index: false } };

const FORMATO = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "America/Recife",
});

const ACOES = Object.keys(ROTULO_ACAO) as AcaoAuditoria[];

/** Nome do tipo de registro afetado, em portugues (o banco guarda o nome do modelo). */
const ROTULO_ALVO: Partial<Record<Prisma.ModelName, string>> = {
  Usuario: "Usuário",
  Tema: "Tema",
  MotivoArquivamento: "Motivo de arquivamento",
  Ideia: "Ideia",
};

export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<{ acao?: string }> }) {
  const sessao = await sessaoDaPagina("/admin/auditoria");
  if (sessao.perfil !== "ADMIN") notFound();

  const { acao } = await searchParams;
  const filtro = ACOES.includes(acao as AcaoAuditoria) ? (acao as AcaoAuditoria) : null;
  const eventos =
    (await consultarAuditoria(
      { usuarioId: sessao.usuarioId, perfil: sessao.perfil, ipHash: await ipHashAtual() },
      { acao: filtro },
    )) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina sobretitulo="Administração" titulo="Trilha de auditoria">
        Eventos do painel que não são mudança de situação (essas ficam no histórico de cada ideia). Últimos 300
        registros.
      </CabecalhoPagina>

      <Alerta tipo="info" titulo="Esta consulta também foi registrada">
        Quem consulta a trilha de auditoria deixa rastro nela (especificação, seção 8.6).
      </Alerta>

      <Card>
        <CardContent>
          <form className="grid items-end gap-4 sm:grid-cols-[minmax(0,26rem)_auto] sm:justify-start" role="search">
            <CampoSelecao id="acao" rotulo="Tipo de evento" name="acao" defaultValue={filtro ?? ""}>
              <option value="">Todos</option>
              {ACOES.map((a) => (
                <option key={a} value={a}>
                  {ROTULO_ACAO[a]}
                </option>
              ))}
            </CampoSelecao>
            <Botao type="submit">Filtrar</Botao>
          </form>
        </CardContent>
      </Card>

      <Tabela
        legenda={`${eventos.length} eventos`}
        chave={(e) => e.id}
        linhas={eventos}
        vazio="Nenhum evento registrado com este filtro."
        colunas={[
          {
            titulo: "Quando",
            cabecalhoDaLinha: true,
            celula: (e) => <time dateTime={e.criadoEm.toISOString()} className="whitespace-nowrap">{FORMATO.format(e.criadoEm)}</time>,
          },
          { titulo: "Evento", celula: (e) => ROTULO_ACAO[e.acao] },
          {
            titulo: "Quem",
            celula: (e) =>
              e.usuario ? (
                <div>
                  <p>{e.usuario.nome}</p>
                  <p className="text-xs text-muted-foreground">{ROTULO_PERFIL[e.usuario.perfil]}</p>
                </div>
              ) : (
                <span className="text-muted-foreground">Não identificado</span>
              ),
          },
          {
            titulo: "Sobre",
            celula: (e) =>
              !e.alvoTipo ? (
                "—"
              ) : e.alvoTipo === Prisma.ModelName.Ideia ? (
                <span className="font-mono text-sm">{e.alvoId}</span>
              ) : (
                <span className="text-sm">{ROTULO_ALVO[e.alvoTipo as Prisma.ModelName] ?? e.alvoTipo}</span>
              ),
          },
          { titulo: "Detalhe", celula: (e) => <span className="text-sm">{e.detalhe ?? "—"}</span> },
        ]}
      />
    </div>
  );
}
