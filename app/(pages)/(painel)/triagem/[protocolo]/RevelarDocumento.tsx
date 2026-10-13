"use client";

import { Eye } from "lucide-react";
import { useActionState } from "react";
import { revelar, type EstadoRevelar } from "../acoes";

/**
 * Botao "Revelar" do CPF/CNPJ. O documento volta no ESTADO da acao (nunca
 * na URL) e cada revelacao e registrada na auditoria antes de aparecer.
 * Funciona sem JS (useActionState com Server Action). DONO: Pessoa B.
 */
export function RevelarDocumento({ ideiaId, mascarado }: { ideiaId: string; mascarado: string }) {
  const [estado, acao, enviando] = useActionState<EstadoRevelar, FormData>(revelar, { fase: "inicial" });

  if (estado.fase === "ok") {
    return (
      <div>
        <p className="font-mono text-base font-semibold tracking-wide">{estado.documento}</p>
        <p className="mt-1 text-xs text-muted-foreground">Acesso registrado na trilha de auditoria.</p>
      </div>
    );
  }

  return (
    <form action={acao} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="ideiaId" value={ideiaId} />
      <span className="font-mono text-base tracking-wide">{mascarado}</span>
      <button
        type="submit"
        disabled={enviando}
        className="inline-flex items-center gap-1.5 rounded-md border border-marca-medio/40 bg-card px-2.5 py-1 text-xs font-semibold text-marca hover:bg-secondary disabled:opacity-60"
      >
        <Eye aria-hidden="true" className="size-3.5" />
        Revelar
      </button>
      {estado.fase === "erro" && (
        <p role="alert" className="w-full text-sm text-destructive">
          {estado.mensagem}
        </p>
      )}
    </form>
  );
}
