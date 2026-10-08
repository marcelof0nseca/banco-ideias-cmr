"use client";

import { Search } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { CampoTexto } from "@/components/ui/Campo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup, FieldSeparator } from "@/components/ui/field";
import { LinhaDoTempo } from "@/components/ui/LinhaDoTempo";
import { SeloStatus } from "@/components/ui/SeloStatus";
import { Spinner } from "@/components/ui/spinner";
import { consultarAcompanhamento, type EstadoAcompanhar } from "./acoes";

/**
 * Formulario do Acompanhar + resultado. Melhoria progressiva: sem JS o POST
 * normal devolve a pagina com o mesmo estado; com JS o foco vai ao resultado
 * (ou ao erro) para o leitor de tela anunciar.
 */
export function FormAcompanhar() {
  const [estado, consultar, consultando] = useActionState<EstadoAcompanhar, FormData>(
    consultarAcompanhamento,
    { fase: "inicial" },
  );
  const resultado = useRef<HTMLHeadingElement>(null);
  const erro = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (estado.fase === "ok") resultado.current?.focus();
    if (estado.fase === "erro") {
      // Erro de um campo: foco no campo (o FieldError e anunciado); geral: no alerta.
      const campo = estado.campo === "protocolo" ? "protocolo" : estado.campo ? "documento" : null;
      if (campo) document.getElementById(campo)?.focus();
      else erro.current?.focus();
    }
  }, [estado]);

  const erroProtocolo = estado.fase === "erro" && estado.campo === "protocolo" ? estado.mensagem : null;
  const erroCredencial =
    estado.fase === "erro" && estado.campo === "credencial" ? estado.mensagem : null;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent>
          <form
            key={estado.fase === "inicial" ? 0 : estado.tentativa}
            action={consultar}
            className="flex flex-col gap-6"
          >
            {estado.fase === "erro" && !estado.campo && (
              <div ref={erro} tabIndex={-1}>
                <Alerta tipo="erro" titulo="Não foi possível consultar">
                  {estado.mensagem}
                </Alerta>
              </div>
            )}
            <FieldGroup className="max-w-md">
              <CampoTexto
                id="protocolo"
                name="protocolo"
                rotulo="Número de protocolo"
                dica="Está no comprovante, no formato BIL-AAAA-NNNNNN."
                obrigatorio
                autoComplete="off"
                spellCheck={false}
                maxLength={20}
                erro={erroProtocolo}
                defaultValue={
                  estado.fase === "erro"
                    ? estado.protocolo
                    : estado.fase === "ok"
                      ? estado.acompanhamento.protocolo
                      : ""
                }
              />
              <p className="text-sm text-muted-foreground">
                Para confirmar que você é o autor, preencha <strong>um</strong> dos dois campos
                abaixo.
              </p>
              <CampoTexto
                id="documento"
                name="documento"
                rotulo="CPF ou CNPJ do autor"
                dica="O mesmo informado no envio da ideia, com ou sem pontuação."
                inputMode="numeric"
                autoComplete="off"
                maxLength={18}
                erro={erroCredencial}
              />
              <FieldSeparator>ou</FieldSeparator>
              <CampoTexto
                id="token"
                name="token"
                rotulo="Token do comprovante"
                dica="Formato XXXX-XXXX-XXXX."
                autoComplete="off"
                spellCheck={false}
                maxLength={20}
              />
            </FieldGroup>
            <div>
              <Botao type="submit" disabled={consultando}>
                {consultando ? (
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                ) : (
                  <Search data-icon="inline-start" aria-hidden="true" />
                )}
                {consultando ? "Consultando…" : "Consultar situação"}
              </Botao>
            </div>
          </form>
        </CardContent>
      </Card>

      {estado.fase === "ok" && (
        <Card aria-labelledby="titulo-resultado">
          <CardHeader>
            <CardTitle>
              <h2
                id="titulo-resultado"
                ref={resultado}
                tabIndex={-1}
                className="text-lg font-bold text-marca"
              >
                {estado.acompanhamento.titulo}
              </h2>
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <span className="font-mono">{estado.acompanhamento.protocolo}</span>
              <span aria-hidden="true">·</span>
              <span>Situação atual:</span>
              <SeloStatus status={estado.acompanhamento.status} />
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {estado.acompanhamento.motivoArquivamento && (
              <Alerta tipo="atencao" titulo="Motivo do arquivamento">
                {estado.acompanhamento.motivoArquivamento}
                <p className="mt-1 text-xs text-muted-foreground">
                  Esta informação é visível só para você; a consulta pública não mostra o motivo.
                </p>
              </Alerta>
            )}
            <section aria-labelledby="titulo-tramitacao" className="flex flex-col gap-4">
              <h3 id="titulo-tramitacao" className="font-semibold text-marca">
                Tramitação
              </h3>
              <LinhaDoTempo eventos={estado.acompanhamento.linhaDoTempo} />
            </section>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
