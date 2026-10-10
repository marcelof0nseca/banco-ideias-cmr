import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { CampoTexto } from "@/components/ui/Campo";
import { sessaoAtual } from "@/lib/seguranca/auth";
import { entrar } from "./acoes";

export const metadata: Metadata = { title: "Acesso interno" };

/** Mensagem de erro a partir do parametro da URL (funciona sem JavaScript). */
function mensagemErro(erro?: string): string | null {
  if (!erro) return null;
  if (erro.startsWith("bloqueado")) {
    const min = erro.split("-")[1];
    return `Muitas tentativas. Tente novamente em cerca de ${min ?? "15"} minutos.`;
  }
  return "E-mail ou senha incorretos.";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; destino?: string }>;
}) {
  // Ja autenticado: vai direto ao painel.
  if (await sessaoAtual()) redirect("/triagem");

  const { erro, destino } = await searchParams;
  const mensagem = mensagemErro(erro);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-marca-medio">
          Banco de Ideias Legislativas
        </p>
        <h1 className="mt-1 text-2xl font-bold text-marca">Acesso interno</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Área restrita a servidores da Secretaria, gabinetes e administração.
        </p>

        {mensagem && (
          <Alerta tipo="erro" titulo="Não foi possível entrar" className="mt-5">
            {mensagem}
          </Alerta>
        )}

        <form action={entrar} className="mt-6 space-y-5">
          <input type="hidden" name="destino" value={destino ?? "/triagem"} />
          <CampoTexto
            id="email"
            rotulo="E-mail"
            name="email"
            type="email"
            autoComplete="username"
            obrigatorio
          />
          <CampoTexto
            id="senha"
            rotulo="Senha"
            name="senha"
            type="password"
            autoComplete="current-password"
            obrigatorio
          />
          <Botao type="submit" className="w-full">
            Entrar
          </Botao>
        </form>
      </div>
    </div>
  );
}
