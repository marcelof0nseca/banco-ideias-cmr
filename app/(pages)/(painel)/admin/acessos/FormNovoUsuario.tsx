"use client";

import { useActionState } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { CampoSelecao, CampoTexto } from "@/components/ui/Campo";
import { criarUsuarioAcao, type EstadoNovoUsuario } from "../acoes";

/**
 * Formulario "Novo usuario". Num erro, o servidor devolve o que foi digitado
 * (menos a senha) e o campo com problema - nada se perde. Funciona sem JS
 * (useActionState com Server Action). DONO: Pessoa B.
 */

const INICIAL: EstadoNovoUsuario = {
  valores: { nome: "", email: "", perfil: "TRIAGEM", gabinete: "" },
  tentativa: 0,
};

/** senhaMinima vem da pagina (servidor): lib/seguranca/senha puxa o argon2 nativo. */
export function FormNovoUsuario({ senhaMinima }: { senhaMinima: number }) {
  const SENHA_MINIMA = senhaMinima;
  const [estado, acao, enviando] = useActionState(criarUsuarioAcao, INICIAL);
  const { valores, erro } = estado;
  const erroDe = (campo: NonNullable<typeof erro>["campo"]) => (erro && erro.campo === campo ? erro.mensagem : null);

  return (
    // key: remonta o form a cada tentativa para os valores devolvidos aparecerem.
    <form key={estado.tentativa} action={acao} className="flex flex-col gap-4">
      {erro && !erro.campo && (
        <Alerta tipo="erro" titulo="Não foi possível criar o usuário">
          {erro.mensagem}
        </Alerta>
      )}
      <CampoTexto id="nome" rotulo="Nome" name="nome" autoComplete="off" defaultValue={valores.nome} erro={erroDe("nome")} obrigatorio />
      <CampoTexto
        id="email"
        rotulo="E-mail institucional"
        name="email"
        type="email"
        autoComplete="off"
        defaultValue={valores.email}
        erro={erroDe("email")}
        obrigatorio
      />
      <CampoSelecao id="perfil" rotulo="Perfil" name="perfil" defaultValue={valores.perfil} obrigatorio>
        <option value="TRIAGEM">Secretaria · Triagem</option>
        <option value="GABINETE">Gabinete</option>
        <option value="ADMIN">Administração</option>
      </CampoSelecao>
      <CampoTexto
        id="gabinete"
        rotulo="Gabinete ou comissão"
        dica="Obrigatório para o perfil Gabinete. Ex.: Gabinete Ver. Fulano."
        name="gabinete"
        defaultValue={valores.gabinete}
        erro={erroDe("gabinete")}
      />
      <CampoTexto
        id="senha-nova"
        rotulo="Senha inicial"
        dica={erro ? `Por segurança, digite a senha de novo. Mínimo de ${SENHA_MINIMA} caracteres.` : `Mínimo de ${SENHA_MINIMA} caracteres.`}
        name="senha"
        type="password"
        autoComplete="new-password"
        minLength={SENHA_MINIMA}
        erro={erroDe("senha")}
        obrigatorio
      />
      <Botao type="submit" disabled={enviando}>
        {enviando ? "Criando…" : "Criar usuário"}
      </Botao>
    </form>
  );
}
