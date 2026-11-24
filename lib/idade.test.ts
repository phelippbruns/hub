import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AVISO_DE_IDADE, MINIMUM_AGE } from "./idade";

/**
 * **A idade mínima mora num lugar só.**
 *
 * Ela estava escrita à mão em quatro lugares — a constante, duas telas de
 * cadastro e os Termos. A constante dizia **18** e o escopo dizia **16**, e
 * isso durou de 15 de outubro a 24 de novembro de 2026 sem nada reclamar.
 *
 * O que torna este número diferente de outros: ele é a **porta** do Hub.
 * Errado para cima, barra quem a RN29 deixa entrar; errado para baixo,
 * aceita quem ela queria barrar. Os dois erros funcionam perfeitamente —
 * nenhuma tela quebra, nenhum teste fica vermelho, e a conta de quem não
 * devia estar lá já existe quando alguém percebe.
 *
 * Então a varredura proíbe escrevê-lo de novo em tela nenhuma.
 */

const PASTAS = ["app", "features", "design", "lib"];

function arquivos(pasta: string): string[] {
  const achados: string[] = [];
  for (const entrada of readdirSync(pasta)) {
    if (entrada.startsWith(".") || entrada === "node_modules" || entrada === "generated") continue;
    const caminho = join(pasta, entrada);
    if (statSync(caminho).isDirectory()) {
      achados.push(...arquivos(caminho));
      continue;
    }
    if (!/\.tsx?$/.test(entrada)) continue;
    if (/\.test\.tsx?$/.test(entrada)) continue;
    achados.push(caminho);
  }
  return achados;
}

/** Quem tem o direito de dizer o número: a própria constante. */
const PERMITIDOS = new Set([join("lib", "idade.ts")]);

describe("RN29: a idade mínima num lugar só", () => {
  it("é 16, como o escopo e o PO dizem", () => {
    /*
     * Preso aqui **e** em `lib/auth/age-verifier.test.ts`, de propósito: o
     * primeiro guarda o número, o segundo guarda o que ele decide.
     */
    expect(MINIMUM_AGE).toBe(16);
  });

  it("a frase das telas sai do número", () => {
    expect(AVISO_DE_IDADE).toBe("O Hub é para maiores de 16 anos.");
    expect(AVISO_DE_IDADE).toContain(String(MINIMUM_AGE));
  });

  const todos = PASTAS.flatMap(arquivos);

  it("acha código para varrer", () => {
    // Varredura que olha o lugar errado passa vazia e não guarda nada.
    expect(todos.length).toBeGreaterThan(100);
  });

  it.each(todos.filter((arquivo) => !PERMITIDOS.has(arquivo)))(
    "%s não escreve a idade à mão",
    (arquivo) => {
      const fonte = readFileSync(arquivo, "utf8");

      /*
       * Só o que está **em texto de tela**: comentário que conta a história
       * ("o código dizia 18") é registro, e apagá-lo apagaria o motivo. A
       * regex pede "maiores de <número>", que é a frase, não o número solto.
       */
      const semComentarios = fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

      const escritas = [...semComentarios.matchAll(/maiores de\s+(\d+)/g)].map((m) => m[0]);

      expect(
        escritas,
        `a idade mínima está escrita à mão. Importe AVISO_DE_IDADE de lib/idade.ts — ` +
          `com o número em dois lugares, um deles fica velho e nada reclama.`,
      ).toEqual([]);
    },
  );
});
