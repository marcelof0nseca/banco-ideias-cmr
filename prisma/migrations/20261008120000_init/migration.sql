-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TipoAutor" AS ENUM ('FISICA', 'JURIDICA');

-- CreateEnum
CREATE TYPE "StatusIdeia" AS ENUM ('RECEBIDA', 'EM_TRIAGEM', 'DISPONIVEL', 'EM_ANALISE', 'ADOTADA', 'ARQUIVADA');

-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('TRIAGEM', 'GABINETE', 'ADMIN');

-- CreateEnum
CREATE TYPE "TipoInteresse" AS ENUM ('ANALISE', 'ADOCAO');

-- CreateEnum
CREATE TYPE "AcaoAuditoria" AS ENUM ('LOGIN', 'LOGIN_FALHA', 'LOGOUT', 'REVELACAO_DOCUMENTO', 'EXPORTACAO', 'CONSULTA_AUDITORIA', 'USUARIO_CRIADO', 'USUARIO_ALTERADO', 'USUARIO_DESATIVADO', 'LISTA_CONTROLADA_ALTERADA', 'TEXTO_EDITADO_NA_TRIAGEM', 'TITULAR_EXPORTADO', 'TITULAR_ANONIMIZADO', 'CONSENTIMENTO_REVOGADO');

-- CreateTable
CREATE TABLE "autor" (
    "id" TEXT NOT NULL,
    "tipo" "TipoAutor" NOT NULL,
    "documentoCifrado" TEXT NOT NULL,
    "documentoHash" TEXT NOT NULL,
    "documentoMascarado" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "nomePublico" BOOLEAN NOT NULL DEFAULT false,
    "consentimentoEm" TIMESTAMP(3) NOT NULL,
    "avisoPrivacidadeVersao" TEXT NOT NULL,
    "anonimizadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "autor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ideia" (
    "id" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "tokenAcompHash" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "temaId" TEXT NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "descricao" VARCHAR(5000) NOT NULL,
    "textoOriginal" VARCHAR(5000),
    "bairro" TEXT,
    "rpa" INTEGER,
    "status" "StatusIdeia" NOT NULL DEFAULT 'RECEBIDA',
    "versao" INTEGER NOT NULL DEFAULT 0,
    "apoiosCount" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triadoEm" TIMESTAMP(3),
    "publicadoEm" TIMESTAMP(3),

    CONSTRAINT "ideia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tramitacao" (
    "id" TEXT NOT NULL,
    "ideiaId" TEXT NOT NULL,
    "statusAnterior" "StatusIdeia",
    "statusNovo" "StatusIdeia" NOT NULL,
    "justificativa" TEXT,
    "motivoId" TEXT,
    "gabinete" TEXT,
    "usuarioId" TEXT,
    "publica" BOOLEAN NOT NULL DEFAULT true,
    "ipHash" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tramitacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apoio" (
    "id" TEXT NOT NULL,
    "ideiaId" TEXT NOT NULL,
    "documentoHash" TEXT NOT NULL,
    "ipHash" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apoio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "gabinete" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoLoginEm" TIMESTAMP(3),
    "tentativasFalhas" INTEGER NOT NULL DEFAULT 0,
    "bloqueadoAte" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interesse_gabinete" (
    "id" TEXT NOT NULL,
    "ideiaId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "gabinete" TEXT NOT NULL,
    "tipo" "TipoInteresse" NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interesse_gabinete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tema" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motivo_arquivamento" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "motivo_arquivamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evento_auditoria" (
    "id" TEXT NOT NULL,
    "acao" "AcaoAuditoria" NOT NULL,
    "usuarioId" TEXT,
    "alvoTipo" TEXT,
    "alvoId" TEXT,
    "detalhe" TEXT,
    "ipHash" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evento_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contador_protocolo" (
    "ano" INTEGER NOT NULL,
    "ultimo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "contador_protocolo_pkey" PRIMARY KEY ("ano")
);

-- CreateIndex
CREATE UNIQUE INDEX "autor_documentoHash_key" ON "autor"("documentoHash");

-- CreateIndex
CREATE UNIQUE INDEX "ideia_protocolo_key" ON "ideia"("protocolo");

-- CreateIndex
CREATE INDEX "ideia_status_publicadoEm_idx" ON "ideia"("status", "publicadoEm");

-- CreateIndex
CREATE INDEX "ideia_status_criadoEm_idx" ON "ideia"("status", "criadoEm");

-- CreateIndex
CREATE INDEX "ideia_temaId_idx" ON "ideia"("temaId");

-- CreateIndex
CREATE INDEX "tramitacao_ideiaId_criadoEm_idx" ON "tramitacao"("ideiaId", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "apoio_ideiaId_documentoHash_key" ON "apoio"("ideiaId", "documentoHash");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "interesse_gabinete_ideiaId_gabinete_key" ON "interesse_gabinete"("ideiaId", "gabinete");

-- CreateIndex
CREATE UNIQUE INDEX "tema_nome_key" ON "tema"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "motivo_arquivamento_codigo_key" ON "motivo_arquivamento"("codigo");

-- CreateIndex
CREATE INDEX "evento_auditoria_acao_criadoEm_idx" ON "evento_auditoria"("acao", "criadoEm");

-- CreateIndex
CREATE INDEX "evento_auditoria_usuarioId_criadoEm_idx" ON "evento_auditoria"("usuarioId", "criadoEm");

-- AddForeignKey
ALTER TABLE "ideia" ADD CONSTRAINT "ideia_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "autor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ideia" ADD CONSTRAINT "ideia_temaId_fkey" FOREIGN KEY ("temaId") REFERENCES "tema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tramitacao" ADD CONSTRAINT "tramitacao_ideiaId_fkey" FOREIGN KEY ("ideiaId") REFERENCES "ideia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tramitacao" ADD CONSTRAINT "tramitacao_motivoId_fkey" FOREIGN KEY ("motivoId") REFERENCES "motivo_arquivamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tramitacao" ADD CONSTRAINT "tramitacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apoio" ADD CONSTRAINT "apoio_ideiaId_fkey" FOREIGN KEY ("ideiaId") REFERENCES "ideia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interesse_gabinete" ADD CONSTRAINT "interesse_gabinete_ideiaId_fkey" FOREIGN KEY ("ideiaId") REFERENCES "ideia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interesse_gabinete" ADD CONSTRAINT "interesse_gabinete_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_auditoria" ADD CONSTRAINT "evento_auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

