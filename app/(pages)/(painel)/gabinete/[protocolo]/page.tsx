import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { CampoAreaTexto, CampoTexto } from "@/components/ui/Campo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exibicaoAutor } from "@/lib/ideias/publico";
import { detalheInterno, type DetalheInterno } from "@/lib/painel/consultas";
import { sessaoDaPagina } from "@/lib/seguranca/auth";
import type { Sessao } from "@/lib/seguranca/sessao";
import { ehStatusPublico } from "@/lib/tramitacao/maquina-status";
import { Retorno, SemPermissao } from "../../_componentes/Blocos";
import { FichaIdeia } from "../../_componentes/FichaIdeia";
import { adotar, analisar, desistir } from "../acoes";

export const metadata: Metadata = { title: "Ideia no gabinete", robots: { index: false } };

function Cartao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
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

/** Campos comuns. O ADMIN, sem gabinete proprio, informa em nome de quem age. */
function Ocultos({ ideia, sessao, sufixo }: { ideia: DetalheInterno; sessao: Sessao; sufixo: string }) {
  return (
    <>
      <input type="hidden" name="ideiaId" value={ideia.id} />
      <input type="hidden" name="versao" value={ideia.versao} />
      <input type="hidden" name="protocolo" value={ideia.protocolo} />
      {!sessao.gabinete && (
        <CampoTexto
          id={`gabinete-${sufixo}`}
          rotulo="Gabinete ou comissão"
          dica="Você está como administração: informe em nome de qual gabinete registra a ação."
          name="gabinete"
          obrigatorio
        />
      )}
    </>
  );
}

function Acoes({ ideia, sessao }: { ideia: DetalheInterno; sessao: Sessao }) {
  const meu = sessao.gabinete;
  const meuInteresse = meu ? ideia.interesses.find((i) => i.gabinete === meu) : undefined;
  const outros = ideia.interesses.filter((i) => i.gabinete !== meu).map((i) => i.gabinete);

  if (ideia.status === "ADOTADA") {
    const quem = ideia.interesses.find((i) => i.tipo === "ADOCAO")?.gabinete;
    return (
      <Alerta tipo="sucesso" titulo="Ideia adotada">
        {quem ? `Adotada por ${quem}.` : "Ideia adotada por um gabinete."} O autor acompanha essa decisão pela
        consulta pública e pelo Acompanhar.
      </Alerta>
    );
  }

  if (ideia.status === "DISPONIVEL" || (ideia.status === "EM_ANALISE" && !meuInteresse && meu)) {
    const primeiro = ideia.status === "DISPONIVEL";
    return (
      <Cartao
        titulo={primeiro ? "Iniciar a análise" : "Também analisar"}
        descricao={
          primeiro
            ? "A ideia passa a constar como em análise, e o seu gabinete aparece como interessado."
            : `Já está em análise por ${outros.join(", ")}. Mais de um gabinete pode analisar a mesma ideia.`
        }
      >
        <form action={analisar} className="flex flex-col gap-4">
          <Ocultos ideia={ideia} sessao={sessao} sufixo="analisar" />
          {primeiro && (
            <CampoAreaTexto
              id="justificativa-analisar"
              rotulo="Observação (opcional)"
              dica="Aparece para o autor no Acompanhar."
              name="justificativa"
              rows={3}
            />
          )}
          <Botao type="submit" className="w-full">
            {primeiro ? "Iniciar a análise" : "Registrar interesse do meu gabinete"}
          </Botao>
        </form>
      </Cartao>
    );
  }

  // EM_ANALISE com o meu gabinete (ou ADMIN agindo por um gabinete)
  return (
    <>
      <Cartao titulo="Adotar a ideia" descricao="Registre quando o gabinete decidir transformar a ideia em proposição.">
        <form action={adotar} className="flex flex-col gap-4">
          <Ocultos ideia={ideia} sessao={sessao} sufixo="adotar" />
          <CampoAreaTexto
            id="justificativa-adotar"
            rotulo="Observação (opcional)"
            dica="Ex.: o projeto de lei será apresentado na próxima sessão."
            name="justificativa"
            rows={3}
          />
          <Botao type="submit" variante="sucesso" className="w-full">
            Adotar a ideia
          </Botao>
        </form>
      </Cartao>
      <Cartao
        titulo="Deixar a análise"
        descricao={
          outros.length
            ? "Seu gabinete sai da análise; os outros gabinetes interessados continuam."
            : "A ideia volta ao acervo, disponível para outros gabinetes."
        }
      >
        <form action={desistir}>
          <Ocultos ideia={ideia} sessao={sessao} sufixo="desistir" />
          <Botao type="submit" variante="contorno" className="w-full">
            Deixar a análise
          </Botao>
        </form>
      </Cartao>
    </>
  );
}

export default async function IdeiaGabinetePage({
  params,
  searchParams,
}: {
  params: Promise<{ protocolo: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { protocolo } = await params;
  const sessao = await sessaoDaPagina(`/gabinete/${protocolo}`);
  if (sessao.perfil !== "GABINETE" && sessao.perfil !== "ADMIN") {
    return <SemPermissao area="gabinete" inicio="/triagem" />;
  }

  const ideia = await detalheInterno(protocolo);
  // Gabinete so enxerga ideias ja aprovadas na triagem.
  if (!ideia || !ehStatusPublico(ideia.status)) notFound();
  const { ok, erro } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <Retorno ok={ok} erro={erro} />
      <FichaIdeia
        ideia={ideia}
        voltar={{ href: "/gabinete", rotulo: "Voltar ao acervo" }}
        lateral={
          <>
            <Acoes ideia={ideia} sessao={sessao} />
            <Cartao titulo="Autor">
              <p className="text-sm">
                {exibicaoAutor({ nome: ideia.autor.nome, nomePublico: ideia.autor.nomePublico, tipo: ideia.autor.tipo })}
              </p>
              {!ideia.autor.nomePublico && (
                <p className="text-xs text-muted-foreground">
                  O autor não autorizou a divulgação do nome. Para contato, fale com a Secretaria.
                </p>
              )}
            </Cartao>
          </>
        }
      />
    </div>
  );
}
