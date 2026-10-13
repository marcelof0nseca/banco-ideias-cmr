import { ClipboardList, Download, ListChecks, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { resumoAdmin } from "@/lib/painel/admin";
import { sessaoDaPagina } from "@/lib/seguranca/auth";
import { caminho } from "@/lib/sistema/url";
import { CabecalhoPagina, Indicador } from "../_componentes/Blocos";

export const metadata: Metadata = { title: "Administração", robots: { index: false } };

function Atalho({ href, titulo, texto, icone, externo }: { href: string; titulo: string; texto: string; icone: ReactNode; externo?: boolean }) {
  const conteudo = (
    <Card className="h-full transition-colors hover:border-marca-medio motion-reduce:transition-none">
      <CardContent className="flex gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-marca-fundo text-marca">{icone}</span>
        <div>
          <p className="font-semibold text-marca">{titulo}</p>
          <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
        </div>
      </CardContent>
    </Card>
  );
  return externo ? (
    <a href={href} className="block no-underline">{conteudo}</a>
  ) : (
    <Link href={href} className="block no-underline">{conteudo}</Link>
  );
}

export default async function AdminPage() {
  const sessao = await sessaoDaPagina("/admin");
  if (sessao.perfil !== "ADMIN") notFound();
  const r = await resumoAdmin();

  return (
    <div className="flex flex-col gap-8">
      <CabecalhoPagina sobretitulo="Administração" titulo="Visão geral do sistema">
        Usuários internos, listas usadas nos formulários e a trilha de auditoria de tudo o que acontece no painel.
      </CabecalhoPagina>

      <section aria-labelledby="titulo-resumo-admin">
        <h2 id="titulo-resumo-admin" className="sr-only">
          Resumo
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <li><Indicador rotulo="Usuários ativos" valor={r.usuariosAtivos} detalhe="Triagem, gabinetes e administração" /></li>
          <li><Indicador rotulo="Ideias no sistema" valor={r.ideias} detalhe="Em qualquer situação" /></li>
          <li><Indicador rotulo="Eventos hoje" valor={r.eventosHoje} detalhe="Registrados na auditoria" /></li>
          <li><Indicador rotulo="CPFs revelados" valor={r.revelacoes} detalhe="Nos últimos 30 dias" /></li>
          <li>
            <Indicador
              rotulo="Entradas recusadas"
              valor={r.recusas}
              detalhe="Senha errada ou bloqueio, 30 dias"
              destaque={r.recusas >= 20 ? "alerta" : undefined}
            />
          </li>
        </ul>
      </section>

      <section aria-labelledby="titulo-atalhos" className="flex flex-col gap-4">
        <h2 id="titulo-atalhos" className="text-xl font-bold text-marca">
          O que você pode fazer
        </h2>
        <ul className="grid gap-4 md:grid-cols-2">
          <li><Atalho href="/admin/acessos" titulo="Usuários" texto="Criar acessos, redefinir senhas e desativar quem saiu." icone={<Users aria-hidden="true" className="size-5" />} /></li>
          <li><Atalho href="/admin/listas" titulo="Temas e motivos" texto="Listas dos formulários: temas das ideias e motivos de arquivamento." icone={<ListChecks aria-hidden="true" className="size-5" />} /></li>
          <li><Atalho href="/admin/auditoria" titulo="Trilha de auditoria" texto="Quem entrou, revelou CPF, editou textos ou alterou usuários. A consulta também é registrada." icone={<ShieldCheck aria-hidden="true" className="size-5" />} /></li>
          <li><Atalho href="/triagem" titulo="Triagem e gabinetes" texto="A administração enxerga as duas filas e pode arquivar em qualquer situação." icone={<ClipboardList aria-hidden="true" className="size-5" />} /></li>
          <li><Atalho externo href={caminho("/api/painel/exportar")} titulo="Exportar ideias (CSV)" texto="Planilha para relatório: protocolo, tema, situação, datas e apoios. Sem dados pessoais." icone={<Download aria-hidden="true" className="size-5" />} /></li>
        </ul>
      </section>
    </div>
  );
}
