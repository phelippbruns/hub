import { describe, expect, it } from "vitest";
import { db } from "./data/testing/db";
import { FUSO_DO_CICLO } from "./tempo";

/**
 * O fuso do ciclo está escrito em dois lugares, e eles não podem divergir.
 *
 * O banco precisa dele dentro de funções `IMMUTABLE` (`hub_cycle_timezone()`);
 * a central de notificações precisa dele sem ir ao banco a cada
 * renderização. Duplicar é a decisão; **este teste é o preço dela**.
 *
 * Se divergirem, a semana da central vira numa hora e o Hot Topic noutra —
 * e nada quebra, nada avisa. É o tipo de defeito que só aparece em março,
 * quando alguém pergunta por que a lista zerou cedo.
 */
describe("o fuso do ciclo", () => {
  it("é o mesmo no banco e no código", async () => {
    const [linha] = await db.$queryRaw<{ fuso: string }[]>`SELECT hub_cycle_timezone() AS fuso`;
    expect(linha?.fuso).toBe(FUSO_DO_CICLO);
  });
});
