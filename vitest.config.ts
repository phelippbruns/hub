import { defineConfig } from "vitest/config";

// Vitest cobre as regras de negócio. As jornadas ficam no Playwright (e2e/).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["{lib,features,design,app}/**/*.test.{ts,tsx}"],
    // Os testes de banco precisam do Supabase local e rodam em `npm run test:db`.
    exclude: ["**/node_modules/**", "**/*.db.test.ts"],
  },
});
