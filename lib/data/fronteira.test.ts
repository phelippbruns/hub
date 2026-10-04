import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Regra de segurança 1: o Prisma ignora o Row Level Security, então só
 * lib/data/ pode falar com ele. A regra está no eslint.config.mjs — este teste
 * confere que ela **realmente pega**, em vez de confiar que está configurada.
 *
 * O ESLint roda **uma vez** para todos os casos. Rodá-lo por caso levava uns
 * 2,5 s cada e estourava o tempo limite quando a suíte inteira rodava junto.
 */

const IMPORTA_PRISMA = `import { prisma } from "@/lib/data/prisma";\nexport const x = prisma;\n`;
const IMPORTA_GERADO = `import { PrismaClient } from "@/prisma/generated/client";\nexport const x = PrismaClient;\n`;

const CASOS = {
  "features/.fronteira-feature.ts": IMPORTA_PRISMA,
  "app/.fronteira-rota.ts": IMPORTA_PRISMA,
  "features/.fronteira-gerado.ts": IMPORTA_GERADO,
  "lib/data/.fronteira-permitido.ts": IMPORTA_PRISMA,
} as const;

type Resultado = { filePath: string; messages: { ruleId: string | null }[] };

let resultados: Resultado[] = [];

function regrasDe(relativePath: string): (string | null)[] {
  const absolute = join(process.cwd(), relativePath);
  const resultado = resultados.find((r) => r.filePath === absolute);
  if (!resultado) throw new Error(`O ESLint não analisou ${relativePath}`);
  return resultado.messages.map((m) => m.ruleId);
}

beforeAll(() => {
  for (const [path, source] of Object.entries(CASOS)) {
    writeFileSync(join(process.cwd(), path), source);
  }

  try {
    const stdout = execFileSync(
      "npx",
      ["eslint", "--no-ignore", "--format", "json", ...Object.keys(CASOS)],
      { encoding: "utf8" },
    );
    resultados = JSON.parse(stdout) as Resultado[];
  } catch (error) {
    // O ESLint sai com código diferente de zero quando encontra erro, que é
    // exatamente o que esperamos aqui: o relatório vem na saída padrão.
    resultados = JSON.parse((error as { stdout: string }).stdout) as Resultado[];
  }
}, 60_000);

afterAll(() => {
  for (const path of Object.keys(CASOS)) {
    rmSync(join(process.cwd(), path), { force: true });
  }
});

describe("o Prisma não sai de lib/data/", () => {
  it.each([
    ["uma feature", "features/.fronteira-feature.ts"],
    ["uma rota", "app/.fronteira-rota.ts"],
    ["o cliente gerado, de uma feature", "features/.fronteira-gerado.ts"],
  ])("o ESLint recusa importar o Prisma de %s", (_caso, path) => {
    expect(regrasDe(path)).toContain("no-restricted-imports");
  });

  it("dentro de lib/data/ o import é permitido", () => {
    expect(regrasDe("lib/data/.fronteira-permitido.ts")).not.toContain("no-restricted-imports");
  });
});
