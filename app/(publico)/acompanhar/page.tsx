import type { Metadata } from "next";
import { FormAcompanhar } from "./FormAcompanhar";

export const metadata: Metadata = {
  title: "Acompanhar minha ideia",
  description: "Consulte a situação da ideia que você enviou à Câmara Municipal do Recife.",
  // Pagina de consulta pessoal: nao precisa aparecer em buscadores.
  robots: { index: false },
};

export default function AcompanharPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-azul-cmr">Acompanhar minha ideia</h1>
        <p className="mt-1 text-muted-foreground">
          Veja a situação da ideia que você enviou, inclusive enquanto ela está em triagem. Se a
          ideia for arquivada, o motivo aparece aqui.
        </p>
      </div>
      <FormAcompanhar />
    </div>
  );
}
