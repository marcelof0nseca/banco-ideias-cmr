/**
 * Dados institucionais exibidos no rodape. Precisam ser IGUAIS aos do portal
 * da Camara (especificacao, secao 12 - Parte A). Conferidos com o rodape de
 * https://www.recife.pe.leg.br em 08/10/2026.
 */
export const INSTITUCIONAL = {
  nome: "Câmara Municipal do Recife",
  endereco: ["Rua Princesa Isabel nº 410 - Boa Vista", "CEP 50.050-450 - Recife / PE"],
  telefone: "(81) 3301-1256",
  fax: "(81) 3301-1262",
  horario: ["De segunda a sexta-feira", "- das 7h30 às 18h"],
  listaTelefones: {
    gabinetes: "https://www.recife.pe.leg.br/lista-de-contatos/lista-de-contatos",
    // A lista "Administracao" do portal exige login interno (Plone): fica fora
    // do rodape, porque o cidadao nao tem acesso.
  },
  redes: [
    { rede: "facebook", rotulo: "Facebook", href: "https://www.facebook.com/camaradorecife" },
    { rede: "x", rotulo: "X (antigo Twitter)", href: "https://www.twitter.com/camararecife" },
    { rede: "youtube", rotulo: "YouTube", href: "https://www.youtube.com/camaradorecife" },
    { rede: "instagram", rotulo: "Instagram", href: "https://www.instagram.com/camaradorecife" },
  ],
} as const;

export type RedeSocial = (typeof INSTITUCIONAL.redes)[number]["rede"];
