# Banco de Ideias CMR — Guia da Pessoa A (Público e portal)

> Documento de trabalho pessoal, derivado da **Especificação Técnica v1.0** (27/08/2026) e da **Divisão de implementação** (08/10/2026).
> Tudo o que está marcado como **(sugestão)** é proposta minha para acelerar o dia 1 — não está nos documentos originais e precisa ser acordado com a Pessoa B.

---

## 0. Resumo em 30 segundos

Você é dono(a) de **tudo o que o cidadão vê sem login** e da **ponte visual com o portal da Câmara**:

- **Telas:** cadastro em 4 passos, consulta pública, detalhe da ideia, Acompanhar, Indicadores, página de acessibilidade.
- **API pública:** `POST/GET /api/ideias`, `GET /api/ideias/{protocolo}`, `POST /api/ideias/{id}/apoiar`, `POST /api/acompanhar`, `GET /api/dados-abertos`, `GET /api/indicadores`.
- **Transversal:** identidade visual (tokens Tailwind), componentes acessíveis, eMAG/WCAG 2.1 AA, VLibras.
- **Portal (Parte A):** cabeçalho/rodapé institucional, links sem caminho fixo, SEO + Open Graph, texto/HTML da página no Plone.
- **Fases da especificação:** Fase 2 (fluxo público) e Fase 4 (apoios, indicadores, dados abertos).
- **Referência visual e de regras:** `prototipo/banco-de-ideias.html` (Fase 0, já pronto).

**Stack:** Next.js 15 (App Router) · TypeScript estrito · Tailwind · Prisma/PostgreSQL 16 (esquema é da B) · Zod na borda · Vitest + Playwright + axe-core.

**Princípio que guia tudo:** páginas públicas são **renderizadas no servidor** e funcionam **sem JavaScript**; respostas públicas **nunca** contêm CPF, e-mail, telefone ou IP.

---

## 1. O que é seu e o que não é

### 1.1 Pastas que você possui

| Pasta / arquivo | Observação |
|---|---|
| `app/(pages)/(publico)/*` | Todas as telas públicas |
| `app/api/ideias` | `POST` e `GET` lista, `GET /{protocolo}`, `POST /{id}/apoiar` |
| `app/api/acompanhar` | |
| `app/api/dados-abertos` | |
| `app/api/indicadores` | |
| `components/ui/*` | Componentes acessíveis (B consome no painel) |
| `components/layout/*` | Cabeçalho/rodapé institucional (B consome) |
| `types/publico.ts` | Tipos públicos sem dado pessoal |
| `lib/sistema/url.ts` | Montagem de URLs com caminho base (dividido com B) |
| `lib/ideias/protocolo.ts` | Geração de `BIL-AAAA-NNNNNN` |
| `e2e/*` | **Compartilhado** com B |

### 1.2 Pastas da B (não mexa; peça por issue/PR)

`app/(pages)/(painel)/*`, `app/api/ideias/[id]/tramitar`, `app/api/ideias/[id]/revelar-documento`, `app/api/admin`, `middleware.ts`, `prisma/*`, `lib/seguranca/documento.ts`, `lib/tramitacao/maquina-status.ts`, `lib/tramitacao/tramitacao.ts`, `lib/seguranca/limite.ts`, `lib/seguranca/auth.ts`, `nginx/*`, `Dockerfile`, `docker-compose*.yml`, `.github/workflows`.

> ⚠️ **Esquema do banco só a B altera.** Se precisar de campo/índice novo (ex.: índice de busca textual para "ideias semelhantes"), abra uma issue.

---

## 2. Contratos

No **dia 1**, vocês dois escrevem juntos as **assinaturas** (só tipos, sem implementação) e fazem commit. Depois cada um implementa o seu; quem consome usa **stub** até a versão real chegar.

### 2.1 Contratos que você entrega

| Contrato | Arquivo | Quem consome | Prazo |
|---|---|---|---|
| Tipos públicos sem dado pessoal | `types/publico.ts` (`IdeiaPublica`, `EventoPublico`) | B (testes de vazamento) | **Fim da semana 1** |
| Caminho base / URLs | `lib/sistema/url.ts` + `NEXT_PUBLIC_BASE_PATH` | Ambos | **Semana 1** |
| Geração de protocolo | `lib/ideias/protocolo.ts` | B (busca na Triagem) | Semana 2 |
| Tokens de cor e componentes | `tailwind.config.ts`, `components/ui/*` | B (painel) | Semana 2 |
| Layout institucional | `components/layout/*` | B | Semana 2 |

### 2.2 Contratos que você consome (da B)

| Contrato | Arquivo | Para quê | Prazo | Stub enquanto isso |
|---|---|---|---|---|
| Esquema + seed | `prisma/schema.prisma`, `prisma/seed.ts` | Tudo | Fim da semana 1 | Dados em memória/JSON |
| Documento | `lib/seguranca/documento.ts` (validar CPF/CNPJ, cifrar, decifrar, hash com pepper, máscara) | Cadastro, apoio, acompanhar | Fim da semana 1 | Validação de DV real (é simples) + hash fake |
| Máquina de estados / tramitação | `lib/tramitacao/maquina-status.ts`, `lib/tramitacao/tramitacao.ts` (`registrarCriacao`, `transitar`) | Cadastro cria linha `RECEBIDA`; linha do tempo lê `publica = true` | Semana 2 | Insert direto da linha `RECEBIDA` |
| Limite de taxa | `lib/seguranca/limite.ts` | Rotas públicas de `POST` | Semana 2 | Função que sempre permite |

### 2.3 Proposta de assinaturas para o dia 1 **(sugestão)**

```ts
// types/publico.ts — NADA de documento, e-mail, telefone, IP, ipHash, usuarioId, tokenAcompHash
export type StatusPublico = 'DISPONIVEL' | 'EM_ANALISE' | 'ADOTADA' | 'ARQUIVADA';

export interface IdeiaPublica {
  protocolo: string;            // "BIL-2026-000123"
  titulo: string;
  descricao: string;
  tema: string;
  status: StatusPublico;
  rpa: number | null;           // agregado/filtro (1..6)
  autorExibicao: string;        // nome se nomePublico = true, senão "Cidadão(ã) do Recife"
  apoiosCount: number;
  publicadoEm: string;          // ISO
}

export interface EventoPublico {   // vem de Tramitacao com publica = true
  statusNovo: StatusPublico;
  gabinete: string | null;
  criadoEm: string;               // ISO
  // sem justificativa: o motivo de arquivamento NÃO é público
}

export interface IdeiaPublicaDetalhe extends IdeiaPublica {
  linhaDoTempo: EventoPublico[];
}
```

> Ponto para decidir com a B: a ideia **ARQUIVADA** aparece na consulta pública? A spec diz "visível: **Parcial**" (o motivo só vai ao autor). Proposta: aparece com o selo "Arquivada", sem motivo. **Confirmar.**
> Outra: `rpa` vem de `Autor` (dado pessoal no inventário 9.2, "público agregado"). Para exibir por ideia/filtrar, confirme se é aceitável — se não, use só em `/api/indicadores` (agregado).

```ts
// lib/sistema/url.ts
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';   // '' no subdomínio
export function url(caminho: string): string;          // url('/consulta') -> '/participacao-popular/banco-de-ideias/consulta'
export function urlAbsoluta(caminho: string): string;  // para canonical, OG e sitemap (usa origem configurada)
export function urlIdeia(protocolo: string): string;   // url(`/consulta/${protocolo}`)
```

```ts
// lib/ideias/protocolo.ts
export const REGEX_PROTOCOLO = /^BIL-\d{4}-\d{6}$/;
export function formatarProtocolo(ano: number, seq: number): string;   // BIL-2026-000123
export function validarProtocolo(p: string): boolean;
export async function gerarProtocolo(tx: Prisma.TransactionClient, ano?: number): Promise<string>;
// usa o contador por ano / sequência no Postgres (lacuna do dia 1, a B cria no esquema)
```

### 2.4 Lacunas da spec a decidir no dia 1 (a B põe no esquema — mas te afetam)

- **Tabela de temas** e de **motivos de arquivamento** (listas controladas) → você usa no select de tema e nos filtros.
- **Versão do aviso de privacidade** gravada junto ao consentimento → você envia a versão no `POST /api/ideias`.
- **Contador de protocolo por ano** → base do `lib/ideias/protocolo.ts`.
- **Campo de versão na Ideia** (controle de concorrência / 409) → não te afeta diretamente.
- Tabela de auditoria não-tramitação → só da B.

---

## 3. Cronograma da sua trilha

| Semana | Foco | Ponto de sincronização |
|---|---|---|
| 1 | Fundação visual + contratos | Contratos commitados |
| 2–3 | Fluxo público (Fase 2) | **Fim da semana 3:** ideia cadastrada na sua tela é triada no painel da B e aparece na consulta pública |
| 4–5 | Participação e transparência (Fase 4) | Fluxo ponta a ponta juntos |
| 6–7 | Acessibilidade, aceite, Parte A do portal | **Semana 7:** teste final juntos nos dois cenários |

Estimativa total da dupla: 6 a 8 semanas.

---

## 4. Semana 1 — Fundação visual

### Checklist
- [ ] Tokens de cor e tipografia no `tailwind.config.ts`, derivados do portal (**confirmar com o manual de identidade visual** — dependência da Câmara)
- [ ] `Campo` — `label` associado, instrução **antes** do campo, `aria-describedby` para dica/erro, erro anunciado em região `aria-live`
- [ ] `Botao`
- [ ] `SeloStatus` — **cor + texto + forma** (nunca só cor)
- [ ] `Alerta`
- [ ] `Tabela` — cabeçalhos associados (`<th scope>`), `<caption>`
- [ ] Cabeçalho e rodapé institucionais (`components/layout/*`)
- [ ] Atalho "Ir ao conteúdo" (primeiro elemento focável, alvo `#conteudo`)
- [ ] Link fixo "Voltar ao site da Câmara"
- [ ] `lib/sistema/url.ts` e `types/publico.ts`

### Regras de design obrigatórias
- Contraste mínimo **4,5:1** em texto e **3:1** em componentes/bordas de foco.
- **Foco sempre visível** (não remover `outline` sem substituto).
- Mobile first; legível a **320 px** e com **zoom de 200%** sem rolagem horizontal.
- Sem fontes/recursos externos (o único recurso externo permitido é o **VLibras**). Fonte: auto-hospedada ou de sistema.

### `SeloStatus` (sugestão de mapeamento)

| Status | Texto | Forma (sugestão) |
|---|---|---|
| `DISPONIVEL` | Disponível | círculo |
| `EM_ANALISE` | Em análise | losango |
| `ADOTADA` | Adotada | estrela/check |
| `ARQUIVADA` | Arquivada | quadrado |

(`RECEBIDA` e `EM_TRIAGEM` não são públicas, mas o selo pode ser usado no painel da B e no Acompanhar.)

---

## 5. Semanas 2 e 3 — Fluxo público (Fase 2)

### 5.1 Assistente de cadastro em 4 passos

Motivo do assistente: formulário longo tem abandono alto no celular e não evita duplicidade.

| Passo | Conteúdo | Regras |
|---|---|---|
| **1. Sua ideia já existe?** | Busca textual no acervo publicado | Havendo semelhante, oferecer **"Apoiar esta ideia"**. É **opcional** — o cidadão pode seguir. (A busca completa entra na semana 4–5; na semana 2 pode ser um placeholder.) |
| **2. A ideia** | Tema (lista controlada), título (até **150**), descrição (até **5.000**, **contador visível**), bairro e RPA (1..6) | **Rascunho preservado localmente** entre passos (ex.: `sessionStorage`, nunca com CPF) |
| **3. Identificação** | Tipo de autor (PF/PJ), CPF ou CNPJ, nome/razão social, e-mail, telefone opcional | Validação de **dígito verificador** (não só máscara). **Dois consentimentos separados e não pré-marcados**: (a) ciência do tratamento de dados; (b) autorização opcional de divulgação do nome. Aviso de privacidade em linguagem simples **no próprio passo** |
| **4. Confirmação** | **Protocolo em destaque**, token de acompanhamento, **comprovante para download**, prazo de triagem | Prazo: 15 dias úteis (parametrizável) |

**Detalhes importantes:**
- Erro de CPF/CNPJ **bloqueia o envio**, com mensagem **associada ao campo** e **anunciada a leitores de tela** (aceite 9).
- Ao mudar de passo, mover o foco para o título do passo (`<h2 tabindex="-1">`) e anunciar "Passo 2 de 4".
- **Funciona sem JS?** As telas de consulta precisam funcionar sem JS. Para o assistente, o ideal é progressive enhancement (Server Actions / `<form>` normal + validação também no servidor). No mínimo: **toda validação é refeita no servidor**.
- **Atenção LGPD sobre o consentimento (a):** a coleta de CPF **não é baseada em consentimento** (é obrigação normativa, art. 7º II/III e 23). A caixa (a) é **ciência** do tratamento, não "autorização"; o cidadão não pode desmarcar a identificação e participar. Só a divulgação do nome (b) é consentimento real, opcional e revogável. Redija os textos assim.
- **Expectativa do cidadão (risco da seção 14):** deixar claro em cada etapa que a adoção é **decisão discricionária do parlamentar**.
- Não guardar CPF em `localStorage`/`sessionStorage`. Nenhum token em `localStorage`.

### 5.2 `POST /api/ideias`

Requisitos:
- **Chave de idempotência** (duplo clique / voltar do navegador não cria segundo registro).
- **Campo-armadilha** invisível (honeypot) — escondido de forma que leitor de tela também ignore (`aria-hidden`, `tabindex="-1"`, fora da tela; **não** só `display:none` se quiser pegar bots melhores, mas cuidado com acessibilidade).
- **Tempo mínimo de preenchimento** (timestamp de início assinado/validado no servidor).
- **Limite de taxa** via `lib/seguranca/limite.ts`: **5 cadastros/h por IP**, **3 ideias/dia por documento** → 429.
- Validação de esquema com **Zod** na borda.
- Na **mesma transação**: upsert do `Autor` (via `lib/seguranca/documento.ts`: cifrado + hash + máscara), cria `Ideia` com `status = RECEBIDA` e protocolo de `lib/ideias/protocolo.ts`, grava `tokenAcompHash` (nunca o token em claro), chama `registrarCriacao` da B, grava `consentimentoEm` + **versão do aviso**.
- Retorna protocolo e token (o token em claro só existe nesta resposta e no comprovante).

**Contrato sugerido (sugestão):**

```jsonc
// Request — Cabeçalho: Idempotency-Key: <uuid gerado no início do assistente>
{
  "tema": "MOBILIDADE",
  "titulo": "…",            // ≤ 150
  "descricao": "…",         // ≤ 5000
  "bairro": "Boa Vista",
  "rpa": 1,
  "tipoAutor": "FISICA",    // FISICA | JURIDICA
  "documento": "52998224725",
  "nome": "…",
  "email": "…",
  "telefone": null,
  "cienciaTratamento": true,           // obrigatório
  "autorizaNomePublico": false,        // opcional
  "versaoAviso": "2026-10-v1",
  "iniciadoEm": "<valor assinado>",    // tempo mínimo
  "site": ""                           // honeypot: tem que vir vazio
}

// 201 Created
{ "protocolo": "BIL-2026-000123", "token": "…", "prazoTriagem": "15 dias úteis" }

// Erros: 400 (esquema) · 422 (DV inválido, consentimento ausente) · 429 (limite)
// Reenvio com a mesma Idempotency-Key → mesma resposta 201, sem novo registro
```

### 5.3 `lib/ideias/protocolo.ts`
- Formato **`BIL-AAAA-NNNNNN`**, **único**, **sequencial por ano**.
- Use a sequência/contador por ano no Postgres (lacuna do dia 1). Gere **dentro da transação** do cadastro para não pular nem duplicar sob concorrência.
- Testes unitários: formato, virada de ano, concorrência (duas transações simultâneas).
- ⚠️ Risco da seção 14: pode já existir protocolo institucional (SEI). Se a Secretaria confirmar, o sistema deve **referenciar o número oficial**. Deixe a função isolada para trocar fácil.

### 5.4 Consulta pública — `/consulta`
- **SSR**, indexável, funciona sem JS (filtros como `<form method="get">` com query string).
- **Filtros:** tema, situação, período, RPA. **Ordenação:** mais recentes ou mais apoiadas. Paginação.
- Só lista ideias com status público (`DISPONIVEL`, `EM_ANALISE`, `ADOTADA` e, se decidido, `ARQUIVADA`).
- Índice já previsto: `@@index([status, publicadoEm])`.

### 5.5 Detalhe — `/consulta/BIL-2026-000123`
- Descrição completa, **linha do tempo pública** (só `Tramitacao` com `publica = true`), botão de **apoio**.
- **Nunca** mostrar motivo/justificativa de arquivamento.
- Autor: nome se `nomePublico = true`, senão **"Cidadão(ã) do Recife"** (aceite 6).
- Protocolo inválido/inexistente/não público → 404 (não revelar que existe uma ideia em triagem).
- SEO (semana 6–7, mas já deixe pronto): canonical, Open Graph (título + resumo para WhatsApp).

### 5.6 `GET /api/ideias` e `GET /api/ideias/{protocolo}`
- Retornam **apenas** `IdeiaPublica` / `IdeiaPublicaDetalhe`. Faça a projeção com `select` explícito no Prisma — **nunca** `include: { autor: true }` serializado.
- Mesmos filtros/ordenação/paginação da tela.

### 5.7 "Acompanhar minha ideia" — `POST /api/acompanhar`
- Autenticação leve por **protocolo + CPF** (ou **token do comprovante**). Sem conta.
- Exibe situação atual (inclusive `RECEBIDA`/`EM_TRIAGEM`), linha do tempo e, se arquivada, **o motivo + justificativa — só aqui**.
- **Limite de tentativas** (`lib/seguranca/limite.ts`) contra varredura de protocolos → 429.
- Mensagem de erro **genérica** ("protocolo ou documento não conferem") — não revelar se o protocolo existe.
- Comparação do documento por **hash** (`lib/seguranca/documento.ts`), nunca decifrando. Token comparado contra `tokenAcompHash`.
- Use `POST` (CPF nunca em query string/URL).

### Fim da semana 3 — marco
Uma ideia cadastrada pela **sua tela** precisa ser **triada no painel da B** e **aparecer na consulta pública**, com o mesmo protocolo. Primeiro teste real dos contratos.

---

## 6. Semanas 4 e 5 — Participação e transparência (Fase 4)

### 6.1 `POST /api/ideias/{id}/apoiar`
- Apoio **único por documento por ideia** — restrição `@@unique([ideiaId, documentoHash])` no banco.
- `apoiosCount` incrementado **na mesma transação** do `INSERT` em `Apoio`.
- Só em ideias com status que aceite apoio (sugestão: `DISPONIVEL` e `EM_ANALISE` — **confirmar**).
- Pede CPF/CNPJ (validado por DV) — e o documento **nunca** é guardado em claro, só `documentoHash`.
- Repetição → resposta clara ("você já apoiou esta ideia"), sem 500 por violação de unicidade.
- Limite de taxa nas rotas públicas de `POST`.
- Sem JS: `<form method="post">` que volta para o detalhe com mensagem.

### 6.2 Busca de ideias semelhantes (passo 1 do cadastro)
- **Busca textual do Postgres** (full-text, configuração `portuguese`). Precisa de índice/coluna → **peça à B por issue**.
- Mostra resultados com botão "Apoiar esta ideia" e "Minha ideia é diferente, continuar".

### 6.3 Painel de indicadores + `GET /api/indicadores`
Séries agregadas:
- Ideias **por tema** e **por RPA**
- **Tempo médio de triagem**
- **Taxa de aprovação** e **taxa de adoção**
- (Risco da seção 14 sugere também indicador público de **adoção por gabinete**.)

Gráficos acessíveis: sempre com **tabela de dados equivalente** e texto alternativo; sem depender só de cor.

### 6.4 `GET /api/dados-abertos`
- Acervo completo em **JSON e CSV** (ex.: `?formato=csv` ou `Accept`), **sem qualquer dado pessoal**.
- Licença de uso livre (LAI, Lei 12.527/2011).
- Coberto pelo aceite 5 (teste de vazamento).

---

## 7. Semanas 6 e 7 — Acessibilidade e aceite

### 7.1 Recursos de governo
- [ ] **VLibras** (único recurso externo permitido; ajuste a CSP com a B)
- [ ] Controles de **contraste** e **tamanho de fonte** (persistência local é ok — é conveniência)
- [ ] **Página de acessibilidade** com os atalhos

### 7.2 Verificação
- [ ] **axe-core** no Playwright (build falha em violação séria/crítica)
- [ ] **Lighthouse ≥ 95** em acessibilidade
- [ ] Roteiro **manual com NVDA** e **só teclado** em **cada tela**
- [ ] Teste com JS desabilitado nas páginas de consulta e detalhe
- [ ] 320 px e zoom 200% sem rolagem horizontal

### 7.3 Critérios de aceite que são seus

| # | Verificação | Como provar |
|---|---|---|
| **5** | HTML da consulta pública, `/api/ideias` e `/api/dados-abertos` **não contêm CPF, e-mail, telefone nem IP** | Teste e2e que cadastra com dados conhecidos (CPF de teste `529.982.247-25`, e-mail único) e procura essas strings nas respostas (B usa seus tipos nos testes de vazamento) |
| **6** | Autor sem autorização aparece como **"Cidadão(ã) do Recife"** | e2e com consentimento desmarcado |
| **8** | Lighthouse ≥ 95; axe-core sem violação séria; fluxo completo por teclado e NVDA | CI + roteiro manual documentado |
| **9** | CPF com DV inválido é rejeitado **com mensagem no campo** | Unitário + e2e (inclua o anúncio em `aria-live`) |

Também participa do **aceite 1** (ponta a ponta: cadastrar → triar → gabinete assumir → consulta pública, mesmo protocolo).

---

## 8. Integração com o portal — Parte A

O sistema precisa funcionar nos **dois encaixes** (quem escolhe é a TI da Câmara), trocando **só uma variável de ambiente**:

| Cenário | `NEXT_PUBLIC_BASE_PATH` |
|---|---|
| Subdomínio `bancodeideias.recife.pe.leg.br` (recomendado) | `''` |
| Rota `/participacao-popular/banco-de-ideias` atrás do proxy do portal | `/participacao-popular/banco-de-ideias` |

**Iframe está fora** (o sistema envia `X-Frame-Options: DENY`).

### Checklist Parte A
- [ ] **Nenhum** link ou recurso com caminho fixo `/`: tudo por `next/link`, `next/image` ou `lib/sistema/url.ts` (inclui `<form action>`, `fetch`, `redirect()`, favicon, comprovante para download, links do CSV)
- [ ] Cabeçalho com **faixa institucional** + **"Voltar ao site da Câmara"**
- [ ] Rodapé com **endereço, telefone, Fale Conosco e Ouvidoria** iguais aos do portal
- [ ] **URL canônica**, `sitemap.xml` e **Open Graph** em cada `/consulta/{protocolo}` (link no WhatsApp mostra título e resumo)
- [ ] **Texto e HTML pronto** da nova página de apresentação no Plone: o que é o programa, base normativa (Resolução nº 2.690/2018), como funciona a triagem, botões **"Participar"** e **"Consultar ideias"** — para a equipe do portal colar

> Dica: um teste automático simples que faz `grep` por `href="/` e `src="/` no HTML renderizado com `BASE_PATH` não vazio pega quase todos os caminhos fixos.

Parte B (da colega): `basePath` do Next, cookies, os dois `nginx/*.conf`, `docker-compose.integracao.yml`, guia de implantação.

### Teste final juntos (semana 7)
- [ ] Fluxo completo nos **dois cenários** simulados
- [ ] Abrir **link compartilhado** de ideia e cair direto na página certa
- [ ] Navegar portal → sistema → portal **só com teclado** e com **NVDA**
- [ ] Nenhuma página carrega recurso externo **além do VLibras**

---

## 9. Regras de segurança e LGPD que afetam o front

| Regra | O que você faz |
|---|---|
| Respostas públicas sem dado pessoal | `select` explícito; nunca serializar `Autor`; tipos de `types/publico.ts` como retorno das rotas |
| CPF em claro só em memória na gravação | Normalize (só dígitos) e entregue a `lib/seguranca/documento.ts`; não logar; não ecoar de volta |
| CPF nunca em URL | Acompanhar e Apoiar via `POST` |
| Nada de token em `localStorage` | Rascunho local só com campos da ideia, nunca documento |
| CSP restritiva **sem `unsafe-inline`** | Evitar `<script>`/`style` inline; usar nonce se o Next exigir (alinhar com a B) |
| Saída escapada | Não usar `dangerouslySetInnerHTML` com conteúdo do cidadão |
| Nenhum rastreador/analytics de terceiro | Nada de Google Fonts, GA, CDN externa |
| Sem CAPTCHA | Honeypot + tempo mínimo + limites + DV + idempotência |
| Motivo de arquivamento | Só no Acompanhar, nunca na consulta |
| Mensagens genéricas | Acompanhar não revela se o protocolo existe |
| Logs | Sem CPF, senha ou token |

---

## 10. Perfis e situações (referência rápida)

| Situação | Pública? | Onde aparece no seu lado |
|---|---|---|
| `RECEBIDA` | Não | Só no Acompanhar |
| `EM_TRIAGEM` | Não | Só no Acompanhar |
| `DISPONIVEL` | Sim | Consulta, detalhe, apoio |
| `EM_ANALISE` | Sim | Consulta, detalhe, apoio |
| `ADOTADA` | Sim | Consulta, detalhe |
| `ARQUIVADA` | Parcial | Motivo só no Acompanhar |

Grafo (é da B, mas a linha do tempo reflete): `RECEBIDA → EM_TRIAGEM → DISPONIVEL ⇄ EM_ANALISE → ADOTADA`; arquivamento a partir de `EM_TRIAGEM`, `DISPONIVEL`, `EM_ANALISE` e (Admin) `ADOTADA`.

---

## 11. Regras de trabalho em dupla

- Um repositório, donos por pasta, **nenhum push direto no `main`**.
- Branches **`a/<tarefa>`** (as suas). PR pequeno, revisado pela B antes do merge. Você revisa os PRs da B.
- Mudança em **contrato** só entra com os dois de acordo no PR.
- Esquema do banco: só a B; você pede por issue.
- Nenhum segredo no repositório; banco local só com dados fictícios. **CPF de teste: `529.982.247-25`**.
- **Pronto =** testes passando + axe-core sem violação séria + revisão aprovada.
- Conversa de **15 min, 3x por semana**; no fim de cada fase, os dois rodam o fluxo ponta a ponta juntos.

---

## 12. Issues para abrir para a B logo no início (sugestão)

1. Tabela de **temas** (código + rótulo) e de **motivos de arquivamento** — e endpoint/função para você ler.
2. Campo de **versão do aviso de privacidade** junto a `consentimentoEm`.
3. **Contador de protocolo por ano** (sequência) — formato do acesso para `gerarProtocolo`.
4. Índice de **busca textual** (português) em `titulo` + `descricao` para "ideias semelhantes".
5. Armazenamento da **chave de idempotência** (tabela ou coluna com unicidade + TTL).
6. Assinatura de `lib/seguranca/limite.ts` para os três usos: cadastro por IP, cadastro por documento, tentativas do Acompanhar (e apoio).
7. CSP: liberar o domínio do **VLibras** e definir estratégia de nonce.

## 13. Perguntas em aberto (levar para a dupla / Secretaria)

- Ideias `ARQUIVADA` aparecem na consulta pública (sem motivo) ou somem?
- `rpa` pode aparecer por ideia na consulta, ou só agregado em indicadores?
- Quais status aceitam apoio?
- Formato do **comprovante** (PDF gerado no servidor? página imprimível?) — página imprimível é mais simples e acessível.
- O token de acompanhamento é exibido inteiro ou com cópia/QR? Validade?
- Texto oficial do **aviso de privacidade** (depende de homologação — dependência da Fase 2).
- Manual de identidade visual para confirmar os tokens.
- Existe protocolo institucional (SEI) já em uso?

---

## 14. Rotas e telas — mapa final

| Tela / rota | Tipo | Semana |
|---|---|---|
| `/` (apresentação + "Participar" / "Consultar ideias") | SSR | 1–2 |
| `/participar` (assistente 4 passos) | SSR + progressivo | 2–3 |
| `/consulta` | SSR | 2–3 |
| `/consulta/[protocolo]` | SSR + OG | 2–3 |
| `/acompanhar` | SSR + POST | 3 |
| `/indicadores` | SSR | 4–5 |
| `/acessibilidade` | SSR | 6 |
| `/sitemap.xml` | gerado | 6–7 |
| `POST /api/ideias` | API | 2–3 |
| `GET /api/ideias`, `GET /api/ideias/[protocolo]` | API | 2–3 |
| `POST /api/acompanhar` | API | 3 |
| `POST /api/ideias/[id]/apoiar` | API | 4–5 |
| `GET /api/indicadores` | API | 4–5 |
| `GET /api/dados-abertos` | API (JSON/CSV) | 4–5 |

(Os nomes `/participar` e `/` são **sugestão**; `/consulta`, `/consulta/{protocolo}` e as rotas `/api/*` vêm da spec.)
