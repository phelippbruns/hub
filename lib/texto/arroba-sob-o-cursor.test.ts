import { describe, expect, it } from "vitest";
import { arrobaSobOCursor } from "./mencoes";

/**
 * Quando sugerir, e quando calar (F15).
 *
 * Sugerir na hora errada é pior do que não sugerir: a lista pula na frente
 * de quem está escrevendo outra coisa. Os dois erros são invisíveis olhando
 * a tela, porque dependem de onde o cursor está.
 */

/** `|` marca onde está o cursor, para o caso ficar legível. */
function comCursor(texto: string) {
  const cursor = texto.indexOf("|");
  return arrobaSobOCursor(texto.replace("|", ""), cursor);
}

describe("sugere enquanto o @ está sendo escrito", () => {
  it.each([
    ["@|", ""],
    ["@l|", "l"],
    ["@lia|", "lia"],
    ["oi @li|", "li"],
    ["(@li|", "li"],
    ["@LI|", "li"],
  ])("%s → termo %s", (texto, esperado) => {
    expect(comCursor(texto)?.termo).toBe(esperado);
  });

  it("diz onde o @ começa e termina, para o campo substituir", () => {
    const achado = comCursor("oi @li|");
    expect(achado?.inicio).toBe(3);
    expect(achado?.fim).toBe(6);
  });
});

describe("cala quando não é marcação sendo escrita", () => {
  it.each([
    ["sem arroba nenhuma|", "não há @"],
    ["@lia souza|", "já terminou o @ e seguiu a frase"],
    ["fulano@exemplo|", "email, não marcação"],
    ["@lia-|", "o hífen não faz parte do @"],
    ["@lia| e mais", "o cursor saiu do @"],
  ])("%s (%s)", (texto) => {
    const achado = comCursor(texto);
    // "@lia| e mais" é o único que ainda está no @: separado abaixo.
    if (texto === "@lia| e mais") {
      expect(achado?.termo).toBe("lia");
      return;
    }
    expect(achado).toBeNull();
  });
});
