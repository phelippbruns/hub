import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import security from "eslint-plugin-security";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  security.configs.recommended,

  {
    name: "hub/regras-de-seguranca",
    rules: {
      // Regra de segurança 1: o Prisma ignora o RLS, então só lib/data/ pode
      // falar com ele. A exceção para a própria pasta vem no bloco seguinte.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/prisma/generated/client",
              message:
                "Regra de segurança 1: só lib/data/ fala com o Prisma. Importe uma função de lib/data/ que confira a permissão.",
            },
          ],
          patterns: [
            {
              group: [
                "**/lib/data/prisma",
                "@/lib/data/prisma",
                "**/prisma/generated/**",
                "@/prisma/generated/**",
              ],
              message:
                "Regra de segurança 1: só lib/data/ fala com o Prisma. Importe uma função de lib/data/ que confira a permissão.",
            },
          ],
        },
      ],
      // Regra de segurança 8: nada de HTML vindo do usuário.
      "react/no-danger": "error",
    },
  },

  {
    name: "hub/camada-de-dados",
    files: ["lib/data/**"],
    rules: { "no-restricted-imports": "off" },
  },

  {
    name: "hub/testes",
    files: ["**/*.test.ts", "**/*.test.tsx", "e2e/**"],
    rules: {
      // Caminhos de teste são literais do próprio repositório, não entrada de usuário.
      "security/detect-non-literal-fs-filename": "off",
      "security/detect-object-injection": "off",
    },
  },

  prettier,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    "docs/**",
    "prisma/generated/**",
  ]),
]);

export default eslintConfig;
