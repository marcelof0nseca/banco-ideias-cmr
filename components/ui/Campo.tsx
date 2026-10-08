import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "./field";
import { Input } from "./input";
import { NativeSelect } from "./native-select";
import { Textarea } from "./textarea";

/**
 * Campos de formulario acessiveis (eMAG 6 / WCAG 1.3.1, 3.3.1, 3.3.2), sobre
 * Field/Input/Textarea/NativeSelect do shadcn/ui:
 *   - <label> associado pelo id;
 *   - instrucao (dica) ANTES do controle, ligada por aria-describedby;
 *   - erro ligado por aria-describedby + aria-invalid (e data-invalid no
 *     Field); o FieldError tem role="alert" e e anunciado ao aparecer.
 *
 * Sem estado e com <select> nativo: servem a formularios que funcionam sem JS.
 */

interface BaseCampo {
  id: string;
  rotulo: string;
  dica?: ReactNode;
  erro?: string | null;
  obrigatorio?: boolean;
  className?: string;
}

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
    <Field data-invalid={base.erro ? true : undefined} className={base.className}>
      <FieldLabel htmlFor={base.id}>
        {base.rotulo}
        {base.obrigatorio && (
          <>
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(obrigatório)</span>
          </>
        )}
      </FieldLabel>
      {base.dica && <FieldDescription id={ids.dica}>{base.dica}</FieldDescription>}
      {children}
      {base.erro && <FieldError id={ids.erro}>{base.erro}</FieldError>}
    </Field>
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
      <Input {...ariaDoControle(base)} {...nativo} />
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
      <Textarea className="min-h-32" {...ariaDoControle(base)} {...nativo} />
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
}: BaseCampo & Omit<PropsNativas<SelectHTMLAttributes<HTMLSelectElement>>, "size">) {
  const base = { id, rotulo, dica, erro, obrigatorio, className };
  return (
    <Moldura base={base}>
      <NativeSelect {...ariaDoControle(base)} {...nativo}>
        {children}
      </NativeSelect>
    </Moldura>
  );
}
