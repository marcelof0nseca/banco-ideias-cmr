import { urlCamara } from "@/lib/url";

/**
 * Dados institucionais exibidos no rodape. Precisam ser IGUAIS aos do portal
 * da Camara (especificacao, secao 12 - Parte A).
 *
 * TODO(Pessoa A): conferir cada item com a equipe do portal antes da
 * homologacao. Itens null nao sao exibidos; links apontam para a pagina
 * inicial do portal ate recebermos os enderecos exatos.
 */
export const INSTITUCIONAL = {
  nome: "Câmara Municipal do Recife",
  endereco: "Rua Princesa Isabel, 410 - Boa Vista, Recife - PE",
  telefone: null as string | null,
  faleConosco: () => urlCamara(),
  ouvidoria: () => urlCamara(),
};
