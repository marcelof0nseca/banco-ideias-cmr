"use client";

import { Heart } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { CampoTexto } from "@/components/ui/Campo";
import { Spinner } from "@/components/ui/spinner";
import { registrarApoio, type EstadoApoio } from "./acoes";

/**
 * Formulario de apoio no detalhe da ideia. Melhoria progressiva: sem JS o
 * POST devolve a pagina com o resultado. O total de apoios exibido acima e
 * atualizado pelo resultado (onApoio) quando ha JS.
 */
export function FormApoio({
  protocolo,
  iniciadoEm,
  apoiosIniciais,
}: {
  protocolo: string;
  iniciadoEm: string;
  apoiosIniciais: number;
}) {
  const [estado, apoiar, enviando] = useActionState<EstadoApoio, FormData>(registrarApoio, {
    fase: "inicial",
  });
  const aviso = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (estado.fase === "ok" || (estado.fase === "erro" && !estado.campo)) aviso.current?.focus();
    if (estado.fase === "erro" && estado.campo) document.getElementById("documento-apoio")?.focus();
  }, [estado]);

  const total = estado.fase === "ok" ? estado.apoiosCount : apoiosIniciais;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg">
        <strong className="text-2xl font-semibold text-marca">{total.toLocaleString("pt-BR")}</strong>{" "}
        {total === 1 ? "pessoa apoia" : "pessoas apoiam"} esta ideia.
      </p>

      {estado.fase === "ok" ? (
        <div ref={aviso} tabIndex={-1}>
          <Alerta tipo="sucesso" titulo="Apoio registrado">
            Obrigado! Seu apoio foi contado. Seu CPF não fica guardado nem aparece em lugar nenhum.
          </Alerta>
        </div>
      ) : (
        <form key={estado.fase === "erro" ? estado.tentativa : 0} action={apoiar} className="flex flex-col gap-4">
          <input type="hidden" name="protocolo" value={protocolo} />
          <input type="hidden" name="iniciadoEm" value={iniciadoEm} />
          <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
            <label htmlFor="site-apoio">Não preencha este campo</label>
            <input id="site-apoio" name="site" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>

          {estado.fase === "erro" && !estado.campo && (
            <div ref={aviso} tabIndex={-1}>
              <Alerta tipo={estado.jaApoiou ? "info" : "erro"}>
                {estado.mensagem}
              </Alerta>
            </div>
          )}

          <CampoTexto
            id="documento-apoio"
            name="documento"
            rotulo="Seu CPF ou CNPJ"
            dica="Usado só para garantir um apoio por pessoa. Não é guardado: só um código derivado dele."
            obrigatorio
            inputMode="numeric"
            autoComplete="off"
            maxLength={18}
            erro={estado.fase === "erro" && estado.campo ? estado.mensagem : null}
          />
          <div>
            <Botao type="submit" disabled={enviando}>
              {enviando ? (
                <Spinner data-icon="inline-start" aria-hidden="true" />
              ) : (
                <Heart data-icon="inline-start" aria-hidden="true" />
              )}
              {enviando ? "Registrando…" : "Apoiar esta ideia"}
            </Botao>
          </div>
        </form>
      )}
    </div>
  );
}
