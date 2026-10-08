import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

/**
 * Tratamento do documento do autor (CPF/CNPJ).
 * Especificacao tecnica, secao 8.3.
 *
 * DONO: Pessoa B.  CONSUMIDORES: A (cadastro, apoio, acompanhar).
 *
 * O CPF/CNPJ em claro so existe em memoria durante a requisicao de gravacao
 * e durante uma revelacao explicita e registrada. Para o banco, geramos tres
 * derivacoes independentes:
 *   - cifrado   (reversivel, so com a chave)   -> AES-256-GCM
 *   - hash      (irreversivel, para dedupe)    -> SHA-256 + pepper
 *   - mascarado (exibicao na Triagem)          -> 111.***.***-44
 */

export type TipoDocumento = "FISICA" | "JURIDICA";

// ---------------------------------------------------------------------------
// Normalizacao e validacao de digito verificador
// ---------------------------------------------------------------------------

/** Mantem apenas digitos. */
export function soDigitos(valor: string): string {
  return (valor ?? "").replace(/\D/g, "");
}

/** Valida CPF pelos dois digitos verificadores. */
export function validarCPF(valor: string): boolean {
  const c = soDigitos(valor);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;

  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) {
      soma += Number(c[i]) * (t + 1 - i);
    }
    let dig = (soma * 10) % 11;
    if (dig === 10) dig = 0;
    if (dig !== Number(c[t])) return false;
  }
  return true;
}

/** Valida CNPJ pelos dois digitos verificadores. */
export function validarCNPJ(valor: string): boolean {
  const c = soDigitos(valor);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;

  const calcula = (base: string): number => {
    let peso = base.length - 7;
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * peso--;
      if (peso < 2) peso = 9;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  if (calcula(c.slice(0, 12)) !== Number(c[12])) return false;
  return calcula(c.slice(0, 13)) === Number(c[13]);
}

export function validarDocumento(valor: string, tipo: TipoDocumento): boolean {
  return tipo === "JURIDICA" ? validarCNPJ(valor) : validarCPF(valor);
}

// ---------------------------------------------------------------------------
// Mascara
// ---------------------------------------------------------------------------

/** CPF 529.982.247-25 vira 529.***.***-25; CNPJ preserva so os 2 primeiros e 2 ultimos. */
export function mascararDocumento(valor: string, tipo: TipoDocumento): string {
  const c = soDigitos(valor);
  if (tipo === "JURIDICA") {
    return `${c.slice(0, 2)}.***.***/****-${c.slice(-2)}`;
  }
  return `${c.slice(0, 3)}.***.***-${c.slice(-2)}`;
}

/** Formata para exibicao completa (usado so na revelacao registrada). */
export function formatarDocumento(valor: string, tipo: TipoDocumento): string {
  const c = soDigitos(valor);
  if (tipo === "JURIDICA") {
    return c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }
  return c.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

// ---------------------------------------------------------------------------
// Hash de busca (SHA-256 + pepper)
// ---------------------------------------------------------------------------

function pepper(): string {
  const p = process.env.DOCUMENTO_PEPPER;
  if (!p) {
    throw new Error(
      "DOCUMENTO_PEPPER ausente. Defina no .env (ver .env.example).",
    );
  }
  return p;
}

/**
 * Hash estavel para deduplicar autor e conferir apoio repetido, sem decifrar.
 * O pepper impede enumeracao de CPFs a partir de um dump do banco.
 */
export function hashDocumento(valor: string): string {
  const c = soDigitos(valor);
  return createHash("sha256")
    .update(`${pepper()}:${c}`)
    .digest("hex");
}

// ---------------------------------------------------------------------------
// Cifra em repouso (AES-256-GCM)
// ---------------------------------------------------------------------------

function chave(): Buffer {
  const b64 = process.env.DOCUMENTO_CHAVE;
  if (!b64) {
    throw new Error(
      "DOCUMENTO_CHAVE ausente. Defina no .env (ver .env.example).",
    );
  }
  const buf = Buffer.from(b64, "base64");
  if (buf.length !== 32) {
    throw new Error(
      `DOCUMENTO_CHAVE deve ter 32 bytes em base64; recebeu ${buf.length}.`,
    );
  }
  return buf;
}

/**
 * Cifra o documento. Formato de saida: "iv:tagAutenticacao:textoCifrado",
 * cada parte em base64. GCM e cifra autenticada: adulteracao e detectada
 * na decifragem.
 */
export function cifrarDocumento(valor: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", chave(), iv);
  const cifrado = Buffer.concat([
    cipher.update(soDigitos(valor), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    cifrado.toString("base64"),
  ].join(":");
}

/** Decifra. So deve ser chamado na rota /revelar-documento, com auditoria. */
export function decifrarDocumento(cifrado: string): string {
  const partes = cifrado.split(":");
  if (partes.length !== 3) {
    throw new Error("Formato de documento cifrado invalido.");
  }
  const [ivB64, tagB64, dadosB64] = partes as [string, string, string];
  const decipher = createDecipheriv(
    "aes-256-gcm",
    chave(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return (
    decipher.update(Buffer.from(dadosB64, "base64")).toString("utf8") +
    decipher.final("utf8")
  );
}

// ---------------------------------------------------------------------------
// Conveniencia: prepara as tres derivacoes de uma vez (usado no cadastro)
// ---------------------------------------------------------------------------

export interface DocumentoPreparado {
  documentoCifrado: string;
  documentoHash: string;
  documentoMascarado: string;
}

export function prepararDocumento(
  valor: string,
  tipo: TipoDocumento,
): DocumentoPreparado {
  return {
    documentoCifrado: cifrarDocumento(valor),
    documentoHash: hashDocumento(valor),
    documentoMascarado: mascararDocumento(valor, tipo),
  };
}
