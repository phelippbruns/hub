/**
 * Regra de segurança 1: o Prisma conecta com permissão ampla e ignora o Row
 * Level Security. Por isso este cliente só pode ser usado dentro de lib/data/,
 * onde cada função confere quem está pedindo e se pode. Nenhum componente,
 * Server Action ou rota importa daqui direto — o ESLint bloqueia (eslint.config.mjs).
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/prisma/generated/client";
import { serverEnv } from "@/lib/env";

// DATABASE_URL é o pooler do Supabase (porta 6543), usado só em runtime.
// A conexão direta (DIRECT_URL) fica em prisma.config.ts, para as migrations.
function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: serverEnv().DATABASE_URL }),
  });
}

// Cache no globalThis: sem isso o hot reload do dev abre uma conexão por recarga.
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrismaClient> };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
