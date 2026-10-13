# Banco de Ideias Legislativas — Câmara Municipal do Recife

Sistema de participação popular (Resolução nº 2.690/2018): o cidadão apresenta
ideias legislativas, a Secretaria faz a triagem, os gabinetes analisam e adotam,
e qualquer pessoa consulta o acervo. Especificação técnica completa em
[`docs/Banco-de-Ideias-CMR-Especificacao-Tecnica.pdf`](docs/Banco-de-Ideias-CMR-Especificacao-Tecnica.pdf).

**Stack:** Next.js 16 · TypeScript · PostgreSQL 16 · Prisma 7 · Tailwind 4.

> O protótipo navegável de validação está em
> [`prototipo/banco-de-ideias.html`](prototipo/banco-de-ideias.html) (abre com duplo clique).

## Pré-requisitos

- **Node.js 22+** e npm
- **PostgreSQL** — de uma das duas formas:
  - Docker: `docker compose up -d` (sobe um Postgres 16 na porta **5433**), ou
  - PostgreSQL já instalado na máquina (porta 5432)

## Rodando pela primeira vez

```bash
# 1. dependências
npm install

# 2. variáveis de ambiente
cp .env.example .env
#    edite o .env:
#    - DATABASE_URL conforme seu Postgres (Docker = porta 5433)
#    - gere as três chaves:
node -e "console.log('DOCUMENTO_CHAVE=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('DOCUMENTO_PEPPER=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('AUTH_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"

# 3. banco: aplica migrações + carga de dados fictícios
npm run db:migrate
npm run db:seed

# 4. sobe o sistema
npm run dev          # http://localhost:3000
```

Confira: `http://localhost:3000/consulta` deve listar as ideias de exemplo.

## Painel interno

Entre em `http://localhost:3000/login` com um dos usuários do seed (senha **`banco-ideias-2026`**,
só de desenvolvimento):

| Usuário | Perfil | Vai para |
|---|---|---|
| `triagem@exemplo.gov.br` | Secretaria · Triagem | `/triagem` — fila, aprovar, arquivar, revelar CPF |
| `gabinete@exemplo.gov.br` | Gabinete (Gabinete Ver. Teste) | `/gabinete` — acervo, analisar, adotar |
| `admin@exemplo.gov.br` | Administração | `/admin` — usuários, listas, LGPD, auditoria, CSV |

Para o **Acompanhar**: protocolo `BIL-2026-000006` + CPF `258.036.914-70` (ideia arquivada, mostra o motivo),
ou `BIL-2026-000001` + `529.982.247-25`.

## Produção

Imagem Docker multi-estágio (`Dockerfile`) e modelo de implantação em `docker-compose.prod.yml`.
Passo a passo para a TI em [`docs/implantacao/guia-ti.md`](docs/implantacao/guia-ti.md).
O CI (`.github/workflows/ci.yml`) roda tipos, lint, testes, build, um teste de fumaça com PostgreSQL
real, `npm audit`, varredura de segredos e o build da imagem.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o Next em desenvolvimento |
| `npm run verificar` | **typecheck + lint + testes** — é o nosso "pronto" |
| `npm run build` | Build de produção |
| `npm run db:migrate` | Aplica migrações no banco do `.env` |
| `npm run db:seed` | Carga de dados fictícios |
| `npm run db:studio` | Inspeciona o banco no navegador |
| `npm run db:reset` | **Apaga** e recria o banco com as migrações + seed |

## Organização

Divisão de trabalho e regras da dupla em [`CONTRIBUTING.md`](CONTRIBUTING.md).
Regras e padrões do front-end (leitura obrigatória antes de alterar telas) em
[`docs/frontend.md`](docs/frontend.md).
Integração com o portal da Câmara em
[`docs/implantacao/integracao-portal.md`](docs/implantacao/integracao-portal.md).

```
app/(pages)/(publico)/   telas sem login            (Pessoa A)
app/(pages)/(painel)/    triagem, gabinete, admin   (Pessoa B)
lib/             regras de domínio e utilitários
prisma/          schema, migrações, seed    (Pessoa B)
types/publico.ts contrato de dados públicos (Pessoa A)
nginx/           configs dos 2 cenários de integração (Pessoa B)
```

## Observação sobre versões

O `latest` do npm hoje traz **Prisma 8 (release candidate)** e **TypeScript 7**,
que ainda quebram parte do ecossistema (o `typescript-eslint` não suporta TS 7).
Por isso o projeto fixa **Prisma 7.10** e **TypeScript 5.9** — versões estáveis e
compatíveis. Não troque sem rodar `npm run verificar`.
