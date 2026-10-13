import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { CampoAreaTexto, CampoSelecao, CampoTexto } from "@/components/ui/Campo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { detalheInterno, listarMotivos, type DetalheInterno } from "@/lib/painel/consultas";
import { sessaoDaPagina } from "@/lib/seguranca/auth";
import type { Sessao } from "@/lib/seguranca/sessao";
import { Retorno, SemPermissao } from "../../_componentes/Blocos";
import { FichaIdeia } from "../../_componentes/FichaIdeia";
import { aprovar, arquivar, assumir, editar } from "../acoes";
import { RevelarDocumento } from "./RevelarDocumento";

export const metadata: Metadata = { title: "Análise da ideia", robots: { index: false } };

function Cartao({ titulo, children, descricao }: { titulo: string; children: ReactNode; descricao?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-lg text-marca">{titulo}</h2>
        </CardTitle>
        {descricao && <p className="text-sm text-muted-foreground">{descricao}</p>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

/** Campos ocultos comuns a toda acao: qual ideia e qual versao o servidor viu. */
function Ocultos({ ideia }: { ideia: DetalheInterno }) {
  return (
    <>
      <input type="hidden" name="ideiaId" value={ideia.id} />
      <input type="hidden" name="versao" value={ideia.versao} />
      <input type="hidden" name="protocolo" value={ideia.protocolo} />
    </>
  );
}

async function Acoes({ ideia, sessao }: { ideia: DetalheInterno; sessao: Sessao }) {
  const admin = sessao.perfil === "ADMIN";

  if (ideia.status === "RECEBIDA") {
    return (
      <Cartao titulo="Próximo passo" descricao="Assuma a análise para que outros servidores saibam que ela está com você.">
        <form action={assumir}>
          <Ocultos ideia={ideia} />
          <Botao type="submit" className="w-full">
            Assumir a análise
          </Botao>
        </form>
      </Cartao>
    );
  }

  const podeArquivar = ideia.status === "EM_TRIAGEM" || (admin && ideia.status !== "ARQUIVADA");
  if (ideia.status !== "EM_TRIAGEM" && !podeArquivar) {
    return (
      <Alerta tipo="info" titulo={ideia.status === "ARQUIVADA" ? "Ideia arquivada" : "Triagem concluída"}>
        {ideia.status === "ARQUIVADA"
          ? "O autor pode ler o motivo e a justificativa na tela Acompanhar."
          : "A ideia está publicada no acervo e disponível para os gabinetes."}
      </Alerta>
    );
  }

  const motivos = await listarMotivos();
  return (
    <>
      {ideia.status === "EM_TRIAGEM" && (
        <Cartao titulo="Aprovar e publicar" descricao="A ideia vai para a consulta pública e fica disponível aos gabinetes.">
          <form action={aprovar} className="flex flex-col gap-4">
            <Ocultos ideia={ideia} />
            <CampoAreaTexto
              id="justificativa-aprovar"
              rotulo="Observação para o autor (opcional)"
              dica="Aparece só para o autor, no Acompanhar. Não é exibida na consulta pública."
              name="justificativa"
              rows={3}
            />
            <Botao type="submit" variante="sucesso" className="w-full">
              Aprovar e publicar
            </Botao>
          </form>
        </Cartao>
      )}

      {podeArquivar && (
        <Cartao
          titulo={ideia.status === "EM_TRIAGEM" ? "Arquivar" : "Arquivar (administração)"}
          descricao="Motivo e justificativa são obrigatórios: o autor lerá os dois."
        >
          <form action={arquivar} className="flex flex-col gap-4">
            <Ocultos ideia={ideia} />
            <CampoSelecao id="motivoId" rotulo="Motivo" name="motivoId" defaultValue="" obrigatorio>
              <option value="" disabled>
                Escolha o motivo
              </option>
              {motivos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.descricao}
                </option>
              ))}
            </CampoSelecao>
            <CampoAreaTexto
              id="justificativa-arquivar"
              rotulo="Justificativa"
              dica="Explique ao cidadão, em linguagem simples, por que a ideia não segue."
              name="justificativa"
              rows={4}
              obrigatorio
            />
            <Botao type="submit" variante="perigo" className="w-full">
              Arquivar ideia
            </Botao>
          </form>
        </Cartao>
      )}
    </>
  );
}

export default async function AnaliseTriagemPage({
  params,
  searchParams,
}: {
  params: Promise<{ protocolo: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { protocolo } = await params;
  const sessao = await sessaoDaPagina(`/triagem/${protocolo}`);
  if (sessao.perfil !== "TRIAGEM" && sessao.perfil !== "ADMIN") {
    return <SemPermissao area="triagem" inicio="/gabinete" />;
  }

  const ideia = await detalheInterno(protocolo);
  if (!ideia) notFound();
  const { ok, erro } = await searchParams;
  const emTriagem = ideia.status === "RECEBIDA" || ideia.status === "EM_TRIAGEM";

  return (
    <div className="flex flex-col gap-6">
      <Retorno ok={ok} erro={erro} />
      <FichaIdeia
        ideia={ideia}
        voltar={{ href: "/triagem", rotulo: "Voltar à fila de triagem" }}
        lateral={
          <>
            <Acoes ideia={ideia} sessao={sessao} />

            <Cartao titulo="Autor" descricao="Dados de identificação. Não aparecem na consulta pública.">
              <dl className="flex flex-col gap-3 text-sm">
                <div>
                  <dt className="font-semibold">Nome</dt>
                  <dd>
                    {ideia.autor.nome}
                    <span className="block text-xs text-muted-foreground">
                      {ideia.autor.tipo === "JURIDICA" ? "Pessoa jurídica" : "Pessoa física"} ·{" "}
                      {ideia.autor.nomePublico ? "autorizou divulgar o nome" : "não autorizou divulgar o nome"}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">{ideia.autor.tipo === "JURIDICA" ? "CNPJ" : "CPF"}</dt>
                  <dd>
                    {ideia.autor.anonimizado ? (
                      "Titular anonimizado"
                    ) : (
                      <RevelarDocumento ideiaId={ideia.id} mascarado={ideia.autor.documentoMascarado} />
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">E-mail</dt>
                  <dd className="break-all">{ideia.autor.email}</dd>
                </div>
                {ideia.autor.telefone && (
                  <div>
                    <dt className="font-semibold">Telefone</dt>
                    <dd>{ideia.autor.telefone}</dd>
                  </div>
                )}
              </dl>
            </Cartao>

            {emTriagem && (
              <Card>
                <CardContent>
                  <details>
                    <summary className="cursor-pointer font-semibold text-marca">Corrigir a redação</summary>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Para ortografia e clareza. O texto original do cidadão fica guardado no histórico.
                    </p>
                    <form action={editar} className="mt-4 flex flex-col gap-4">
                      <Ocultos ideia={ideia} />
                      <CampoTexto id="titulo" rotulo="Título" name="titulo" defaultValue={ideia.titulo} maxLength={150} obrigatorio />
                      <CampoAreaTexto
                        id="descricao"
                        rotulo="Descrição"
                        name="descricao"
                        defaultValue={ideia.descricao}
                        maxLength={5000}
                        rows={8}
                        obrigatorio
                      />
                      <Botao type="submit" variante="secundario">
                        Salvar redação
                      </Botao>
                    </form>
                  </details>
                </CardContent>
              </Card>
            )}
          </>
        }
      />
    </div>
  );
}
