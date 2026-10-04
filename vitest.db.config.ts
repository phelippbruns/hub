import { defineConfig } from "vitest/config";

/**
 * Testes que precisam de um Postgres de verdade.
 *
 * Índice único, gatilho e RLS não existem em dublê — então estes testes rodam
 * contra o Supabase local (`npx supabase start`). Ficam separados dos de
 * unidade para quem não está mexendo no banco não precisar do Docker.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["lib/**/*.db.test.ts"],
    // Cada arquivo limpa o banco no beforeEach: rodar em paralelo faria um
    // teste apagar os dados do outro.
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 30_000,
    env: { NODE_ENV: "test" },
  },
});
