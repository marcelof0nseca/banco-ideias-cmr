import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { assinarInicio, LIMITES, VERSAO_AVISO } from "@/lib/cadastro";
import { prisma } from "@/lib/prisma";
import { AssistenteCadastro } from "./AssistenteCadastro";

export const metadata: Metadata = {
  title: "Enviar uma ideia",
  description: "Apresente uma ideia legislativa à Câmara Municipal do Recife.",
};

/** Cada visita recebe chave de idempotencia e instante assinados novos. */
export const dynamic = "force-dynamic";

export default async function ParticiparPage() {
  const temas = await prisma.tema.findMany({
    where: { ativo: true },
    orderBy: { ordem: "asc" },
    select: { id: true, nome: true },
  });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-marca">Enviar uma ideia legislativa</h1>
      <p className="mt-1 text-muted-foreground">
        A identificação do autor é obrigatória (Resolução nº 2.690/2018). Seu CPF
        nunca aparece publicamente.
      </p>
      <AssistenteCadastro
        temas={temas}
        iniciadoEm={assinarInicio()}
        chaveIdempotencia={randomUUID()}
        versaoAviso={VERSAO_AVISO}
        limites={LIMITES}
      />
    </div>
  );
}
