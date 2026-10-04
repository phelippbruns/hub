import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// O Prisma 7 não carrega arquivos .env sozinho, e a CLI roda fora do Next.
// Mesma ordem de precedência do Next: .env.local ganha de .env.
// Os caminhos são literais do próprio repositório, não entrada de usuário.

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (existsSync(".env")) process.loadEnvFile(".env");

/**
 * Configuração do Prisma CLI (migrations e introspecção).
 *
 * Aqui vai a DIRECT_URL: a conexão direta do Supabase, porta 5432. As migrations
 * não funcionam pelo pooler. A DATABASE_URL (pooler, porta 6543) é usada só em
 * runtime, pelo adapter em lib/data/prisma.ts.
 *
 * A URL é lida direto do process.env, sem passar pelo schema de lib/env: o
 * `prisma generate` do postinstall não precisa de conexão nenhuma, e exigir o
 * ambiente completo faria `npm install` falhar num clone recém-feito. Quem
 * precisa de conexão é `migrate` e `introspect`, e aí o próprio Prisma reclama
 * se a variável estiver vazia.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DIRECT_URL ?? "" },
});
