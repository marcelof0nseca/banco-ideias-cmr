import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sessaoDaPagina } from "@/lib/seguranca/auth";
import { CabecalhoPagina, Retorno } from "../../_componentes/Blocos";
import { BuscaTitular } from "./BuscaTitular";

export const metadata: Metadata = { title: "Titulares de dados (LGPD)", robots: { index: false } };

/**
 * Atendimento a pedidos de titulares (LGPD, art. 18; especificacao 9.5).
 * DONO: Pessoa B.
 */
export default async function TitularesPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sessao = await sessaoDaPagina("/admin/titulares");
  if (sessao.perfil !== "ADMIN") notFound();
  const { ok, erro } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina sobretitulo="Administração · LGPD" titulo="Pedidos de titulares de dados">
        Use quando um cidadão pedir, pelo canal do Encarregado de Dados, acesso aos próprios dados, revogação da
        divulgação do nome ou eliminação. Confirme a identidade de quem pede antes de agir. Cada ação fica
        registrada na trilha de auditoria.
      </CabecalhoPagina>
      <Retorno ok={ok} erro={erro} />
      <BuscaTitular />
    </div>
  );
}
