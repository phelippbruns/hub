import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SLUGS_DE_TOPICO_RESERVADOS } from "./validation";

/**
 * O irmão de [rotas.test.ts](./rotas.test.ts), um nível abaixo.
 *
 * O tópico mora em `/c/<comunidade>/<topico>`, e ao lado dele existem rotas
 * estáticas: `/c/<comunidade>/novo` e `/c/<comunidade>/moderar`. O Next casa
 * estático antes de dinâmico, então um tópico que ganhasse um desses
 * endereços ficaria inalcançável — sem erro no build e sem teste vermelho.
 *
 * Isso **já tinha acontecido**: a lista de reservados nasceu com esta
 * rodada, e até ela a armadilha estava aberta desde a F08. Acrescentar uma
 * rota irmã sem reservar o nome agora quebra a suíte aqui.
 */

const PASTA = join("app", "(app)", "c", "[comunidade]");

/** As pastas de rota irmãs do tópico, que viram caminho de URL. */
function rotasIrmas(): string[] {
  return readdirSync(PASTA)
    .filter((entrada) => statSync(join(PASTA, entrada)).isDirectory())
    .filter(
      (entrada) =>
        // [topico] é a rota dinâmica — é ela que estamos protegendo.
        // @encaixe é rota paralela e nunca vira caminho de URL.
        !entrada.startsWith("[") &&
        !entrada.startsWith("@") &&
        !entrada.startsWith("(") &&
        !entrada.startsWith("_") &&
        !entrada.startsWith("."),
    )
    .sort();
}

const irmas = rotasIrmas();

describe("toda rota irmã do tópico é um endereço reservado", () => {
  it("encontra as rotas", () => {
    expect(irmas.length).toBeGreaterThan(0);
  });

  it.each(irmas)("/c/<comunidade>/%s está reservado", (rota) => {
    expect(SLUGS_DE_TOPICO_RESERVADOS.has(rota)).toBe(true);
  });

  it("não reserva nada além do que existe: lista inchada esconde rota apagada", () => {
    expect([...SLUGS_DE_TOPICO_RESERVADOS].sort()).toEqual(irmas);
  });
});
