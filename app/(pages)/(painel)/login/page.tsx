import { LockKeyhole } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { CampoTexto } from "@/components/ui/Campo";
import { Card, CardContent } from "@/components/ui/card";
import { sessaoAtual } from "@/lib/seguranca/auth";
import { entrar } from "./acoes";

export const metadata: Metadata = { title: "Acesso interno", robots: { index: false } };

/** Mensagem de erro a partir do parametro da URL (funciona sem JavaScript). */
function mensagemErro(erro?: string): string | null {
  if (!erro) return null;
  if (erro.startsWith("bloqueado")) {
    const min = erro.split("-")[1];
    return `Muitas tentativas seguidas. Por segurança, o acesso foi bloqueado por cerca de ${min ?? "15"} minutos.`;
  }
  return "E-mail ou senha incorretos.";
}

const INICIO = { TRIAGEM: "/triagem", GABINETE: "/gabinete", ADMIN: "/admin" } as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; destino?: string }>;
}) {
  // Ja autenticado: vai direto para a area do perfil.
  const sessao = await sessaoAtual();
  if (sessao) redirect(INICIO[sessao.perfil]);

  const { erro, destino } = await searchParams;
  const mensagem = mensagemErro(erro);

  return (
    <div className="mx-auto grid max-w-4xl items-start gap-8 py-4 md:grid-cols-[1fr_minmax(0,26rem)]">

      <Card>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-marca-fundo text-marca">
              <LockKeyhole aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-marca">Acesso interno</h1>
              <p className="text-sm text-muted-foreground">Servidores, gabinetes e administração.</p>
            </div>
          </div>

          {mensagem && (
            <Alerta tipo="erro" titulo="Não foi possível entrar">
              {mensagem}
            </Alerta>
          )}

          <form action={entrar} className="flex flex-col gap-5">
            <input type="hidden" name="destino" value={destino ?? ""} />
            <CampoTexto id="email" rotulo="E-mail" name="email" type="email" autoComplete="username" obrigatorio />
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
        </CardContent>
      </Card>
      <section aria-labelledby="titulo-area" className="hidden md:order-first md:block">
        <p className="text-sm font-semibold tracking-wide text-marca-medio uppercase">Painel interno</p>
        <h2 id="titulo-area" className="mt-1 text-2xl font-bold text-marca">
          Triagem, gabinetes e administração
        </h2>
        <p className="mt-3 text-muted-foreground">
          Aqui a Secretaria analisa as ideias recebidas, os gabinetes acompanham e adotam as propostas
          publicadas, e a administração cuida de usuários e da trilha de auditoria.
        </p>
        <ul className="mt-5 flex flex-col gap-2 text-sm text-muted-foreground">
          <li>• Toda ação fica registrada com autor, data e justificativa.</li>
          <li>• O CPF do cidadão aparece mascarado; revelá-lo é uma ação registrada.</li>
          <li>• A sessão expira após 30 minutos sem uso.</li>
        </ul>
      </section>
    </div>
  );
}
