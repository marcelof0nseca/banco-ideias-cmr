/**
 * Regras de apresentacao publica do autor (especificacao, secao 9.1 e
 * criterio de aceite 6). DONO: Pessoa A.
 *
 * O nome so aparece com o consentimento especifico (Autor.nomePublico).
 */

export const AUTOR_ANONIMO = {
  FISICA: "Cidadão(ã) do Recife",
  JURIDICA: "Entidade do Recife",
} as const;

export function exibicaoAutor(autor: {
  nome: string;
  nomePublico: boolean;
  tipo: "FISICA" | "JURIDICA";
}): string {
  return autor.nomePublico ? autor.nome : AUTOR_ANONIMO[autor.tipo];
}
