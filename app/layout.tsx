import type { Metadata } from "next";
import localFont from "next/font/local";
import { VLibras } from "@/components/layout/VLibras";
import "./globals.css";

/**
 * Tipografia institucional (par "Corporate Trust", recomendado para governo
 * e acessibilidade): Lexend nos titulos - fonte desenhada para legibilidade -
 * e Source Sans 3 no corpo.
 *
 * Arquivos no proprio repositorio (app/fontes), servidos pelo next/font/local:
 * o build nao depende de nenhum servidor externo, em runtime nem em build -
 * compativel com a regra "sem recursos externos" (components/ui/tema.test.ts).
 */
const fonteTitulo = localFont({
  variable: "--ff-heading",
  display: "swap",
  src: [
    { path: "./fontes/lexend-500.woff2", weight: "500", style: "normal" },
    { path: "./fontes/lexend-600.woff2", weight: "600", style: "normal" },
    { path: "./fontes/lexend-700.woff2", weight: "700", style: "normal" },
  ],
});

const fonteCorpo = localFont({
  variable: "--ff-body",
  display: "swap",
  src: [
    { path: "./fontes/source-sans-3-400.woff2", weight: "400", style: "normal" },
    { path: "./fontes/source-sans-3-600.woff2", weight: "600", style: "normal" },
    { path: "./fontes/source-sans-3-700.woff2", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: {
    default: "Banco de Ideias Legislativas - Câmara Municipal do Recife",
    template: "%s | Banco de Ideias Legislativas",
  },
  description:
    "Canal de participação popular da Câmara Municipal do Recife. " +
    "Apresente ideias legislativas e acompanhe sua tramitação.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${fonteTitulo.variable} ${fonteCorpo.variable}`}>
      <body>
        {children}
        <VLibras />
      </body>
    </html>
  );
}
