import "dotenv/config";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashSenha, senhaForte, SENHA_MINIMA } from "../lib/seguranca/senha";
import { Prisma, PrismaClient } from "./gen/client";

/**
 * Cria o PRIMEIRO administrador do painel (ou recupera o acesso de um).
 * Roda no servidor, pela TI, dentro do conteiner de manutencao:
 *
 *   docker compose run --rm migrar npm run admin:criar
 *
 * Pergunta nome, e-mail e senha (a senha nao aparece na tela nem fica no
 * historico do terminal). Os demais usuarios sao criados pelo proprio
 * administrador no painel (Administracao > Acessos).
 *
 * Opcoes:
 *   --nome "Fulana de Tal" --email fulana@recife.pe.leg.br   (pula as perguntas)
 *   --redefinir   troca a senha de um administrador que ja existe e
 *                 desbloqueia a conta (senha esquecida ou conta bloqueada)
 *
 * Sem terminal interativo (automacao), le senha e confirmacao do stdin,
 * uma por linha. Tudo fica registrado na trilha de auditoria.
 * DONO: Pessoa B.
 */

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// Entrada: terminal interativo (senha oculta) ou stdin (automacao)
// ---------------------------------------------------------------------------
let linhasStdin: string[] | null = null;

async function lerStdin(): Promise<string[]> {
  if (linhasStdin) return linhasStdin;
  const partes: Buffer[] = [];
  for await (const p of process.stdin) partes.push(p as Buffer);
  linhasStdin = Buffer.concat(partes).toString("utf8").split(/\r?\n/);
  return linhasStdin;
}

async function perguntar(texto: string, oculto = false): Promise<string> {
  if (!process.stdin.isTTY) {
    const linhas = await lerStdin();
    return (linhas.shift() ?? "").trim();
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const saida = rl as unknown as { _writeToOutput: (s: string) => void };
  let mudo = false;
  saida._writeToOutput = (s) => {
    if (!mudo) process.stdout.write(s);
  };
  process.stdout.write(texto);
  mudo = oculto;
  const resposta = await new Promise<string>((ok) => rl.question("", ok));
  rl.close();
  if (oculto) process.stdout.write("\n");
  return resposta.trim();
}

function falhar(mensagem: string): never {
  console.error(`\nERRO: ${mensagem}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
async function main() {
  if (!process.env.DATABASE_URL) falhar("DATABASE_URL não definido. Confira o arquivo .env.");

  const { values } = parseArgs({
    options: {
      nome: { type: "string" },
      email: { type: "string" },
      redefinir: { type: "boolean", default: false },
    },
  });
  const redefinir = values.redefinir === true;

  console.log(
    redefinir
      ? "\nRedefinir a senha de um administrador do Banco de Ideias\n"
      : "\nCriar administrador do Banco de Ideias\n",
  );

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const email = (values.email ?? (await perguntar("E-mail institucional: "))).trim().toLowerCase();
    if (!EMAIL_VALIDO.test(email)) falhar("e-mail inválido.");

    const existente = await prisma.usuario.findUnique({ where: { email }, select: { id: true, perfil: true } });

    let nome = "";
    if (redefinir) {
      if (!existente) falhar("não existe usuário com esse e-mail. Para criar, rode sem --redefinir.");
      if (existente.perfil !== "ADMIN") {
        falhar("esse usuário não é administrador. A senha dele é redefinida no painel, por um administrador.");
      }
    } else {
      if (existente) falhar("já existe usuário com esse e-mail. Para trocar a senha, use --redefinir.");
      nome = (values.nome ?? (await perguntar("Nome completo: "))).trim();
      if (nome.length < 3) falhar("informe o nome completo.");
    }

    const senha = await perguntar(`Senha (mínimo ${SENHA_MINIMA} caracteres, não aparece na tela): `, true);
    if (!senhaForte(senha)) falhar(`a senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
    const confirmacao = await perguntar("Repita a senha: ", true);
    if (senha !== confirmacao) falhar("as senhas não conferem.");

    const senhaHash = await hashSenha(senha);

    if (redefinir && existente) {
      await prisma.$transaction(async (tx) => {
        await tx.usuario.update({
          where: { id: existente.id },
          data: { senhaHash, ativo: true, tentativasFalhas: 0, bloqueadoAte: null },
        });
        await tx.eventoAuditoria.create({
          data: {
            acao: "USUARIO_ALTERADO",
            alvoTipo: Prisma.ModelName.Usuario,
            alvoId: existente.id,
            detalhe: "Senha redefinida e conta desbloqueada pelo terminal do servidor (admin:criar --redefinir).",
          },
        });
      });
      console.log("\nPronto: senha redefinida e conta desbloqueada. Já é possível entrar em /login.\n");
    } else {
      await prisma.$transaction(async (tx) => {
        const criado = await tx.usuario.create({
          data: { nome, email, perfil: "ADMIN", senhaHash },
          select: { id: true },
        });
        await tx.eventoAuditoria.create({
          data: {
            acao: "USUARIO_CRIADO",
            alvoTipo: Prisma.ModelName.Usuario,
            alvoId: criado.id,
            detalhe: "Administrador criado pelo terminal do servidor (admin:criar).",
          },
        });
      });
      console.log("\nPronto: administrador criado. Entre em /login com esse e-mail e senha.");
      console.log("Os demais usuários se criam no painel: Administração > Acessos.\n");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((erro: unknown) => {
  // Nunca imprime senha: so a mensagem do erro.
  falhar(erro instanceof Error ? erro.message : String(erro));
});
