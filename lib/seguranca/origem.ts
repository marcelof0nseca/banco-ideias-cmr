/**
 * Protecao contra CSRF nas rotas de API que usam o cookie de sessao
 * (especificacao, secao 8.4). DONO: Pessoa B.
 *
 * Duas camadas:
 *  1. o cookie e SameSite=Lax: o navegador nao o envia em POST de outro site;
 *  2. aqui: se o navegador informou Origin, ela precisa ser o proprio host.
 * Server Actions ja tem essa checagem embutida no Next.
 */
export function mesmaOrigem(req: Request): boolean {
  const origem = req.headers.get("origin");
  if (!origem) return true; // clientes nao-navegador; ainda exigem a sessao
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origem).host === host;
  } catch {
    return false;
  }
}
