import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

/**
 * Verificador de acentuacao do texto que chega ao cidadao.
 *
 * Percorre a arvore sintatica (comentarios ficam de fora) e olha so o que
 * pode aparecer na tela: texto JSX e strings que nao sao identificadores
 * (ids, nomes de campo, classes CSS, imports e mensagens internas de erro
 * sao ignorados). Cada palavra e comparada com um dicionario de formas que
 * em portugues so existem com acento.
 */

/** Forma sem acento -> forma correta. So entram palavras sem ambiguidade. */
export const SEM_ACENTO: Record<string, string> = {
  acao: "ação",
  acoes: "ações",
  acessivel: "acessível",
  adocao: "adoção",
  alem: "além",
  analise: "análise",
  apos: "após",
  aprovacao: "aprovação",
  area: "área",
  assistencia: "assistência",
  ate: "até",
  atencao: "atenção",
  autorizacao: "autorização",
  basico: "básico",
  camara: "câmara",
  caracteristicas: "características",
  ciencia: "ciência",
  ciencias: "ciências",
  cidadao: "cidadão",
  cidadaos: "cidadãos",
  codigo: "código",
  competencia: "competência",
  concluido: "concluído",
  confirmacao: "confirmação",
  construcao: "construção",
  conteudo: "conteúdo",
  criacao: "criação",
  descricao: "descrição",
  disponivel: "disponível",
  divulgacao: "divulgação",
  economico: "econômico",
  educacao: "educação",
  endereco: "endereço",
  entao: "então",
  especificacao: "especificação",
  estao: "estão",
  estatisticas: "estatísticas",
  farmacia: "farmácia",
  farmacias: "farmácias",
  fisica: "física",
  habitacao: "habitação",
  historico: "histórico",
  homologacao: "homologação",
  identificacao: "identificação",
  incompreensivel: "incompreensível",
  indice: "índice",
  informacao: "informação",
  inicio: "início",
  invalido: "inválido",
  juridica: "jurídica",
  ja: "já",
  joao: "joão",
  legislacao: "legislação",
  materia: "matéria",
  maximo: "máximo",
  minimo: "mínimo",
  municipio: "município",
  nao: "não",
  numero: "número",
  numeros: "números",
  obrigatorio: "obrigatório",
  obrigatoria: "obrigatória",
  opcao: "opção",
  opcoes: "opções",
  orgao: "órgão",
  pagina: "página",
  paginas: "páginas",
  participacao: "participação",
  periodo: "período",
  politica: "política",
  politico: "político",
  possivel: "possível",
  pratica: "prática",
  previo: "prévio",
  provisorio: "provisório",
  provisoria: "provisória",
  prototipo: "protótipo",
  proximo: "próximo",
  publica: "pública",
  publicas: "públicas",
  publico: "público",
  publicos: "públicos",
  publicacao: "publicação",
  razao: "razão",
  regiao: "região",
  regioes: "regiões",
  resolucao: "resolução",
  responsavel: "responsável",
  saude: "saúde",
  secao: "seção",
  seguranca: "segurança",
  sao: "são",
  sera: "será",
  situacao: "situação",
  solucao: "solução",
  tambem: "também",
  tecnica: "técnica",
  tecnico: "técnico",
  territorio: "território",
  titulo: "título",
  tramitacao: "tramitação",
  tres: "três",
  ultimo: "último",
  unico: "único",
  usuario: "usuário",
  usuarios: "usuários",
  uteis: "úteis",
  util: "útil",
  varzea: "várzea",
  voce: "você",
  voces: "vocês",
};

/** Atributos JSX cujo valor nunca e texto para o cidadao. */
const ATRIBUTOS_TECNICOS = new Set([
  "className",
  "id",
  "name",
  "htmlFor",
  "key",
  "type",
  "autoComplete",
  "inputMode",
  "href",
  "role",
  "src",
  "rel",
  "target",
  "method",
  "lang",
  "value",
  "defaultValue",
  "scope",
  "variant",
  "variante",
  "size",
  "aria-describedby",
  "aria-labelledby",
  "aria-controls",
  "aria-current",
  "aria-live",
  "data-icon",
  "data-slot",
  "data-fundo",
  "viewBox",
  "d",
  "fill",
  "stroke",
  "strokeLinecap",
  "strokeLinejoin",
]);

/** Chamadas cujos argumentos nao sao texto para o cidadao. */
const CHAMADAS_TECNICAS = new Set(["cn", "cva", "classesBotao", "buttonVariants", "require"]);

export interface Ocorrencia {
  arquivo: string;
  linha: number;
  palavra: string;
  sugestao: string;
  trecho: string;
}

/** Identificador de codigo ("titulo", "temaId", "EM_ANALISE", "aria-live"). */
function pareceIdentificador(texto: string): boolean {
  return /^[a-z][\w-]*$/.test(texto) || /^[A-Z][A-Z0-9_]*$/.test(texto);
}

function nomeDaChamada(no: ts.CallExpression | ts.NewExpression): string {
  const e = no.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) {
    // console.log(...), algo.metodo(...)
    return ts.isIdentifier(e.expression) ? `${e.expression.text}.${e.name.text}` : e.name.text;
  }
  return "";
}

/** O literal esta num lugar em que nao e texto para o cidadao? */
function contextoTecnico(no: ts.Node): boolean {
  for (let atual: ts.Node | undefined = no.parent; atual; atual = atual.parent) {
    if (ts.isImportDeclaration(atual) || ts.isExportDeclaration(atual)) return true;
    if (ts.isImportTypeNode(atual) || ts.isExternalModuleReference(atual)) return true;
    // SQL e outros templates com tag (tx.$queryRaw`...`).
    if (ts.isTaggedTemplateExpression(atual)) return true;
    if (ts.isJsxAttribute(atual)) {
      return ATRIBUTOS_TECNICOS.has(atual.name.getText());
    }
    if (ts.isNewExpression(atual) && nomeDaChamada(atual).endsWith("Error")) return true;
    if (ts.isCallExpression(atual)) {
      const nome = nomeDaChamada(atual);
      if (CHAMADAS_TECNICAS.has(nome) || nome.startsWith("console.")) return true;
    }
    if (ts.isPropertyAssignment(atual) && atual.name === no) return true;
    if (ts.isElementAccessExpression(atual) && atual.argumentExpression === no) return true;
    if (ts.isLiteralTypeNode(atual)) return true;
    if (ts.isCaseClause(atual) && atual.expression === no) return true;
    if (ts.isBinaryExpression(atual)) {
      const op = atual.operatorToken.kind;
      if (op === ts.SyntaxKind.EqualsEqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsEqualsToken) {
        return true;
      }
    }
    // Para no primeiro "dono" de expressao: chamada, JSX, declaracao.
    if (ts.isJsxElement(atual) || ts.isJsxSelfClosingElement(atual) || ts.isVariableDeclaration(atual)) {
      return false;
    }
  }
  return false;
}

/** E-mails e URLs nao sao texto corrido (voce@exemplo.com). */
const ENDERECOS = /\S+@\S+|[a-z][a-z0-9+.-]*:\/\/\S+/gi;

/** Procura palavras sem acento num texto. */
export function palavrasSemAcento(texto: string): { palavra: string; sugestao: string }[] {
  const achados: { palavra: string; sugestao: string }[] = [];
  for (const m of texto.replace(ENDERECOS, " ").matchAll(/[\p{L}]+/gu)) {
    const palavra = m[0];
    const sugestao = SEM_ACENTO[palavra.toLowerCase()];
    if (sugestao) achados.push({ palavra, sugestao });
  }
  return achados;
}

/** Analisa o codigo-fonte de um arquivo .ts/.tsx. */
export function verificarFonte(arquivo: string, fonte: string): Ocorrencia[] {
  const sf = ts.createSourceFile(arquivo, fonte, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const ocorrencias: Ocorrencia[] = [];

  function registrar(no: ts.Node, texto: string) {
    const limpo = texto.trim();
    if (!limpo || pareceIdentificador(limpo)) return;
    for (const { palavra, sugestao } of palavrasSemAcento(limpo)) {
      ocorrencias.push({
        arquivo,
        linha: sf.getLineAndCharacterOfPosition(no.getStart(sf)).line + 1,
        palavra,
        sugestao,
        trecho: limpo.slice(0, 80),
      });
    }
  }

  function visitar(no: ts.Node) {
    if (ts.isJsxText(no)) {
      registrar(no, no.text);
    } else if (
      ts.isStringLiteral(no) ||
      ts.isNoSubstitutionTemplateLiteral(no) ||
      ts.isTemplateHead(no) ||
      ts.isTemplateMiddle(no) ||
      ts.isTemplateTail(no)
    ) {
      const alvo = ts.isTemplateHead(no) || ts.isTemplateMiddle(no) || ts.isTemplateTail(no) ? no.parent : no;
      if (!contextoTecnico(alvo)) registrar(no, no.text);
    }
    ts.forEachChild(no, visitar);
  }

  visitar(sf);
  return ocorrencias;
}

/** Lista recursivamente os .ts/.tsx de uma pasta (sem testes e codigo gerado). */
export function listarFontes(raiz: string, pasta: string): string[] {
  const saida: string[] = [];
  const base = join(raiz, pasta);
  let entradas: string[];
  try {
    entradas = readdirSync(base);
  } catch {
    return saida;
  }
  for (const nome of entradas) {
    const caminho = join(base, nome);
    if (statSync(caminho).isDirectory()) {
      if (nome === "gen" || nome === "node_modules" || nome.startsWith(".")) continue;
      saida.push(...listarFontes(raiz, relative(raiz, caminho)));
    } else if (/\.tsx?$/.test(nome) && !/\.test\.tsx?$/.test(nome) && !nome.endsWith(".d.ts")) {
      saida.push(relative(raiz, caminho).replaceAll("\\", "/"));
    }
  }
  return saida;
}

export function verificarProjeto(raiz: string, pastas: string[]): Ocorrencia[] {
  return pastas
    .flatMap((p) => (/\.tsx?$/.test(p) ? [p] : listarFontes(raiz, p)))
    .flatMap((arquivo) => verificarFonte(arquivo, readFileSync(join(raiz, arquivo), "utf8")));
}
