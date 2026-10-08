import { StatusIdeia } from "@/prisma/gen/client";
import { calcularIndicadores, type Indicadores } from "./indicadores";
import { prisma } from "./prisma";

/**
 * Carrega do banco so o necessario para os indicadores (nenhum dado de
 * Autor) e calcula. Usado por /indicadores e GET /api/indicadores.
 *
 * O volume esperado (milhares de ideias) cabe em memoria; se crescer, trocar
 * por agregacoes SQL mantendo calcularIndicadores como referencia de teste.
 */
export async function carregarIndicadores(): Promise<Indicadores> {
  const [ideias, tramitacoes] = await Promise.all([
    prisma.ideia.findMany({
      select: { id: true, criadoEm: true, status: true, rpa: true, tema: { select: { nome: true } } },
    }),
    prisma.tramitacao.findMany({
      where: {
        statusNovo: { in: [StatusIdeia.DISPONIVEL, StatusIdeia.ARQUIVADA, StatusIdeia.ADOTADA] },
      },
      select: { ideiaId: true, statusAnterior: true, statusNovo: true, gabinete: true, criadoEm: true },
    }),
  ]);

  return calcularIndicadores(
    ideias.map((i) => ({ id: i.id, criadoEm: i.criadoEm, status: i.status, rpa: i.rpa, tema: i.tema.nome })),
    tramitacoes,
  );
}
