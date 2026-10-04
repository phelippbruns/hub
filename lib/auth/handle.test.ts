import { describe, expect, it } from "vitest";
import { HANDLE_PATTERN, generateUniqueHandle, suggestHandle, withSuffix } from "./handle";

describe("RN17: sugestão do @", () => {
  it.each([
    ["Ana Lima", "analima"],
    ["José D'Ávila", "josedavila"],
    ["Lia Souza", "liasouza"],
    ["Jo", "jo"],
    ["MAIÚSCULAS", "maiusculas"],
    ["com  espaços   demais", "comespacosdemais"],
  ])("%s vira %s", (name, expected) => {
    expect(suggestHandle(name)).toBe(expected);
  });

  it("nunca passa de 20 caracteres", () => {
    expect(suggestHandle("Maria Fernanda Albuquerque dos Santos")).toHaveLength(20);
  });

  it.each(["Ana Lima", "Jo", "Maria Fernanda Albuquerque dos Santos", "🙂🙂"])(
    "sempre produz um @ que o banco aceita (%s)",
    (name) => {
      expect(suggestHandle(name)).toMatch(HANDLE_PATTERN);
    },
  );
});

describe("sufixo", () => {
  it("encurta a base em vez de estourar o limite", () => {
    const base = "a".repeat(20);
    expect(withSuffix(base, 12)).toHaveLength(20);
    expect(withSuffix(base, 12).endsWith("12")).toBe(true);
  });
});

describe("RN17: o @ é único", () => {
  it("devolve a sugestão quando está livre", async () => {
    const handle = await generateUniqueHandle("Ana Lima", async () => false);
    expect(handle).toBe("analima");
  });

  it("acrescenta sufixo quando já existe", async () => {
    const tomados = new Set(["analima"]);
    const handle = await generateUniqueHandle("Ana Lima", async (h) => tomados.has(h));
    expect(handle).toBe("analima2");
  });

  it("segue tentando enquanto houver colisão", async () => {
    const tomados = new Set(["analima", "analima2", "analima3"]);
    const handle = await generateUniqueHandle("Ana Lima", async (h) => tomados.has(h));
    expect(handle).toBe("analima4");
  });

  it("nomes iguais geram @ diferentes", async () => {
    const tomados = new Set<string>();
    const isTaken = async (h: string) => tomados.has(h);

    const primeiro = await generateUniqueHandle("Ana Lima", isTaken);
    tomados.add(primeiro);
    const segundo = await generateUniqueHandle("Ana Lima", isTaken);
    tomados.add(segundo);
    const terceiro = await generateUniqueHandle("Ana Lima", isTaken);

    expect(new Set([primeiro, segundo, terceiro]).size).toBe(3);
  });

  it("não desiste nem estoura o limite com muitas colisões", async () => {
    const handle = await generateUniqueHandle("Ana Lima", async () => true, 5);
    expect(handle).toMatch(HANDLE_PATTERN);
  });
});

describe("RN17: formato do @ escolhido à mão", () => {
  it.each(["phebruns", "ana", "jo", "a_b_c", "pessoa123", "a".repeat(20)])(
    "aceita %s",
    (handle) => {
      expect(HANDLE_PATTERN.test(handle)).toBe(true);
    },
  );

  it.each([
    ["curto demais", "a"],
    ["longo demais", "a".repeat(21)],
    ["com maiúscula", "PheBruns"],
    ["com espaço", "phe bruns"],
    ["com ponto", "phe.bruns"],
    ["com arroba", "@phebruns"],
    ["com acento", "joão"],
    ["vazio", ""],
  ])("recusa %s", (_caso, handle) => {
    expect(HANDLE_PATTERN.test(handle)).toBe(false);
  });
});
