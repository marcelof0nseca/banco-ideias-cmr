/**
 * Regioes Politico-Administrativas do Recife (1..6). Usadas no cadastro
 * (passo 2) e nos indicadores agregados. DONO: Pessoa A.
 */
export const RPAS: Record<number, string> = {
  1: "RPA 1 — Centro",
  2: "RPA 2 — Norte",
  3: "RPA 3 — Noroeste",
  4: "RPA 4 — Oeste",
  5: "RPA 5 — Sudoeste",
  6: "RPA 6 — Sul",
};

export const NUMEROS_RPA = [1, 2, 3, 4, 5, 6] as const;

/**
 * Os 94 bairros oficiais do Recife por RPA (Lei Municipal 16.293/1997).
 * Exibidos no cadastro porque muita gente sabe o bairro mas nao a RPA.
 */
export const BAIRROS_POR_RPA: Record<(typeof NUMEROS_RPA)[number], readonly string[]> = {
  1: [
    "Bairro do Recife", "Boa Vista", "Cabanga", "Coelhos", "Ilha do Leite", "Ilha Joana Bezerra",
    "Paissandu", "Santo Amaro", "Santo Antônio", "São José", "Soledade",
  ],
  2: [
    "Água Fria", "Alto Santa Terezinha", "Arruda", "Beberibe", "Bomba do Hemetério", "Cajueiro",
    "Campina do Barreto", "Campo Grande", "Dois Unidos", "Encruzilhada", "Fundão", "Hipódromo",
    "Linha do Tiro", "Peixinhos", "Ponto de Parada", "Porto da Madeira", "Rosarinho", "Torreão",
  ],
  3: [
    "Aflitos", "Alto do Mandu", "Alto José Bonifácio", "Alto José do Pinho", "Apipucos",
    "Brejo da Guabiraba", "Brejo de Beberibe", "Casa Amarela", "Casa Forte", "Córrego do Jenipapo",
    "Derby", "Dois Irmãos", "Espinheiro", "Graças", "Guabiraba", "Jaqueira", "Macaxeira",
    "Mangabeira", "Monteiro", "Morro da Conceição", "Nova Descoberta", "Parnamirim", "Passarinho",
    "Pau-Ferro", "Poço da Panela", "Santana", "Sítio dos Pintos", "Tamarineira", "Vasco da Gama",
  ],
  4: [
    "Caxangá", "Cidade Universitária", "Cordeiro", "Engenho do Meio", "Ilha do Retiro", "Iputinga",
    "Madalena", "Prado", "Torre", "Torrões", "Várzea", "Zumbi",
  ],
  5: [
    "Afogados", "Areias", "Barro", "Bongi", "Caçote", "Coqueiral", "Curado", "Estância",
    "Jardim São Paulo", "Jiquiá", "Mangueira", "Mustardinha", "San Martin", "Sancho", "Tejipió", "Totó",
  ],
  6: ["Boa Viagem", "Brasília Teimosa", "Cohab", "Ibura", "Imbiribeira", "Ipsep", "Jordão", "Pina"],
};

/** Todos os bairros em ordem alfabetica (sugestoes do campo Bairro). */
export const TODOS_BAIRROS: readonly string[] = Object.values(BAIRROS_POR_RPA)
  .flat()
  .sort((a, b) => a.localeCompare(b, "pt-BR"));

/** Compara nomes ignorando acentos, maiusculas, hifens e espacos extras. */
function normalizar(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[-\s]+/g, " ")
    .trim();
}

const RPA_POR_BAIRRO = new Map(
  NUMEROS_RPA.flatMap((rpa) => BAIRROS_POR_RPA[rpa].map((b) => [normalizar(b), rpa] as const)),
);

/** RPA de um bairro digitado ("boa viagem" -> 6), ou null se nao for um bairro oficial. */
export function rpaDoBairro(bairro: string): number | null {
  return RPA_POR_BAIRRO.get(normalizar(bairro)) ?? null;
}
