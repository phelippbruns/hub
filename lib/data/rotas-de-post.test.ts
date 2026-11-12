import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SLUGS_DE_POST_RESERVADOS } from "./validation";

/**
 * **Endereço de post não pode colidir com rota irmã de `/<handle>/`.**
 *
 * A mesma armadilha do tópico, um nível ao lado. O post mora em
 * `/<handle>/<post>`, que é `app/(app)/[handle]/[post]`. Se um dia nascer
 * uma pasta estática ali — `app/(app)/[handle]/sobre`, por exemplo —, o
 * Next casa estático antes de dinâmico e **o post chamado "Sobre" fica
 * inalcançável para sempre**. Sem erro no build, sem teste vermelho, sem
 * nada.
 *
 * Hoje a lista está vazia porque `[post]` é a única irmã. Este teste
 * existe para o dia em que não for — e ele reprova na hora, em vez de
 * alguém descobrir meses depois que um post não abre.
 *
 * É irmão de `rotas-de-topico.test.ts`, e a diferença importa: lá a lista
 * tem dois nomes e **tem de ser exata**; aqui ela está vazia, e o teste
 * guarda justamente o vazio.
 */

const PASTA = join("app", "(app)", "[handle]");

/** As pastas de rota irmãs de `[post]`, fora as dinâmicas e os grupos. */
function irmasEstaticas(): string[] {
  return readdirSync(PASTA)
    .filter((entrada) => statSync(join(PASTA, entrada)).isDirectory())
    .filter(
      (entrada) => !entrada.startsWith("[") && !entrada.startsWith("(") && !entrada.startsWith("_"),
    )
    .sort();
}

describe("endereço de post não colide com rota", () => {
  it("acha a pasta certa para varrer", () => {
    // Se a varredura olhar o lugar errado, ela passa vazia e não guarda nada.
    const tudo = readdirSync(PASTA);
    expect(tudo, `${PASTA} deveria ter a rota do post`).toContain("[post]");
  });

  it("toda rota irmã de [post] está na lista de reservados", () => {
    expect(
      irmasEstaticas(),
      "rota nova aqui torna inalcançável o post com esse endereço: acrescente o nome a SLUGS_DE_POST_RESERVADOS e à função hub_slugs_de_post_reservados() do banco",
    ).toEqual([...SLUGS_DE_POST_RESERVADOS].sort());
  });
});
