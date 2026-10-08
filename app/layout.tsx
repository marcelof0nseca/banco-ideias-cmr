import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
