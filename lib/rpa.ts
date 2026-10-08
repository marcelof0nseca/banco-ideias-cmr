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
