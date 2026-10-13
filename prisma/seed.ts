import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashToken } from "../lib/ideias/cadastro";
import { prepararDocumento } from "../lib/seguranca/documento";
import { hashSenha } from "../lib/seguranca/senha";
import { PrismaClient, StatusIdeia, type TipoAutor } from "./gen/client";

/**
 * Carga de dados FICTICIOS para desenvolvimento e homologacao.
 * Especificacao, secao 11.2: nunca usar copia de producao. DONO: Pessoa B.
 *
 * - Listas controladas (temas, motivos de arquivamento).
 * - Usuarios internos de teste (um por perfil), senha argon2id real.
 * - Ideias em TODAS as situacoes, para demonstrar triagem, gabinete e
 *   consulta. Os documentos sao cifrados de verdade (lib/seguranca/documento),
 *   entao "Acompanhar" e "Revelar CPF" funcionam com os dados de exemplo.
 *
 * Exige DOCUMENTO_CHAVE e DOCUMENTO_PEPPER no .env.
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

const SENHA_DEV = "banco-ideias-2026";
const GABINETE_TESTE = "Gabinete Ver. Teste";

function diasAtras(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

interface Passo {
  para: StatusIdeia;
  dias: number;
  justificativa: string;
  gabinete?: string;
  motivo?: string; // codigo do motivo de arquivamento
}

interface Exemplo {
  numero: number;
  token: string;
  autor: { tipo: TipoAutor; documento: string; nome: string; email: string; nomePublico: boolean };
  tema: string;
  titulo: string;
  descricao: string;
  bairro: string;
  rpa: number;
  apoios: number;
  criadoDias: number;
  passos: Passo[];
  interesses?: { gabinete: string; tipo: "ANALISE" | "ADOCAO"; dias: number }[];
}

const EXEMPLOS: Exemplo[] = [
  {
    numero: 1,
    token: "TEST-2222-AAAA",
    autor: { tipo: "FISICA", documento: "529.982.247-25", nome: "João Silva", email: "joao@exemplo.com", nomePublico: true },
    tema: "Saúde Pública",
    titulo: "Farmácia 24h nas UPAs",
    descricao:
      "Manter farmácias abertas 24 horas nas Unidades de Pronto Atendimento, para que quem é atendido de madrugada consiga retirar o medicamento na hora.",
    bairro: "Casa Amarela",
    rpa: 3,
    apoios: 4,
    criadoDias: 12,
    passos: [],
  },
  {
    numero: 2,
    token: "TEST-3333-BBBB",
    autor: { tipo: "JURIDICA", documento: "11.222.333/0001-81", nome: "ONG Recife Verde", email: "contato@recifeverde.org", nomePublico: true },
    tema: "Meio Ambiente",
    titulo: "Hortas comunitárias nas escolas municipais",
    descricao:
      "Implantar hortas nas escolas da rede municipal como prática de educação ambiental, integrando o cultivo ao conteúdo de ciências e à merenda escolar.",
    bairro: "Várzea",
    rpa: 4,
    apoios: 23,
    criadoDias: 40,
    passos: [
      { para: "EM_TRIAGEM", dias: 36, justificativa: "Análise iniciada pela Secretaria." },
      { para: "DISPONIVEL", dias: 34, justificativa: "Matéria de competência municipal e identificação regular." },
    ],
  },
  {
    numero: 3,
    token: "TEST-4444-CCCC",
    autor: { tipo: "FISICA", documento: "168.995.350-09", nome: "Maria Santos", email: "maria@exemplo.com", nomePublico: true },
    tema: "Mobilidade Urbana",
    titulo: "Ciclovia protegida na Av. Norte",
    descricao:
      "Implantar ciclovia com separação física na Avenida Norte, reduzindo o risco de atropelamento de ciclistas no trajeto para o Centro.",
    bairro: "Encruzilhada",
    rpa: 2,
    apoios: 57,
    criadoDias: 55,
    passos: [
      { para: "EM_TRIAGEM", dias: 50, justificativa: "Análise iniciada pela Secretaria." },
      { para: "DISPONIVEL", dias: 48, justificativa: "Aprovada para o acervo público." },
      { para: "EM_ANALISE", dias: 8, justificativa: "Gabinete iniciou a análise técnica da proposta.", gabinete: "Gabinete Ver. Carlos" },
    ],
    interesses: [{ gabinete: "Gabinete Ver. Carlos", tipo: "ANALISE", dias: 8 }],
  },
  {
    numero: 4,
    token: "TEST-5555-DDDD",
    autor: { tipo: "FISICA", documento: "397.118.410-37", nome: "Ana Paula Ferreira", email: "ana@exemplo.com", nomePublico: false },
    tema: "Segurança",
    titulo: "Iluminação de LED nas praças dos bairros",
    descricao:
      "Trocar a iluminação das praças por lâmpadas de LED e ampliar o horário de funcionamento, para que as famílias possam usar os espaços à noite com segurança.",
    bairro: "Ibura",
    rpa: 6,
    apoios: 11,
    criadoDias: 26,
    passos: [{ para: "EM_TRIAGEM", dias: 24, justificativa: "Análise iniciada pela Secretaria." }],
  },
  {
    numero: 5,
    token: "TEST-6666-EEEE",
    autor: { tipo: "FISICA", documento: "714.602.583-71", nome: "Carlos Eduardo Lima", email: "carlos@exemplo.com", nomePublico: true },
    tema: "Urbanismo e Habitação",
    titulo: "Banheiros públicos acessíveis no Centro",
    descricao:
      "Instalar banheiros públicos acessíveis a pessoas com deficiência nas principais ruas de comércio do Centro, com manutenção diária.",
    bairro: "Santo Antônio",
    rpa: 1,
    apoios: 2,
    criadoDias: 2,
    passos: [],
  },
  {
    numero: 6,
    token: "TEST-7777-FFFF",
    autor: { tipo: "FISICA", documento: "258.036.914-70", nome: "Roberto Alves", email: "roberto@exemplo.com", nomePublico: false },
    tema: "Mobilidade Urbana",
    titulo: "Duplicação da BR-101 no trecho urbano",
    descricao:
      "Duplicar a rodovia federal BR-101 no trecho que corta o Recife para reduzir os congestionamentos no horário de pico.",
    bairro: "Imbiribeira",
    rpa: 6,
    apoios: 0,
    criadoDias: 30,
    passos: [
      { para: "EM_TRIAGEM", dias: 28, justificativa: "Análise iniciada pela Secretaria." },
      {
        para: "ARQUIVADA",
        dias: 27,
        justificativa:
          "Rodovias federais são de competência da União. Sugerimos encaminhar a proposta à bancada federal de Pernambuco.",
        motivo: "FORA_DA_COMPETENCIA",
      },
    ],
  },
  {
    numero: 7,
    token: "TEST-8888-GGGG",
    autor: { tipo: "JURIDICA", documento: "11.222.333/0001-81", nome: "ONG Recife Verde", email: "contato@recifeverde.org", nomePublico: true },
    tema: "Desenvolvimento Econômico",
    titulo: "Wi-Fi gratuito nos terminais de ônibus",
    descricao:
      "Oferecer internet sem fio gratuita nos terminais integrados de ônibus, permitindo que os passageiros acessem serviços públicos digitais enquanto esperam.",
    bairro: "Boa Vista",
    rpa: 1,
    apoios: 41,
    criadoDias: 70,
    passos: [
      { para: "EM_TRIAGEM", dias: 66, justificativa: "Análise iniciada pela Secretaria." },
      { para: "DISPONIVEL", dias: 63, justificativa: "Aprovada para o acervo público." },
      { para: "EM_ANALISE", dias: 30, justificativa: "Gabinete iniciou a análise da proposta.", gabinete: GABINETE_TESTE },
      { para: "ADOTADA", dias: 6, justificativa: "Ideia adotada para apresentação de projeto de lei.", gabinete: GABINETE_TESTE },
    ],
    interesses: [{ gabinete: GABINETE_TESTE, tipo: "ADOCAO", dias: 30 }],
  },
];

async function main() {
  console.log("Limpando dados anteriores...");
  // TRUNCATE em vez de deleteMany: "tramitacao" e append-only (migracao 002
  // bloqueia DELETE), e TRUNCATE nao dispara o gatilho de DELETE. E um reset
  // explicito de ambiente de desenvolvimento - o seed nao roda em producao.
  await prisma.$executeRaw`TRUNCATE TABLE
    "tramitacao","apoio","interesse_gabinete","ideia","autor",
    "usuario","tema","motivo_arquivamento","evento_auditoria","contador_protocolo"
   RESTART IDENTITY CASCADE`;

  console.log("Temas e motivos de arquivamento...");
  const temas = new Map<string, string>();
  for (const [ordem, nome] of TEMAS.entries()) {
    const t = await prisma.tema.create({ data: { nome, ordem } });
    temas.set(nome, t.id);
  }
  const motivos = new Map<string, string>();
  for (const [ordem, m] of MOTIVOS.entries()) {
    const criado = await prisma.motivoArquivamento.create({ data: { ...m, ordem } });
    motivos.set(m.codigo, criado.id);
  }

  console.log("Usuários internos de teste...");
  const senhaHash = await hashSenha(SENHA_DEV);
  const triagem = await prisma.usuario.create({
    data: { nome: "Servidor Triagem", email: "triagem@exemplo.gov.br", senhaHash, perfil: "TRIAGEM" },
  });
  const gabinete = await prisma.usuario.create({
    data: { nome: "Gabinete Teste", email: "gabinete@exemplo.gov.br", senhaHash, perfil: "GABINETE", gabinete: GABINETE_TESTE },
  });
  await prisma.usuario.create({
    data: { nome: "Administrador", email: "admin@exemplo.gov.br", senhaHash, perfil: "ADMIN" },
  });

  console.log("Ideias de exemplo (todas as situações)...");
  const autores = new Map<string, string>();
  for (const ex of EXEMPLOS) {
    // Mesmo documento = mesmo autor (como no cadastro real).
    const doc = prepararDocumento(ex.autor.documento, ex.autor.tipo);
    let autorId = autores.get(doc.documentoHash);
    if (!autorId) {
      const autor = await prisma.autor.create({
        data: {
          tipo: ex.autor.tipo,
          ...doc,
          nome: ex.autor.nome,
          email: ex.autor.email,
          nomePublico: ex.autor.nomePublico,
          consentimentoEm: diasAtras(ex.criadoDias),
          avisoPrivacidadeVersao: "2026-10-v1",
        },
      });
      autorId = autor.id;
      autores.set(doc.documentoHash, autorId);
    }

    const ultimo = ex.passos.at(-1);
    const status = ultimo?.para ?? StatusIdeia.RECEBIDA;
    const triagemFeita = ex.passos.find((p) => p.para === "DISPONIVEL" || p.para === "ARQUIVADA");
    const publicacao = ex.passos.find((p) => p.para === "DISPONIVEL");

    const historico = [
      { statusAnterior: null, statusNovo: StatusIdeia.RECEBIDA, justificativa: "Ideia registrada pelo portal.", criadoEm: diasAtras(ex.criadoDias) },
      ...ex.passos.map((p, i) => ({
        statusAnterior: i === 0 ? StatusIdeia.RECEBIDA : ex.passos[i - 1]!.para,
        statusNovo: p.para,
        justificativa: p.justificativa,
        gabinete: p.gabinete ?? null,
        motivoId: p.motivo ? motivos.get(p.motivo)! : null,
        usuarioId: p.gabinete === GABINETE_TESTE ? gabinete.id : p.gabinete ? null : triagem.id,
        criadoEm: diasAtras(p.dias),
      })),
    ];

    await prisma.ideia.create({
      data: {
        protocolo: `BIL-${new Date().getFullYear()}-${String(ex.numero).padStart(6, "0")}`,
        tokenAcompHash: hashToken(ex.token),
        autorId,
        temaId: temas.get(ex.tema)!,
        titulo: ex.titulo,
        descricao: ex.descricao,
        bairro: ex.bairro,
        rpa: ex.rpa,
        status,
        versao: ex.passos.length,
        apoiosCount: ex.apoios,
        criadoEm: diasAtras(ex.criadoDias),
        triadoEm: triagemFeita ? diasAtras(triagemFeita.dias) : null,
        publicadoEm: publicacao ? diasAtras(publicacao.dias) : null,
        tramitacoes: { create: historico },
        interesses: ex.interesses
          ? {
              create: ex.interesses.map((it) => ({
                gabinete: it.gabinete,
                tipo: it.tipo,
                usuarioId: it.gabinete === GABINETE_TESTE ? gabinete.id : null,
                criadoEm: diasAtras(it.dias),
              })),
            }
          : undefined,
      },
    });
  }

  await prisma.contadorProtocolo.create({
    data: { ano: new Date().getFullYear(), ultimo: EXEMPLOS.length },
  });

  console.log("\nAcesso ao painel (senha de DESENVOLVIMENTO, trocar em produção):");
  console.log(`  triagem@exemplo.gov.br  | gabinete@exemplo.gov.br  | admin@exemplo.gov.br`);
  console.log(`  senha: ${SENHA_DEV}`);
  console.log("\nAcompanhar (protocolo + CPF): BIL-...-000001 + 529.982.247-25");
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
