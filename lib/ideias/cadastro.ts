import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { validarDocumento } from "../seguranca/documento";

/**
 * Regras puras do cadastro de ideia (sem banco): esquema de validacao,
 * prova de tempo minimo de preenchimento e token de acompanhamento.
 * Especificacao tecnica, secoes 3.1, 8.4 e 8.5.
 *
 * DONO: Pessoa A. A gravacao fica em lib/ideias/cadastro-registro.ts.
 */

/**
 * Versao do aviso de privacidade exibido no passo 3. Gravada junto ao
 * consentimento (Autor.avisoPrivacidadeVersao). Mudou o texto do aviso,
 * mude a versao.
 */
export const VERSAO_AVISO = "2026-10-v1";

export const LIMITES = { titulo: 150, descricao: 5000, descricaoMin: 30 } as const;

/** Tempo minimo entre abrir o formulario e enviar (anti-robo). */
const TEMPO_MINIMO_MS = 5_000;
/** Validade do formulario aberto. */
const TEMPO_MAXIMO_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Esquema
// ---------------------------------------------------------------------------

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullish()
    .transform((v) => v ?? null);

export const esquemaCadastro = z
  .object({
    temaId: z.string().trim().min(1, "Escolha um tema."),
    titulo: z
      .string()
      .trim()
      .min(5, "Escreva um título com pelo menos 5 caracteres.")
      .max(LIMITES.titulo, `O título pode ter até ${LIMITES.titulo} caracteres.`),
    descricao: z
      .string()
      .trim()
      .min(
        LIMITES.descricaoMin,
        `Descreva a ideia com pelo menos ${LIMITES.descricaoMin} caracteres.`,
      )
      .max(LIMITES.descricao, `A descrição pode ter até ${LIMITES.descricao} caracteres.`),
    bairro: textoOpcional(100),
    rpa: z.preprocess(
      (v) => (v === "" || v === undefined ? null : v),
      z.coerce.number().int().min(1, "RPA inválida.").max(6, "RPA inválida.").nullable(),
    ),
    tipoAutor: z.enum(["FISICA", "JURIDICA"], "Escolha o tipo de autor."),
    documento: z.string().trim().min(1, "Informe o documento."),
    nome: z
      .string()
      .trim()
      .min(3, "Informe o nome completo.")
      .max(200, "O nome pode ter até 200 caracteres."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email("Informe um e-mail válido, como voce@exemplo.com.")),
    telefone: textoOpcional(20),
    cienciaTratamento: z
      .boolean()
      .refine((v) => v, "Para enviar, confirme que está ciente do tratamento dos dados."),
    autorizaNomePublico: z.boolean().default(false),
    versaoAviso: z.literal(VERSAO_AVISO, "Aviso de privacidade desatualizado. Recarregue a página."),
  })
  .superRefine((d, ctx) => {
    if (!validarDocumento(d.documento, d.tipoAutor)) {
      ctx.addIssue({
        code: "custom",
        path: ["documento"],
        message:
          d.tipoAutor === "JURIDICA"
            ? "CNPJ inválido. Confira os números digitados."
            : "CPF inválido. Confira os números digitados.",
      });
    }
  });

export type DadosCadastro = z.output<typeof esquemaCadastro>;
export type CampoCadastro = keyof z.input<typeof esquemaCadastro>;
export type ErrosCampo = Partial<Record<CampoCadastro, string>>;

/** Primeiro erro de cada campo, pronto para exibir junto ao campo. */
export function errosPorCampo(erro: z.ZodError): ErrosCampo {
  const saida: ErrosCampo = {};
  for (const issue of erro.issues) {
    const campo = issue.path[0] as CampoCadastro | undefined;
    if (campo && !saida[campo]) saida[campo] = issue.message;
  }
  return saida;
}

// ---------------------------------------------------------------------------
// Tempo minimo de preenchimento (valor assinado, conferido no servidor)
// ---------------------------------------------------------------------------

/** Segredo do formulario derivado do pepper: nao exige nova variavel. */
function segredoFormulario(): Buffer {
  const pepper = process.env.DOCUMENTO_PEPPER;
  if (!pepper) throw new Error("DOCUMENTO_PEPPER ausente. Defina no .env.");
  return createHmac("sha256", pepper).update("formulario-inicio").digest();
}

function assinatura(instante: string): string {
  return createHmac("sha256", segredoFormulario()).update(instante).digest("base64url");
}

/** Valor para o campo oculto `iniciadoEm`, gerado ao abrir o formulario. */
export function assinarInicio(agora: number = Date.now()): string {
  const instante = String(agora);
  return `${instante}.${assinatura(instante)}`;
}

/** Confere o valor assinado: autentico, nem rapido nem velho demais. */
export function conferirInicio(
  valor: string | null | undefined,
  agora: number = Date.now(),
): "ok" | "invalido" | "rapido" | "expirado" {
  const [instante, assinado] = (valor ?? "").split(".");
  if (!instante || !assinado) return "invalido";
  const esperado = Buffer.from(assinatura(instante));
  const recebido = Buffer.from(assinado);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) {
    return "invalido";
  }
  const decorrido = agora - Number(instante);
  if (decorrido < TEMPO_MINIMO_MS) return "rapido";
  if (decorrido > TEMPO_MAXIMO_MS) return "expirado";
  return "ok";
}

// ---------------------------------------------------------------------------
// Token de acompanhamento
// ---------------------------------------------------------------------------

/** Sem 0/O, 1/I/L: o cidadao digita o token a partir do comprovante. */
const ALFABETO_TOKEN = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Token legivel "XXXX-XXXX-XXXX" (~59 bits). So existe em claro na resposta. */
export function gerarToken(): string {
  const grupos: string[] = [];
  for (let g = 0; g < 3; g++) {
    let grupo = "";
    for (let i = 0; i < 4; i++) grupo += ALFABETO_TOKEN[randomInt(ALFABETO_TOKEN.length)];
    grupos.push(grupo);
  }
  return grupos.join("-");
}

/** Hash gravado em Ideia.tokenAcompHash. Ignora caixa, espacos e hifens. */
export function hashToken(token: string): string {
  const normal = token.toUpperCase().replace(/[^0-9A-Z]/g, "");
  return createHash("sha256").update(`token:${normal}`).digest("hex");
}

/** Hash do IP para limite de taxa e Tramitacao.ipHash (nunca o IP em claro). */
export function hashIp(ip: string): string {
  const pepper = process.env.DOCUMENTO_PEPPER ?? "";
  return createHash("sha256").update(`${pepper}:ip:${ip}`).digest("hex");
}

/** Prazo de triagem exibido ao cidadao (parametrizavel, secao 3.3). */
export function prazoTriagem(): string {
  const dias = Number(process.env.TRIAGEM_SLA_DIAS_UTEIS) || 15;
  return `${dias} dias úteis`;
}
