import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/prisma/gen/client";

/**
 * Instancia unica do Prisma Client (dono: Pessoa B).
 *
 * Prisma 7 usa driver adapters: a conexao com o Postgres passa pelo PrismaPg,
 * que le DATABASE_URL. Em desenvolvimento, o cache em globalThis evita abrir
 * uma nova pool a cada hot-reload do Next (que esgotaria os slots do Postgres).
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function criar(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? criar();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
