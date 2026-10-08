# Integração com o site oficial da Câmara

Resumo executável do que fazemos no código e do que é ação da TI da Câmara.
Baseado na seção 12 da especificação.

## Os dois cenários (a TI escolhe)

| | Cenário 1 — subdomínio (recomendado) | Cenário 2 — rota no portal |
|---|---|---|
| Endereço | `bancodeideias.recife.pe.leg.br` | `www.recife.pe.leg.br/participacao-popular/banco-de-ideias` |
| `NEXT_PUBLIC_BASE_PATH` | `""` (vazio) | `/participacao-popular/banco-de-ideias` |
| Arquivo Nginx | `nginx/subdominio.conf` | `nginx/proxy-portal.conf` |
| Isolamento do portal | total | compartilha domínio com o Plone |

**A troca entre um e outro é só variável de ambiente — nenhuma linha de código muda.**
É o que garante que a decisão fique com a TI, sem retrabalho.

**Iframe está fora** (seção 12.1): quebra acessibilidade (exigência legal),
link compartilhável e SEO. O sistema envia `X-Frame-Options: DENY`.

## O que ENTREGAMOS (nós dois)

Parte A — aparência e ligações (Pessoa A):
- Nenhum link/recurso com caminho fixo `/`: tudo via `next/link`, `next/image` ou `lib/url.ts`.
- Cabeçalho com faixa institucional e “Voltar ao site da Câmara”; rodapé com endereço,
  telefone, Fale Conosco e Ouvidoria iguais aos do portal.
- URL canônica, `sitemap.xml` e Open Graph em cada `/consulta/{protocolo}`, para o link
  compartilhado no WhatsApp mostrar título e resumo.
- Texto e HTML prontos da página de apresentação no Plone (ver
  [`pagina-plone.html`](pagina-plone.html)).

Parte B — configuração e implantação (Pessoa B):
- `basePath` do Next lido de `NEXT_PUBLIC_BASE_PATH` (já em `next.config.ts`).
- Cookie de sessão com `Path` e domínio corretos nos dois cenários, sem colidir com o Plone.
- Dois arquivos Nginx prontos: `nginx/subdominio.conf` e `nginx/proxy-portal.conf`.
- Guia de implantação para a TI (ver [`guia-ti.md`](guia-ti.md)).

## O que é ação da TI da Câmara (dependências, seção 13.2)

1. Criar a entrada de **DNS** (subdomínio) **ou** a regra no proxy do portal.
2. Emitir o **certificado TLS**.
3. Provisionar **VM + PostgreSQL**.
4. **Colar a página de apresentação** no Plone (HTML pronto em `pagina-plone.html`),
   com os botões “Participar” e “Consultar ideias” apontando para o endereço escolhido.
5. Gerar e guardar os segredos (chave e pepper) — nunca no repositório.

## Teste de integração (nós dois, fim da semana 7)

- Rodar o fluxo completo (cadastrar → triar → gabinete assumir → consulta pública) nos dois cenários simulados.
- Abrir um link de ideia compartilhado e conferir que leva direto à página certa.
- Navegar do portal para o sistema e de volta só com teclado e com leitor de tela (NVDA).
- Confirmar que nenhuma página carrega recurso externo além do VLibras.
