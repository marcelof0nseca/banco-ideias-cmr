import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Botao } from "@/components/ui/Botao";
import { CampoTexto } from "@/components/ui/Campo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabela } from "@/components/ui/Tabela";
import { listarMotivos, listarTemas } from "@/lib/painel/consultas";
import { sessaoDaPagina } from "@/lib/seguranca/auth";
import { CabecalhoPagina, Retorno } from "../../_componentes/Blocos";
import { alternarItemAcao, incluirMotivoAcao, incluirTemaAcao } from "../acoes";

export const metadata: Metadata = { title: "Temas e motivos", robots: { index: false } };

function SeloAtivo({ ativo }: { ativo: boolean }) {
  return ativo ? (
    <Badge variant="outline" className="border-verde-cmr bg-verde-fundo text-verde-cmr">Em uso</Badge>
  ) : (
    <Badge variant="outline" className="border-cinza-selo text-cinza-selo">Desativado</Badge>
  );
}

function Alternar({ tipo, id, ativo }: { tipo: "tema" | "motivo"; id: string; ativo: boolean }) {
  return (
    <form action={alternarItemAcao}>
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="ativo" value={ativo ? "false" : "true"} />
      <Botao type="submit" pequeno variante="contorno">{ativo ? "Desativar" : "Reativar"}</Botao>
    </form>
  );
}

function Bloco({ titulo, descricao, tabela, formulario }: { titulo: string; descricao: string; tabela: ReactNode; formulario: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-lg text-marca">{titulo}</h2>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{descricao}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {tabela}
        {formulario}
      </CardContent>
    </Card>
  );
}

export default async function ListasPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sessao = await sessaoDaPagina("/admin/listas");
  if (sessao.perfil !== "ADMIN") notFound();
  const [{ ok, erro }, temas, motivos] = await Promise.all([searchParams, listarTemas(false), listarMotivos(false)]);

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina sobretitulo="Administração" titulo="Temas e motivos de arquivamento">
        Itens usados nos formulários. Nada é apagado: itens desativados somem dos formulários, mas as ideias
        antigas continuam apontando para eles.
      </CabecalhoPagina>

      <Retorno ok={ok} erro={erro} />

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Bloco
          titulo="Temas das ideias"
          descricao="Aparecem no cadastro do cidadão e nos filtros."
          tabela={
            <Tabela
              legenda={`${temas.length} temas`}
              legendaOculta
              chave={(t) => t.id}
              linhas={temas}
              colunas={[
                { titulo: "Tema", cabecalhoDaLinha: true, celula: (t) => t.nome },
                { titulo: "Ideias", celula: (t) => t._count.ideias },
                { titulo: "Situação", celula: (t) => <SeloAtivo ativo={t.ativo} /> },
                { titulo: "Ação", celula: (t) => <Alternar tipo="tema" id={t.id} ativo={t.ativo} /> },
              ]}
            />
          }
          formulario={
            <form action={incluirTemaAcao} className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
              <CampoTexto id="novo-tema" rotulo="Novo tema" name="nome" className="min-w-56 flex-1" obrigatorio />
              <Botao type="submit">Incluir tema</Botao>
            </form>
          }
        />

        <Bloco
          titulo="Motivos de arquivamento"
          descricao="A Triagem escolhe um deles ao arquivar; o autor lê o motivo no Acompanhar."
          tabela={
            <Tabela
              legenda={`${motivos.length} motivos`}
              legendaOculta
              chave={(m) => m.id}
              linhas={motivos}
              colunas={[
                { titulo: "Motivo", cabecalhoDaLinha: true, celula: (m) => m.descricao },
                { titulo: "Usos", celula: (m) => m._count.tramitacoes },
                { titulo: "Situação", celula: (m) => <SeloAtivo ativo={m.ativo} /> },
                { titulo: "Ação", celula: (m) => <Alternar tipo="motivo" id={m.id} ativo={m.ativo} /> },
              ]}
            />
          }
          formulario={
            <form action={incluirMotivoAcao} className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
              <CampoTexto id="novo-motivo" rotulo="Novo motivo" name="descricao" className="min-w-56 flex-1" obrigatorio />
              <Botao type="submit">Incluir motivo</Botao>
            </form>
          }
        />
      </div>
    </div>
  );
}
