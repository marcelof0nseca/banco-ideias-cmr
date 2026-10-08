import "dotenv/config";
import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, StatusIdeia } from "./gen/client";

/**
 * Carga de dados FICTICIOS para desenvolvimento e homologacao.
 * Especificacao, secao 11.2: nunca usar copia de producao.
 *
 * Inclui as listas controladas (temas, motivos), usuarios de teste e as tres
 * ideias do prototipo, para que o fluxo possa ser percorrido ponta a ponta
 * no dia 1, mesmo antes das rotas reais existirem.
 *
 * Observacao: para nao depender de lib/seguranca/documento.ts (que exige as variaveis
 * de ambiente de chave/pepper) nem de argon2 ainda nao instalado, o seed usa
 * hashes locais simples e senha de placeholder. Sao dados de teste.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TEMAS = [
  "Mobilidade Urbana",
  "Saúde Pública",
  "Meio Ambiente",
  "Educação",
  "Segurança",
  "Assistência Social",
  "Cultura e Esporte",
  "Urbanismo e Habitação",
  "Direitos Humanos",
  "Desenvolvimento Econômico",
];

const MOTIVOS = [
  { codigo: "FORA_DA_COMPETENCIA", descricao: "Fora da competência do Município" },
  { codigo: "OFENSIVO", descricao: "Conteúdo ofensivo ou discriminatório" },
  { codigo: "DUPLICADA", descricao: "Duplicidade de ideia já registrada" },
  { codigo: "IDENTIFICACAO", descricao: "Identificação do autor inválida ou incompleta" },
  { codigo: "INCOMPREENSIVEL", descricao: "Texto incompreensível ou sem objeto definido" },
];

function hashFake(valor: string): string {
  return createHash("sha256").update(`seed:${valor}`).digest("hex");
}

function diasAtras(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  console.log("Limpando dados anteriores...");
  await prisma.tramitacao.deleteMany();
  await prisma.apoio.deleteMany();
  await prisma.interesseGabinete.deleteMany();
  await prisma.ideia.deleteMany();
  await prisma.autor.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.tema.deleteMany();
  await prisma.motivoArquivamento.deleteMany();
  await prisma.contadorProtocolo.deleteMany();

  console.log("Temas...");
  const temas = new Map<string, string>();
  for (let i = 0; i < TEMAS.length; i++) {
    const t = await prisma.tema.create({
      data: { nome: TEMAS[i]!, ordem: i },
    });
    temas.set(TEMAS[i]!, t.id);
  }

  console.log("Motivos de arquivamento...");
  for (let i = 0; i < MOTIVOS.length; i++) {
    await prisma.motivoArquivamento.create({
      data: { ...MOTIVOS[i]!, ordem: i },
    });
  }

  console.log("Usuários de teste (senha provisória - trocar antes de usar)...");
  const SENHA_FAKE = "argon2id$placeholder$trocar-na-semana-2";
  await prisma.usuario.createMany({
    data: [
      { nome: "Servidor Triagem", email: "triagem@exemplo.gov.br", senhaHash: SENHA_FAKE, perfil: "TRIAGEM" },
      { nome: "Gabinete Teste", email: "gabinete@exemplo.gov.br", senhaHash: SENHA_FAKE, perfil: "GABINETE", gabinete: "Gabinete Ver. Teste" },
      { nome: "Administrador", email: "admin@exemplo.gov.br", senhaHash: SENHA_FAKE, perfil: "ADMIN" },
    ],
  });

  console.log("Contador de protocolo do ano...");
  const ano = new Date().getFullYear();
  await prisma.contadorProtocolo.create({ data: { ano, ultimo: 3 } });

  console.log("Ideias de exemplo (as três do protótipo)...");

  // #1 - RECEBIDA (aguardando triagem)
  const autor1 = await prisma.autor.create({
    data: {
      tipo: "FISICA",
      documentoCifrado: "seed:fake",
      documentoHash: hashFake("52998224725"),
      documentoMascarado: "529.***.***-25",
      nome: "João Silva",
      email: "joao@exemplo.com",
      nomePublico: true,
      consentimentoEm: diasAtras(12),
      avisoPrivacidadeVersao: "2026-10-01",
    },
  });
  await prisma.ideia.create({
    data: {
      protocolo: `BIL-${ano}-000001`,
      tokenAcompHash: hashFake("token1"),
      autorId: autor1.id,
      temaId: temas.get("Saúde Pública")!,
      titulo: "Farmácia 24h nas UPAs",
      descricao:
        "Manter farmácias abertas 24 horas nas Unidades de Pronto Atendimento, para que quem é atendido de madrugada consiga retirar o medicamento na hora.",
      status: StatusIdeia.RECEBIDA,
      bairro: "Casa Amarela",
      rpa: 2,
      apoiosCount: 4,
      criadoEm: diasAtras(12),
      tramitacoes: {
        create: [
          { statusNovo: StatusIdeia.RECEBIDA, justificativa: "Ideia registrada pelo portal.", criadoEm: diasAtras(12) },
        ],
      },
    },
  });

  // #2 - DISPONIVEL
  const autor2 = await prisma.autor.create({
    data: {
      tipo: "JURIDICA",
      documentoCifrado: "seed:fake",
      documentoHash: hashFake("11222333000181"),
      documentoMascarado: "11.***.***/****-81",
      nome: "ONG Recife Verde",
      email: "contato@recifeverde.org",
      nomePublico: true,
      consentimentoEm: diasAtras(40),
      avisoPrivacidadeVersao: "2026-10-01",
    },
  });
  await prisma.ideia.create({
    data: {
      protocolo: `BIL-${ano}-000002`,
      tokenAcompHash: hashFake("token2"),
      autorId: autor2.id,
      temaId: temas.get("Meio Ambiente")!,
      titulo: "Hortas comunitárias nas escolas municipais",
      descricao:
        "Implantar hortas nas escolas da rede municipal como prática de educação ambiental, integrando o cultivo ao conteúdo de ciências e à merenda escolar.",
      status: StatusIdeia.DISPONIVEL,
      bairro: "Várzea",
      rpa: 3,
      apoiosCount: 23,
      criadoEm: diasAtras(40),
      triadoEm: diasAtras(34),
      publicadoEm: diasAtras(34),
      tramitacoes: {
        create: [
          { statusNovo: StatusIdeia.RECEBIDA, justificativa: "Ideia registrada pelo portal.", criadoEm: diasAtras(40) },
          { statusAnterior: StatusIdeia.RECEBIDA, statusNovo: StatusIdeia.EM_TRIAGEM, justificativa: "Análise iniciada.", criadoEm: diasAtras(36) },
          { statusAnterior: StatusIdeia.EM_TRIAGEM, statusNovo: StatusIdeia.DISPONIVEL, justificativa: "Matéria de competência municipal e identificação regular.", criadoEm: diasAtras(34) },
        ],
      },
    },
  });

  // #3 - EM_ANALISE (com interesse de gabinete)
  const autor3 = await prisma.autor.create({
    data: {
      tipo: "FISICA",
      documentoCifrado: "seed:fake",
      documentoHash: hashFake("16899535009"),
      documentoMascarado: "168.***.***-09",
      nome: "Maria Santos",
      email: "maria@exemplo.com",
      nomePublico: true,
      consentimentoEm: diasAtras(55),
      avisoPrivacidadeVersao: "2026-10-01",
    },
  });
  await prisma.ideia.create({
    data: {
      protocolo: `BIL-${ano}-000003`,
      tokenAcompHash: hashFake("token3"),
      autorId: autor3.id,
      temaId: temas.get("Mobilidade Urbana")!,
      titulo: "Ciclovia protegida na Av. Norte",
      descricao:
        "Implantar ciclovia com separação física na Avenida Norte, reduzindo o risco de atropelamento de ciclistas no trajeto para o Centro.",
      status: StatusIdeia.EM_ANALISE,
      bairro: "Encruzilhada",
      rpa: 2,
      apoiosCount: 57,
      criadoEm: diasAtras(55),
      triadoEm: diasAtras(48),
      publicadoEm: diasAtras(48),
      interesses: {
        create: [{ gabinete: "Gabinete Ver. Carlos", tipo: "ANALISE", criadoEm: diasAtras(8) }],
      },
      tramitacoes: {
        create: [
          { statusNovo: StatusIdeia.RECEBIDA, justificativa: "Ideia registrada pelo portal.", criadoEm: diasAtras(55) },
          { statusAnterior: StatusIdeia.RECEBIDA, statusNovo: StatusIdeia.EM_TRIAGEM, justificativa: "Análise iniciada.", criadoEm: diasAtras(50) },
          { statusAnterior: StatusIdeia.EM_TRIAGEM, statusNovo: StatusIdeia.DISPONIVEL, justificativa: "Aprovada para o acervo público.", criadoEm: diasAtras(48) },
          { statusAnterior: StatusIdeia.DISPONIVEL, statusNovo: StatusIdeia.EM_ANALISE, gabinete: "Gabinete Ver. Carlos", justificativa: "Gabinete assumiu a análise técnica da proposta.", criadoEm: diasAtras(8) },
        ],
      },
    },
  });

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
