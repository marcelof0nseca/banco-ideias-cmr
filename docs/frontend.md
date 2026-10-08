# Front-end do Banco de Ideias — guia para quem vai alterar

> **Leia inteiro antes de mexer em qualquer tela, componente ou cor.**
> Vale para pessoas e para IAs (Claude, Copilot, Cursor...). Cada regra aqui
> existe porque já quebrou algo ou porque é exigência legal (eMAG/WCAG, LGPD,
> Resolução nº 2.690/2018). Na dúvida, **não invente**: siga o padrão que já
> existe no arquivo vizinho.

---

## 1. Checklist rápido (antes de entregar qualquer mudança)

- [ ] `npm run verificar` passa (typecheck + lint + testes). **Nunca** afrouxe um teste para ele passar.
- [ ] A tela continua funcionando **sem JavaScript**.
- [ ] Nenhum link ou recurso com caminho fixo começando em `/` fora de `next/link` / `next/image` (ver §4.2).
- [ ] Nenhuma cor nova escrita direto no componente: cor nova vira token em `app/globals.css` com teste de contraste.
- [ ] Nenhum recurso externo (fonte do Google, CDN, script de terceiros, imagem remota).
- [ ] Nenhum `style={{...}}` inline.
- [ ] Texto visível com acentuação correta ("Câmara", "não", "região").
- [ ] Nenhum dado pessoal (CPF/CNPJ, e-mail, telefone, IP) em página ou resposta pública.
- [ ] Você conferiu a tela no navegador, não só o build.

---

## 2. Stack (versões novas — não confie na memória)

| Peça | Versão | Observação |
|---|---|---|
| Next.js | 16.4 (App Router) | **Tem mudanças em relação ao que a IA conhece.** Consulte `node_modules/next/dist/docs/` antes de usar uma API. |
| React | 19.3 | `useActionState`, Server Actions, `useSyncExternalStore`. |
| Tailwind CSS | 4.3 | **Não existe `tailwind.config.ts`.** Tokens ficam em `app/globals.css` (`@theme`). |
| shadcn/ui | sobre Base UI (`@base-ui/react`) | Componentes base em `components/ui/*.tsx` (minúsculos). |
| Zod | 4.6 | Validação na borda (Server Actions e API). |
| Vitest | 5 | Testes em `*.test.ts(x)` ao lado do código. |
| lucide-react | 1.x | **Não tem ícones de marca** (Facebook, Instagram...). Use SVG inline (ver `Rodape.tsx`). |

Comandos:

```bash
docker compose up -d   # PostgreSQL local na porta 5433
npm run dev            # http://localhost:3000
npm run verificar      # typecheck + lint + testes = "pronto"
```

---

## 3. Onde fica cada coisa

```
app/
├── (pages)/                     ← todas as telas (route group: NÃO aparece na URL)
│   ├── (publico)/               ← telas sem login — dono: Pessoa A
│   │   ├── layout.tsx           ← cabeçalho + conteúdo + rodapé
│   │   ├── (inicio)/page.tsx    ← "/"
│   │   ├── participar/          ← "/participar"  (assistente de cadastro em 4 passos)
│   │   ├── consulta/            ← "/consulta" e "/consulta/[protocolo]"
│   │   ├── acompanhar/          ← "/acompanhar"
│   │   └── indicadores/         ← "/indicadores"
│   └── (painel)/                ← telas internas — dono: Pessoa B
│       └── triagem/
├── api/                         ← rotas HTTP
├── globals.css                  ← TOKENS DE COR e estilos base
└── layout.tsx                   ← <html>, <body>, metadados
components/
├── layout/                      ← Cabecalho, NavPublica, Rodape, institucional.ts
└── ui/                          ← componentes acessíveis (ver §6)
lib/                             ← regras do sistema (não são telas; ver abaixo)
├── ideias/                      ← cadastro, consulta, apoio, acompanhamento, protocolo, publico
├── tramitacao/                  ← maquina-status (situações permitidas), tramitacao — Pessoa B
├── seguranca/                   ← documento (CPF/CNPJ cifrado), limite (taxa) — Pessoa B
├── indicadores/                 ← cálculos da tela Indicadores
├── regioes/                     ← rpa (6 RPAs e 94 bairros)
├── sistema/                     ← prisma (banco), url (caminho base), utils (cn do shadcn)
└── verificacao/                 ← verificador de acentuação
types/publico.ts                 ← tipos do que pode sair em público (sem dado pessoal)
```

### Regras de pasta

- **Cada tela tem a própria pasta** dentro de `app/(pages)/(publico)/` ou `(painel)/`. Arquivos da tela ficam juntos:
  `page.tsx` (servidor), `acoes.ts` (Server Action), `FormXxx.tsx` (cliente, se precisar).
- **Nunca crie uma pasta `pages/`** (sem parênteses). Na raiz ela liga o Pages Router antigo; dentro de `app/` ela vira `/pages/...` na URL. Por isso o nome é `(pages)`.
- **`lib/` é organizada por assunto.** Arquivo novo vai para a pasta do assunto, com o teste ao lado (`x.ts` + `x.test.ts`). Importe sempre pelo caminho completo (`@/lib/ideias/cadastro`); dentro da mesma pasta, `./cadastro`. O alias `utils` do shadcn aponta para `@/lib/sistema/utils` em `components.json`.
- Pasta entre parênteses `(nome)` = organização, não muda a URL. A home está em `(inicio)/` para ter pasta própria e continuar em `/`.
- **Donos por pasta** (ver `CONTRIBUTING.md`): `(publico)`, `components/*`, `lib/sistema/url.ts` são da Pessoa A; `(painel)`, `prisma/*`, `lib/seguranca/documento.ts`, `lib/tramitacao/maquina-status.ts`, `middleware.ts` são da Pessoa B. **O esquema do banco (`prisma/schema.prisma`) só a Pessoa B altera.**

---

## 4. Regras que não podem ser quebradas

### 4.1 Funciona sem JavaScript (melhoria progressiva)

As páginas públicas são renderizadas no servidor e **precisam funcionar com o JS desligado**.

- Formulários usam `<form action={serverAction}>`; o servidor revalida tudo.
- Use `<select>` nativo (`CampoSelecao`), não combobox de JS.
- Abrir/fechar sem JS: use `<details>/<summary>` (exemplo: `AjudaRpa` em `participar/AssistenteCadastro.tsx`).
- O JS só **melhora** (passo a passo, contagem de caracteres, preenchimento automático). Detectamos JS com `useSyncExternalStore` (`js` = `false` no servidor, `true` após hidratar).
- Componente de cliente (`"use client"`) só quando for realmente necessário; a `page.tsx` continua de servidor.

### 4.2 Caminho base (o mesmo build roda em dois endereços)

O sistema roda em `bancodeideias.recife.pe.leg.br` **ou** atrás do portal em `/participacao-popular/banco-de-ideias`, trocando só `NEXT_PUBLIC_BASE_PATH`.

- Link interno: `<Link href="/consulta">` (rota "crua"; o `next/link` põe o prefixo).
- `BotaoLink`: também rota crua. **Nunca** `caminho("/consulta")` dentro de `Link`/`BotaoLink` — duplica o prefixo.
- Fora do `Link` (canonical, Open Graph, `<a>` para download): use `caminho()`, `urlAbsoluta()`, `urlIdeia()` de `lib/sistema/url.ts`.
- Imagem: `import logo from "@/public/..."` + `next/image`.
- Link para o portal da Câmara: `urlCamara()`.

### 4.3 Sem recursos externos e sem estilo inline

- Proibido: `next/font/google`, `fonts.googleapis`, CDN, `@import url(https://...)`. O teste `components/ui/tema.test.ts` falha.
- Fonte é a do sistema (`--font-sans` em `globals.css`).
- Ícones: `lucide-react`; marcas (redes sociais) em **SVG inline** dentro do componente.
- **Sem `style={{ }}`**: a CSP proíbe estilo inline. Largura dinâmica usa classe (ex.: `barra-0` … `barra-100` em `GraficoBarras`).

### 4.4 Acessibilidade (eMAG + WCAG 2.1 AA) — obrigatória por lei

- **Contraste**: texto ≥ 4,5:1; borda de campo e foco ≥ 3:1. Conferido em `tema.test.ts` a partir dos tokens.
- **Campos**: sempre `CampoTexto` / `CampoAreaTexto` / `CampoSelecao` (ligam `label`, dica e erro por `aria-describedby`). Não monte `<input>` solto.
- **Cor nunca é o único sinal**: selos de situação têm texto **e** forma (`components/ui/status.ts`).
- **Foco visível** global em `globals.css` (`:focus-visible`). Não use `outline-none` para esconder foco. Em faixa azul (`data-fundo="escuro"`) o contorno muda para `foco-escuro`.
- **Conteúdo que aparece no hover** (WCAG 1.4.13): também precisa abrir por clique/toque e teclado, fechar com `Esc` e deixar o mouse passar para o painel. Modelo: `AjudaRpa`.
- Anúncios para leitor de tela: região `aria-live="polite"` (ver `anuncio` no assistente).
- Ícone decorativo: `aria-hidden="true"`. Botão só com ícone: `aria-label`.
- Movimento: animações com `motion-reduce:transition-none`.
- Títulos em ordem (`h1` por página, depois `h2`, `h3`).

### 4.5 Texto em português correto

- Todo texto que o cidadão vê precisa de acento correto. O teste `lib/verificacao/acentuacao.test.ts` varre `app`, `components`, `lib`, `types` e falha em "Camara", "nao", "regiao" etc.
- **Convenção do repositório**: comentários e nomes de variáveis ficam **sem acento** (ASCII); texto de tela fica **com acento**.
- Linguagem simples, voltada ao cidadão. Nada de jargão técnico na tela.

### 4.6 Privacidade (LGPD)

- Página e API públicas **nunca** devolvem CPF/CNPJ, e-mail, telefone, IP ou hashes. Use os tipos de `types/publico.ts`.
- Nome do autor só com consentimento: use `exibicaoAutor()` de `lib/ideias/publico.ts` (senão "Cidadão(ã) do Recife").
- Rascunho no navegador (`sessionStorage`) guarda **só** os campos da ideia, nunca o documento.

---

## 5. Identidade visual (cores)

Tudo em `app/globals.css`. **Não escreva hex em componente** (exceção histórica: bordas de selo em `status.ts`).

A cor do portal da Câmara é `#278fb0`, mas **texto branco sobre ela tem 3,72:1 e reprova o WCAG AA**. Por isso usamos o mesmo matiz (194°), um pouco mais escuro:

| Token (classe Tailwind) | Hex | Uso |
|---|---|---|
| `faixa` (`bg-faixa`) | `#227d9a` | Faixa do cabeçalho e rodapé (texto branco 4,70:1) |
| `marca` (`text-marca`) | `#1a5f75` | Títulos, aba ativa, texto de destaque |
| `marca-escuro` | `#1e6c86` | Abas inativas do menu |
| `marca-medio` | `#1f708a` | Ícones, subtítulos do assistente, selo "info" |
| `marca-claro` | `#278fb0` | **Cor exata do portal. Só decoração — nunca atrás de texto.** |
| `marca-fundo` | `#e2f3f9` | Fundos claros de destaque |
| `dourado` | `#ecb400` | Fio do brasão (borda sob o logo, aba ativa) |
| `foco-escuro` | `#ffd75e` | Contorno de foco sobre a faixa azul |
| `primary` | `#207792` | Botões e links (shadcn) |

Cuidados que já deram problema:

- **`text-white/80` sobre `bg-faixa` reprova o contraste.** Sobre a faixa, texto é `text-white` puro.
- O âmbar antigo (`#ffb020`) como foco sobre `#227d9a` dava 2,7:1; por isso o foco é `#ffd75e`.
- Mudou ou criou um token? **Acrescente o par em `tema.test.ts`** e rode os testes. Para calcular contraste, use a função `contraste()` exportada do próprio teste.
- Não existe modo escuro: variantes `dark:` só valem com a classe `.dark`, que o sistema não usa.

---

## 6. Componentes

### Use os componentes em português (contrato com a Pessoa B)

| Componente | Arquivo | Para quê |
|---|---|---|
| `Botao`, `BotaoLink`, `classesBotao` | `components/ui/Botao.tsx` | Botões. Variantes: `primario`, `secundario`, `sucesso`, `perigo`, `contorno`. |
| `CampoTexto`, `CampoAreaTexto`, `CampoSelecao` | `components/ui/Campo.tsx` | Campos de formulário acessíveis. Props: `id`, `rotulo`, `dica`, `erro`, `obrigatorio`. |
| `Alerta` | `components/ui/Alerta.tsx` | Mensagens (erro vira `role="alert"`). |
| `SeloStatus` + `status.ts` | `components/ui/` | Situação da ideia (texto + forma + cor). |
| `LinhaDoTempo` | `components/ui/LinhaDoTempo.tsx` | Tramitação pública. |
| `Tabela` | `components/ui/Tabela.tsx` | Tabela com `caption` e cabeçalhos com `scope`. |
| `GraficoBarras` | `components/ui/GraficoBarras.tsx` | Gráfico acessível (barras por classe, sem `style`). |

Os arquivos minúsculos (`button.tsx`, `card.tsx`, `field.tsx`...) são a base do shadcn. Podem ser usados direto (`Card`, `Separator`, `FieldGroup`), mas **prefira os componentes acima** quando existirem. Para adicionar um novo do shadcn: `npx shadcn@latest add <nome>` e confira se ele não traz fonte/recurso externo nem `style` inline.

**Pegadinha do `Card`**: ele tem `overflow-hidden`. Popover/painel dentro de um card é cortado. Solução usada no assistente: `<Card className="overflow-visible">`.

### Layout institucional (`components/layout/`)

- `Cabecalho.tsx`: faixa branca com logo + botão "Voltar ao site da Câmara"; faixa azul com nome do sistema e menu.
- `NavPublica.tsx`: itens do menu em `ITENS_MENU`. Tela nova no menu? Acrescente lá.
- `Rodape.tsx`: Mídias Sociais / Endereço / Horário, igual ao portal.
- `institucional.ts`: **todos os dados do rodapé** (endereço, telefones, horário, links das redes e listas de telefones). Precisam ser iguais aos do portal — altere aqui, não no JSX.

---

## 7. Padrão de uma tela com formulário

Exemplos completos: `acompanhar/` e `participar/`.

```
acompanhar/
├── page.tsx            ← servidor: título, texto, metadados; renderiza o formulário
├── FormAcompanhar.tsx  ← "use client": useActionState + campos + resultado
└── acoes.ts            ← "use server": valida com Zod, chama lib/, devolve estado
```

- O estado da Server Action é uma união com `fase`: `"inicial" | "erro" | "ok"`, e inclui `tentativa` para remontar o `<form>` (`key`) após erro.
- Validação **duas vezes**: no navegador (melhoria) e no servidor (a que vale).
- Mensagens de erro em português, junto ao campo (`erro` do `Campo*`) e com foco levado ao primeiro campo inválido.
- Regras de negócio ficam em `lib/` com teste; a tela só apresenta.

### Dados de apoio

- `lib/regioes/rpa.ts`: nomes das 6 RPAs, os 94 bairros por RPA (`BAIRROS_POR_RPA`, `TODOS_BAIRROS`) e `rpaDoBairro()` (ignora acento/maiúscula). Usado no passo 2 do cadastro: escolher o bairro preenche a RPA; o botão "Qual é a minha RPA?" mostra os bairros de cada região.
- `lib/ideias/publico.ts`: como o autor aparece em público.
- `components/ui/status.ts`: rótulo/forma/cor de cada situação.

---

## 8. Como conferir de verdade

1. `npm run verificar` — tudo verde.
2. Suba o app e **abra a tela** em http://localhost:3000. Teste:
   - com teclado (Tab, Enter, Esc);
   - largura de celular (≈ 390 px) — sem rolagem horizontal;
   - com JS desligado nas ferramentas do navegador (formulários ainda enviam).
3. Se mexeu em cor, confira o contraste no teste, não "no olho".

---

## 9. Armadilhas conhecidas

- **Next 16 ≠ Next que a IA conhece.** Leia `node_modules/next/dist/docs/` antes de usar API de roteamento, cache, metadados ou Server Actions.
- **`AGENTS.md`** tem um bloco gerenciado pelo `next dev` (entre `<!-- BEGIN:nextjs-agent-rules -->` e o marcador de fim). Não edite dentro do bloco; ele é recriado.
- Alguns arquivos têm **finais de linha mistos (CRLF/LF)**. Substituições por script (`sed`, `node -e`) podem não casar; prefira editar com a ferramenta de edição do editor.
- Ao editar listas de classes Tailwind, confira os **espaços entre classes** (`mb-2w-[...]` quebrou um painel inteiro).
- `prisma/gen/` é gerado (`npm run db:generate`). Não edite à mão.
- Mudou o texto de uma tela? Rode os testes: o verificador de acentuação pega palavra sem acento.
- Não remova testes nem troque `toBeGreaterThanOrEqual` por algo mais fraco para "fazer passar". Se o teste reprova, a mudança está errada (ou precisa de decisão de alguém).
