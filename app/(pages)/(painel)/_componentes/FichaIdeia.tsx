import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinhaDoTempo } from "@/components/ui/LinhaDoTempo";
import { SeloStatus } from "@/components/ui/SeloStatus";
import type { DetalheInterno } from "@/lib/painel/consultas";
import { RPAS } from "@/lib/regioes/rpa";
import { SeloPrazo } from "./Blocos";

/**
 * Ficha interna da ideia, comum a Triagem e Gabinete: proposta, dados,
 * texto original (se a Triagem editou) e historico completo com as
 * justificativas. Cada tela acrescenta o proprio painel lateral (acoes).
 * DONO: Pessoa B.
 */

const FORMATO_DATA = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Recife" });

function Dado({ termo, children }: { termo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{termo}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

export function FichaIdeia({
  ideia,
  voltar,
  lateral,
}: {
  ideia: DetalheInterno;
  voltar: { href: string; rotulo: string };
  lateral: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Link href={voltar.href} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {voltar.rotulo}
      </Link>

      <div className="flex flex-col gap-3">
        <p className="font-mono text-sm font-semibold text-marca-medio">{ideia.protocolo}</p>
        <h1 className="text-2xl font-bold text-marca">{ideia.titulo}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <SeloStatus status={ideia.status} />
          {ideia.prazo && <SeloPrazo prazo={ideia.prazo} />}
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2 className="text-lg text-marca">A proposta</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <p className="whitespace-pre-line">{ideia.descricao}</p>
              {ideia.textoOriginal && ideia.textoOriginal !== ideia.descricao && (
                <details className="rounded-lg border border-border bg-muted p-3 text-sm">
                  <summary className="cursor-pointer font-semibold text-marca">
                    Ver o texto original enviado pelo cidadão
                  </summary>
                  <p className="mt-2 whitespace-pre-line">{ideia.textoOriginal}</p>
                </details>
              )}
              <dl className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
                <Dado termo="Tema">{ideia.tema}</Dado>
                <Dado termo="Região">
                  {ideia.bairro ?? "Não informado"}
                  {ideia.rpa ? ` · ${RPAS[ideia.rpa] ?? `RPA ${ideia.rpa}`}` : ""}
                </Dado>
                <Dado termo="Apoios">{ideia.apoiosCount.toLocaleString("pt-BR")}</Dado>
                <Dado termo="Recebida em">
                  <time dateTime={ideia.criadoEm.toISOString()}>{FORMATO_DATA.format(ideia.criadoEm)}</time>
                </Dado>
                {ideia.interesses.length > 0 && (
                  <Dado termo="Gabinetes">
                    {ideia.interesses.map((g) => `${g.gabinete}${g.tipo === "ADOCAO" ? " (adotou)" : ""}`).join(", ")}
                  </Dado>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2 className="text-lg text-marca">Histórico da tramitação</h2>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Registro permanente: nenhuma mudança de situação acontece sem deixar rastro.
              </p>
            </CardHeader>
            <CardContent>
              <LinhaDoTempo eventos={ideia.linhaDoTempo} />
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-6" aria-label="Ações e dados internos">
          {lateral}
        </aside>
      </div>
    </div>
  );
}
