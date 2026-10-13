/**
 * Retorno das acoes do painel pela URL (?ok=... / ?erro=...), para os
 * formularios funcionarem sem JavaScript. Vai so um CODIGO na URL - nunca o
 * texto -, para ninguem montar um link que exiba mensagem arbitraria.
 * DONO: Pessoa B.
 */

export const MENSAGENS_OK = {
  assumida: "Você assumiu a análise desta ideia.",
  aprovada: "Ideia aprovada e publicada no acervo.",
  arquivada: "Ideia arquivada. O autor verá o motivo e a justificativa no Acompanhar.",
  editada: "Redação atualizada. O texto original do cidadão foi preservado no histórico.",
  interesse: "Interesse registrado. A ideia agora aparece em “Minhas ideias”.",
  adotada: "Ideia adotada pelo seu gabinete.",
  desistencia: "Seu gabinete deixou a análise desta ideia.",
  "usuario-criado": "Usuário criado. Informe a senha inicial à pessoa por um canal seguro.",
  "usuario-ativado": "Usuário reativado.",
  "usuario-desativado": "Usuário desativado. Ele não consegue mais entrar no painel.",
  "senha-redefinida": "Senha redefinida. Informe a nova senha por um canal seguro.",
  "lista-incluida": "Item incluído na lista.",
  "lista-alterada": "Item da lista atualizado.",
} as const;

export const MENSAGENS_ERRO = {
  conflito:
    "Esta ideia foi alterada por outra pessoa enquanto você a analisava. A página foi recarregada com a situação atual.",
  permissao: "Seu perfil não pode fazer esta ação.",
  "nao-encontrada": "Ideia não encontrada.",
  motivo: "Escolha o motivo do arquivamento.",
  justificativa: "Escreva a justificativa do arquivamento: o autor vai lê-la.",
  gabinete: "Informe o gabinete ou a comissão responsável.",
  texto: "O título precisa ter entre 5 e 150 caracteres e a descrição entre 30 e 5.000.",
  situacao: "Esta ação não é possível na situação atual da ideia.",
  "email-repetido": "Já existe um usuário com este e-mail.",
  "senha-fraca": "A senha precisa ter pelo menos 12 caracteres.",
  "dados-usuario": "Preencha nome, e-mail válido e perfil. Gabinete exige o nome do gabinete.",
  "proprio-usuario": "Você não pode desativar o seu próprio usuário.",
  "lista-vazia": "Escreva o nome do item.",
  "lista-repetida": "Já existe um item com este nome.",
  invalido: "Não foi possível concluir a ação. Confira os dados e tente de novo.",
} as const;

export type CodigoOk = keyof typeof MENSAGENS_OK;
export type CodigoErro = keyof typeof MENSAGENS_ERRO;

export function mensagemOk(codigo?: string | null): string | null {
  return codigo && codigo in MENSAGENS_OK ? MENSAGENS_OK[codigo as CodigoOk] : null;
}

export function mensagemErro(codigo?: string | null): string | null {
  return codigo && codigo in MENSAGENS_ERRO ? MENSAGENS_ERRO[codigo as CodigoErro] : null;
}

/** Converte a falha de uma acao de dominio no codigo da URL. */
export function codigoDaFalha(falha: { httpStatus: number; motivo: string }): CodigoErro {
  if (falha.httpStatus === 409) return "conflito";
  if (falha.httpStatus === 403) return "permissao";
  if (falha.httpStatus === 404) return "nao-encontrada";
  const m = falha.motivo.toLowerCase();
  if (m.includes("motivo")) return "motivo";
  if (m.includes("justificativa")) return "justificativa";
  if (m.includes("gabinete")) return "gabinete";
  if (m.includes("título") || m.includes("descrição")) return "texto";
  if (m.includes("transição") || m.includes("situação") || m.includes("triagem")) return "situacao";
  return "invalido";
}
