import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

/**
 * Campos de formulario acessiveis (eMAG 6 / WCAG 1.3.1, 3.3.1, 3.3.2):
 *   - <label> associado pelo id;
 *   - instrucao (dica) ANTES do controle, ligada por aria-describedby;
 *   - erro ligado por aria-describedby + aria-invalid, numa regiao aria-live
 *     para ser anunciado quando aparece por validacao no navegador.
 *
 * Os componentes nao tem estado: servem a formularios que funcionam sem JS.
 */

interface BaseCampo {
  id: string;
  rotulo: string;
  dica?: ReactNode;
  erro?: string | null;
  obrigatorio?: boolean;
  className?: string;
}

const CLASSES_CONTROLE =
  "w-full rounded-md border-[1.5px] border-linha bg-campo px-3 py-2 text-[15px] text-tinta " +
  "focus:border-azul-acao focus:bg-white " +
  "aria-invalid:border-vermelho-cmr aria-invalid:bg-vermelho-fundo";

/** ids derivados: usados pelo controle em aria-describedby. */
export function idsCampo(id: string) {
  return { dica: `${id}-dica`, erro: `${id}-erro` };
}

function ariaDoControle(base: BaseCampo) {
  const ids = idsCampo(base.id);
  const descritores = [base.dica ? ids.dica : null, base.erro ? ids.erro : null]
    .filter(Boolean)
    .join(" ");
  return {
    id: base.id,
    "aria-describedby": descritores || undefined,
    "aria-invalid": base.erro ? true : undefined,
    required: base.obrigatorio,
  };
}

function Moldura({ base, children }: { base: BaseCampo; children: ReactNode }) {
  const ids = idsCampo(base.id);
  return (
    <div className={`flex flex-col ${base.className ?? ""}`}>
      <label htmlFor={base.id} className="mb-1 text-sm font-semibold">
        {base.rotulo}
        {base.obrigatorio && (
          <>
            {" "}
            <span className="text-vermelho-cmr" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(obrigatório)</span>
          </>
        )}
      </label>
      {base.dica && (
        <p id={ids.dica} className="mb-1.5 text-[13px] text-cinza">
          {base.dica}
        </p>
      )}
      {children}
      <p
        id={ids.erro}
        aria-live="polite"
        className="mt-1 text-[13px] font-semibold text-vermelho-cmr empty:hidden"
      >
        {base.erro ?? ""}
      </p>
    </div>
  );
}

type PropsNativas<T> = Omit<T, "id" | "required" | "className">;

export function CampoTexto({
  id,
  rotulo,
  dica,
  erro,
  obrigatorio,
  className,
  ...nativo
}: BaseCampo & PropsNativas<InputHTMLAttributes<HTMLInputElement>>) {
  const base = { id, rotulo, dica, erro, obrigatorio, className };
  return (
    <Moldura base={base}>
      <input className={CLASSES_CONTROLE} {...ariaDoControle(base)} {...nativo} />
    </Moldura>
  );
}

export function CampoAreaTexto({
  id,
  rotulo,
  dica,
  erro,
  obrigatorio,
  className,
  ...nativo
}: BaseCampo & PropsNativas<TextareaHTMLAttributes<HTMLTextAreaElement>>) {
  const base = { id, rotulo, dica, erro, obrigatorio, className };
  return (
    <Moldura base={base}>
      <textarea
        className={`${CLASSES_CONTROLE} min-h-28 resize-y`}
        {...ariaDoControle(base)}
        {...nativo}
      />
    </Moldura>
  );
}

export function CampoSelecao({
  id,
  rotulo,
  dica,
  erro,
  obrigatorio,
  className,
  children,
  ...nativo
}: BaseCampo & PropsNativas<SelectHTMLAttributes<HTMLSelectElement>>) {
  const base = { id, rotulo, dica, erro, obrigatorio, className };
  return (
    <Moldura base={base}>
      <select className={CLASSES_CONTROLE} {...ariaDoControle(base)} {...nativo}>
        {children}
      </select>
    </Moldura>
  );
}
