# Como trabalhamos nesta dupla

Um repositório só, com **donos por pasta** e nenhum envio direto ao `main`.
Cada um revisa os PRs do outro (exigência da especificação, seção 8.7).

## Donos por pasta

| Pasta / arquivo | Dono |
|---|---|
| `app/(pages)/(publico)/*`, `app/api/ideias`, `app/api/acompanhar`, `app/api/dados-abertos`, `app/api/indicadores` | **A** |
| `components/ui`, `components/layout`, `types/publico.ts`, `lib/sistema/url.ts`, `lib/ideias/protocolo.ts` | **A** |
| `app/(pages)/(painel)/*`, `app/api/ideias/[id]/tramitar`, `app/api/ideias/[id]/revelar-documento`, `app/api/admin`, `proxy.ts` | **B** |
| `prisma/*`, `lib/seguranca/documento.ts`, `lib/tramitacao/maquina-status.ts`, `lib/tramitacao/tramitacao.ts`, `lib/seguranca/limite.ts`, `lib/seguranca/auth.ts` | **B** |
| `nginx/*`, `Dockerfile`, `docker-compose*.yml`, `.github/workflows` | **B** |
| `e2e/*` (Playwright) | ambos |

## Regras

- Ramos `a/<tarefa>` e `b/<tarefa>`; PR pequeno, revisado pelo outro antes do merge.
- **Mudança em contrato** (tabela de Contratos no plano) só entra com os dois de acordo no PR.
- **Esquema do banco (`prisma/schema.prisma`) só é alterado por B.** A pede a mudança por _issue_.
- Nenhum segredo no repositório; banco local sempre com dados fictícios (CPF de teste `529.982.247-25`).
- **Pronto** = `npm run verificar` passando (typecheck + lint + testes), axe-core sem violação séria, revisão aprovada.
- Conversa rápida de 15 min três vezes por semana; no fim de cada fase, os dois rodam o fluxo ponta a ponta juntos.

## Contratos compartilhados (assinaturas já no repo)

Quem consome usa o **stub** até a versão real chegar. Stubs lançam erro
explícito (`"... stub - implementacao pendente"`) para não passarem despercebidos.

| Contrato | Arquivo | Dono | Estado |
|---|---|---|---|
| Esquema, migrações, carga fictícia | `prisma/schema.prisma`, `prisma/seed.ts` | B | **pronto** |
| Documento (validar, cifrar, hash, máscara) | `lib/seguranca/documento.ts` | B | **pronto + testado** |
| Máquina de estados | `lib/tramitacao/maquina-status.ts` | B | **pronto + testado** |
| Gravação de tramitação | `lib/tramitacao/tramitacao.ts` | B | `registrarCriacao` pronto; `transitar` stub |
| Limite de taxa | `lib/seguranca/limite.ts` | B | stub |
| Geração de protocolo | `lib/ideias/protocolo.ts` | A | stub (helpers prontos) |
| Tipos públicos sem dado pessoal | `types/publico.ts` | A | **pronto** |
| Montagem de URLs / basePath | `lib/sistema/url.ts` | A | **pronto** |

## Comandos

```bash
npm run dev          # sobe o Next em http://localhost:3000
npm run verificar    # typecheck + lint + testes (o "pronto")
npm run db:migrate   # aplica migrações no banco do .env
npm run db:seed      # carga de dados fictícios
npm run db:studio    # inspeciona o banco no navegador
```
