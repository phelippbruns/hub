import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

/**
 * Regra de segurança 1: o Prisma ignora o Row Level Security, então só
 * lib/data/ pode falar com ele. A regra está no eslint.config.mjs — este teste
 * confere que ela **realmente pega**, em vez de confiar que está configurada.
 */

const scratch = mkdtempSync(join(tmpdir(), "hub-fronteira-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

function lint(relativePath: string, source: string): string {
  const file = join(process.cwd(), relativePath);
  writeFileSync(file, source);
  try {
    execFileSync("npx", ["eslint", "--no-ignore", "--format", "json", file], {
      encoding: "utf8",
    });
    return "";
  } catch (error) {
    const output = (error as { stdout?: string }).stdout ?? "";
    return output;
  } finally {
    rmSync(file, { force: true });
  }
}

const IMPORT_PRISMA = `import { prisma } from "@/lib/data/prisma";\nexport const x = prisma;\n`;

describe("o Prisma não sai de lib/data/", () => {
  it("o ESLint recusa importar o Prisma de uma feature", () => {
    const output = lint("features/.fronteira-teste.ts", IMPORT_PRISMA);
    expect(output).toContain("no-restricted-imports");
    expect(output).toContain("lib/data/");
  });

  it("o ESLint recusa importar o Prisma de uma rota", () => {
    const output = lint("app/.fronteira-teste.ts", IMPORT_PRISMA);
    expect(output).toContain("no-restricted-imports");
  });

  it("o ESLint recusa importar o cliente gerado direto", () => {
    const output = lint(
      "features/.fronteira-gerado.ts",
      `import { PrismaClient } from "@/prisma/generated/client";\nexport const x = PrismaClient;\n`,
    );
    expect(output).toContain("no-restricted-imports");
  });

  it("dentro de lib/data/ o import é permitido", () => {
    const output = lint("lib/data/.fronteira-teste.ts", IMPORT_PRISMA);
    expect(output).not.toContain("no-restricted-imports");
  });
});
