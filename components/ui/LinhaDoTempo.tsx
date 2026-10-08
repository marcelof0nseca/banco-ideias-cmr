import type { EventoPublico } from "@/types/publico";
import { cn } from "@/lib/utils";
import { rotuloStatus } from "./status";

/**
 * Linha do tempo da tramitacao (lista ordenada, do mais antigo ao mais
 * recente). Usada no Acompanhar e no detalhe publico da ideia.
 * O marcador colorido e decorativo: a situacao vem escrita.
 */

const FORMATO_DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "America/Recife",
});

export function LinhaDoTempo({
  eventos,
  mostrarJustificativa = true,
}: {
  eventos: EventoPublico[];
  /** Na consulta publica a justificativa nao aparece (motivo e so do autor). */
  mostrarJustificativa?: boolean;
}) {
  return (
    <ol className="relative ml-2 flex flex-col gap-5 border-l-2 border-border pl-6">
      {eventos.map((e, i) => {
        const ultimo = i === eventos.length - 1;
        return (
          <li key={`${e.em}-${e.statusNovo}`} className="relative">
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-1 -left-[33px] size-4 rounded-full border-[3px] bg-card",
                e.statusNovo === "ARQUIVADA"
                  ? "border-vermelho-cmr bg-vermelho-cmr"
                  : e.statusNovo === "ADOTADA"
                    ? "border-verde-cmr bg-verde-cmr"
                    : ultimo
                      ? "border-primary bg-primary"
                      : "border-azul-medio",
              )}
            />
            <p className="text-sm text-muted-foreground">
              <time dateTime={e.em}>{FORMATO_DATA.format(new Date(e.em))}</time> · {e.autoria}
            </p>
            <p className="font-semibold">
              {rotuloStatus(e.statusNovo)}
              {ultimo && <span className="sr-only"> (situação atual)</span>}
            </p>
            {mostrarJustificativa && e.justificativa && <p className="text-sm">{e.justificativa}</p>}
          </li>
        );
      })}
    </ol>
  );
}
