import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HANDLES_RESERVADOS, handleSchema } from "./validation";

/**
 * O perfil de uma pessoa mora na raiz: `hub.app/lia`.
 *
 * O Next casa rota estática antes de dinâmica, então `/inicio` continua
 * sendo o Início mesmo que alguém se chame `@inicio` — mas essa pessoa
 * ficaria **inalcançável para sempre**, sem nenhum aviso e sem jeito de
 * descobrir o porquê.
 *
 * Este teste amarra as duas coisas: criar uma rota de primeiro nível sem
 * reservar o nome quebra a suíte aqui, em vez de quebrar um perfil meses
 * depois.
 */

const APP = "app";

/** Segmentos de primeiro nível que viram caminho de URL. */
function rotasDePrimeiroNivel(): string[] {
  const nomes = new Set<string>();

  function varrer(dir: string) {
    for (const entrada of readdirSync(dir)) {
      const caminho = join(dir, entrada);
      if (!statSync(caminho).isDirectory()) continue;

      // (grupo) não aparece na URL: o que está dentro é de primeiro nível.
      if (entrada.startsWith("(") && entrada.endsWith(")")) {
        varrer(caminho);
        continue;
      }
      /*
       * @encaixe é rota paralela: preenche um espaço do layout e **nunca**
       * vira caminho de URL. O que está dentro dele é uma segunda cópia das
       * rotas que já foram contadas pelo caminho normal, então nem entra na
       * lista nem é varrido.
       */
      if (entrada.startsWith("@")) continue;
      // [param] casa qualquer coisa — é justamente a rota do perfil.
      if (entrada.startsWith("[") || entrada.startsWith("_") || entrada.startsWith(".")) continue;

      nomes.add(entrada);
    }
  }

  varrer(APP);
  return [...nomes].sort();
}

const rotas = rotasDePrimeiroNivel();

describe("toda rota de primeiro nível é um @ reservado", () => {
  it("encontra as rotas", () => {
    expect(rotas.length).toBeGreaterThan(10);
  });

  it.each(rotas)("/%s está reservado", (rota) => {
    expect(HANDLES_RESERVADOS.has(rota)).toBe(true);
  });
});

describe("o cadastro recusa um @ reservado", () => {
  it.each(["inicio", "perfil", "cabines", "admin", "api"])("recusa @%s", (handle) => {
    const resultado = handleSchema.safeParse(handle);
    expect(resultado.success).toBe(false);
  });

  it("aceita um @ comum", () => {
    expect(handleSchema.safeParse("phebruns").success).toBe(true);
  });

  it("recusa mesmo com maiúsculas, porque o @ é guardado em minúsculas", () => {
    expect(handleSchema.safeParse("Inicio").success).toBe(false);
  });
});
