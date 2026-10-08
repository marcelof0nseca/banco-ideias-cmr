import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SeloStatus } from "@/components/ui/SeloStatus";
import { STATUS_PUBLICOS } from "@/lib/maquina-status";
import { prisma } from "@/lib/prisma";
import { exibicaoAutor } from "@/lib/publico";
import type { IdeiaPublicaResumo } from "@/types/publico";

export const metadata: Metadata = {
  title: "Consulta pública de ideias",
  description: "Ideias legislativas publicadas no Banco de Ideias da Câmara Municipal do Recife.",
};

/**
 * Consulta publica (dono: Pessoa A, Fase 2). Ja le do banco e NAO expoe dado
 * pessoal, exercitando o contrato types/publico.ts. Filtros, ordenacao e
 * paginacao entram na proxima etapa.
 */
export const dynamic = "force-dynamic";

export default async function ConsultaPage() {
  const ideias = await prisma.ideia.findMany({
    where: { status: { in: STATUS_PUBLICOS } },
    orderBy: { criadoEm: "desc" },
    select: {
      protocolo: true,
      titulo: true,
      descricao: true,
      status: true,
      rpa: true,
      apoiosCount: true,
      criadoEm: true,
      tema: { select: { nome: true } },
      autor: { select: { nome: true, nomePublico: true, tipo: true } },
    },
  });

  const publicas: IdeiaPublicaResumo[] = ideias.map((i) => ({
    protocolo: i.protocolo,
    titulo: i.titulo,
    tema: i.tema.nome,
    status: i.status,
    autor: {
      exibicao: exibicaoAutor(i.autor),
      tipo: i.autor.tipo,
    },
    apoiosCount: i.apoiosCount,
    resumo: i.descricao.slice(0, 190),
    rpa: i.rpa,
    gabinetesInteressados: [],
    criadoEm: i.criadoEm.toISOString(),
  }));

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-azul-cmr">Consulta pública de ideias</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {publicas.length === 1
          ? "1 ideia publicada no acervo."
          : `${publicas.length} ideias publicadas no acervo.`}
      </p>
      <ul className="mt-6 flex flex-col gap-4">
        {publicas.map((i) => (
          <li key={i.protocolo}>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <CardTitle className="text-lg font-bold text-azul-cmr">{i.titulo}</CardTitle>
                  <SeloStatus status={i.status} />
                </div>
                <CardDescription>
                  <span className="font-mono">{i.protocolo}</span> · {i.tema} · {i.autor.exibicao}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>
                  {i.resumo}
                  {i.resumo.length >= 190 && "…"}
                </p>
              </CardContent>
              <CardFooter className="text-muted-foreground">
                <span>
                  <strong className="text-foreground">{i.apoiosCount}</strong>{" "}
                  {i.apoiosCount === 1 ? "apoio" : "apoios"}
                </span>
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
