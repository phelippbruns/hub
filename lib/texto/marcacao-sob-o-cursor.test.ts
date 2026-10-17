import { describe, expect, it } from "vitest";
import { marcacaoSobOCursor } from "./marcacoes";

/**
 * Quando sugerir, e quando calar.
 *
 * Sugerir na hora errada é pior do que não sugerir: a lista pula na frente
 * de quem está escrevendo outra coisa. Os dois erros são invisíveis olhando
 * a tela, porque dependem de onde o cursor está.
 */

/** `|` marca onde está o cursor, para o caso ficar legível. */
function comCursor(texto: string) {
  const cursor = texto.indexOf("|");
  return marcacaoSobOCursor(texto.replace("|", ""), cursor);
}

describe("sugere enquanto a marcação está sendo escrita", () => {
  it.each([
    ["@|", "", "pessoa"],
    ["@l|", "l", "pessoa"],
    ["@lia|", "lia", "pessoa"],
    ["oi @li|", "li", "pessoa"],
    ["(@li|", "li", "pessoa"],
    ["@LI|", "li", "pessoa"],
    ["#cer|", "cer", "comunidade"],
    ["vem pra #musica-ele|", "musica-ele", "comunidade"],
    ["*prim|", "prim", "topico"],
    ["olha *forno-a|", "forno-a", "topico"],
  ])("%s → %s (%s)", (texto, termo, tipo) => {
    const achado = comCursor(texto);
    expect(achado?.termo).toBe(termo);
    expect(achado?.tipo).toBe(tipo);
  });

  it("diz onde a marcação começa e termina, para o campo substituir", () => {
    const achado = comCursor("oi @li|");
    expect(achado?.inicio).toBe(3);
    expect(achado?.fim).toBe(6);
  });

  it("com dois sinais na frase, vale o que está sendo escrito", () => {
    // O da direita é onde o cursor está; sugerir pelo primeiro ofereceria
    // uma lista que não tem nada a ver com o que a pessoa digita agora.
    expect(comCursor("@lia vem pra #cer|")?.tipo).toBe("comunidade");
  });
});

describe("cala quando não é marcação sendo escrita", () => {
  it.each([
    ["sem sinal nenhum|", "não há marcação"],
    ["@lia souza|", "já terminou o @ e seguiu a frase"],
    ["fulano@exemplo|", "email, não marcação"],
    ["@lia-|", "o hífen não faz parte do @"],
    ["#ceramica legal|", "já terminou e seguiu a frase"],
  ])("%s (%s)", (texto) => {
    expect(comCursor(texto)).toBeNull();
  });

  it("o cursor dentro da marcação ainda sugere, mesmo com texto depois", () => {
    expect(comCursor("@lia| e mais")?.termo).toBe("lia");
  });
});
