import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Botao } from "@/components/ui/Botao";
import { CampoSelecao, CampoTexto } from "@/components/ui/Campo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabela } from "@/components/ui/Tabela";
import { listarUsuarios } from "@/lib/painel/admin";
import { sessaoDaPagina } from "@/lib/seguranca/auth";
import { SENHA_MINIMA } from "@/lib/seguranca/senha";
import { CabecalhoPagina, Retorno } from "../../_componentes/Blocos";
import { ROTULO_PERFIL } from "../../_componentes/BarraUsuario";
import { ativarUsuarioAcao, criarUsuarioAcao, desativarUsuarioAcao, redefinirSenhaAcao } from "../acoes";

export const metadata: Metadata = { title: "Usuários", robots: { index: false } };

const FORMATO = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Recife" });

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sessao = await sessaoDaPagina("/admin/acessos");
  if (sessao.perfil !== "ADMIN") notFound();
  const [{ ok, erro }, usuarios] = await Promise.all([searchParams, listarUsuarios()]);
  const agora = new Date();

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina sobretitulo="Administração" titulo="Usuários internos">
        Quem acessa o painel. Usuários não são apagados: são desativados, para preservar a trilha de auditoria.
      </CabecalhoPagina>

      <Retorno ok={ok} erro={erro} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Tabela
          legenda={`${usuarios.length} usuários`}
          chave={(u) => u.id}
          linhas={usuarios}
          colunas={[
            {
              titulo: "Nome",
              cabecalhoDaLinha: true,
              celula: (u) => (
                <div>
                  <p>{u.nome}</p>
                  <p className="text-xs font-normal text-muted-foreground">{u.email}</p>
                </div>
              ),
            },
            {
              titulo: "Perfil",
              celula: (u) => (
                <div>
                  <p>{ROTULO_PERFIL[u.perfil]}</p>
                  {u.gabinete && <p className="text-xs text-muted-foreground">{u.gabinete}</p>}
                </div>
              ),
            },
            {
              titulo: "Situação",
              celula: (u) =>
                !u.ativo ? (
                  <Badge variant="outline" className="border-cinza-selo text-cinza-selo">Desativado</Badge>
                ) : u.bloqueadoAte && u.bloqueadoAte > agora ? (
                  <Badge variant="outline" className="border-vermelho-cmr bg-vermelho-fundo text-vermelho-cmr">Bloqueado</Badge>
                ) : (
                  <Badge variant="outline" className="border-verde-cmr bg-verde-fundo text-verde-cmr">Ativo</Badge>
                ),
            },
            {
              titulo: "Último acesso",
              celula: (u) => (u.ultimoLoginEm ? FORMATO.format(u.ultimoLoginEm) : <span className="text-muted-foreground">Nunca</span>),
            },
            {
              titulo: "Ações",
              celula: (u) => (
                <div className="flex flex-col gap-2">
                  {u.id !== sessao.usuarioId && (
                    <form action={u.ativo ? desativarUsuarioAcao : ativarUsuarioAcao}>
                      <input type="hidden" name="usuarioId" value={u.id} />
                      <Botao type="submit" pequeno variante={u.ativo ? "contorno" : "secundario"}>
                        {u.ativo ? "Desativar" : "Reativar"}
                      </Botao>
                    </form>
                  )}
                  <details>
                    <summary className="cursor-pointer text-sm font-semibold text-marca">Redefinir senha</summary>
                    <form action={redefinirSenhaAcao} className="mt-2 flex flex-col gap-2">
                      <input type="hidden" name="usuarioId" value={u.id} />
                      <CampoTexto
                        id={`senha-${u.id}`}
                        rotulo="Nova senha"
                        name="senha"
                        type="password"
                        autoComplete="new-password"
                        minLength={SENHA_MINIMA}
                        obrigatorio
                      />
                      <Botao type="submit" pequeno>Salvar</Botao>
                    </form>
                  </details>
                </div>
              ),
            },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="text-lg text-marca">Novo usuário</h2>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Informe a senha inicial à pessoa por um canal seguro, nunca por e-mail aberto.
            </p>
          </CardHeader>
          <CardContent>
            <form action={criarUsuarioAcao} className="flex flex-col gap-4">
              <CampoTexto id="nome" rotulo="Nome" name="nome" autoComplete="off" obrigatorio />
              <CampoTexto id="email" rotulo="E-mail institucional" name="email" type="email" autoComplete="off" obrigatorio />
              <CampoSelecao id="perfil" rotulo="Perfil" name="perfil" defaultValue="TRIAGEM" obrigatorio>
                <option value="TRIAGEM">Secretaria · Triagem</option>
                <option value="GABINETE">Gabinete</option>
                <option value="ADMIN">Administração</option>
              </CampoSelecao>
              <CampoTexto
                id="gabinete"
                rotulo="Gabinete ou comissão"
                dica="Obrigatório para o perfil Gabinete. Ex.: Gabinete Ver. Fulano."
                name="gabinete"
              />
              <CampoTexto
                id="senha-nova"
                rotulo="Senha inicial"
                dica={`Mínimo de ${SENHA_MINIMA} caracteres.`}
                name="senha"
                type="password"
                autoComplete="new-password"
                minLength={SENHA_MINIMA}
                obrigatorio
              />
              <Botao type="submit">Criar usuário</Botao>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
