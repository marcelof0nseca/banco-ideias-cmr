import { prisma } from "@/lib/prisma";
import { STATUS_PUBLICOS } from "@/lib/maquina-status";
import type { IdeiaPublicaResumo } from "@/types/publico";

/**
 * Consulta publica (dono: Pessoa A, Fase 2). Placeholder funcional: ja le do
 * banco e NAO expoe dado pessoal, exercitando o contrato types/publico.ts.
 */
export const dynamic = "force-dynamic";

export default async function ConsultaPage() {
  const ideias = await prisma.ideia.findMany({
    where: { status: { in: STATUS_PUBLICOS } },
    orderBy: { criadoEm: "desc" },
    include: { tema: true, autor: true },
  });

  const publicas: IdeiaPublicaResumo[] = ideias.map((i) => ({
    protocolo: i.protocolo,
    titulo: i.titulo,
    tema: i.tema.nome,
    status: i.status,
    autor: {
      exibicao: i.autor.nomePublico ? i.autor.nome : "Cidada(o) do Recife",
      tipo: i.autor.tipo,
    },
    apoiosCount: i.apoiosCount,
    resumo: i.descricao.slice(0, 190),
    rpa: i.rpa,
    gabinetesInteressados: [],
    criadoEm: i.criadoEm.toISOString(),
  }));

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-azul-cmr">
        Consulta publica de ideias
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        {publicas.length} ideia(s) no acervo. Tela em construcao (Fase 2).
      </p>
      <ul className="mt-6 space-y-3">
        {publicas.map((i) => (
          <li
            key={i.protocolo}
            className="rounded-lg border border-neutral-300 bg-white p-4"
          >
            <h2 className="font-semibold text-azul-cmr">{i.titulo}</h2>
            <p className="text-xs text-neutral-600">
              {i.protocolo} - {i.tema} - {i.autor.exibicao} - {i.apoiosCount}{" "}
              apoios
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
