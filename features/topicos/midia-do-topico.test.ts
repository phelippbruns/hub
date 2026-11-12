import { describe, expect, it } from "vitest";
import { createTopicSchema } from "@/lib/data/validation";

/**
 * A mídia do tópico, conferida **no servidor**.
 *
 * O formulário tem os botões desde 12 de novembro de 2026, e eles são
 * conveniência: um formulário é forjável, e quem decide o que entra é esta
 * validação. São as mesmas conferências da contribuição, porque imagem de
 * tópico e imagem de resposta correm o mesmo risco.
 */

const valido = (media: unknown) =>
  createTopicSchema.safeParse({
    communityId: "0b5e1d9c-3a4f-4a2b-9c7d-1e2f3a4b5c6d",
    name: "Um tópico",
    description: "Uma pergunta de abertura.",
    media,
  });

describe("o tópico aceita imagem e GIF", () => {
  it("sem mídia continua valendo", () => {
    expect(valido(null).success).toBe(true);
  });

  it("imagem com caminho do depósito e medidas passa", () => {
    const resultado = valido({
      caminho: "topicos/abc.webp",
      kind: "image",
      largura: 1600,
      altura: 900,
    });

    expect(resultado.success).toBe(true);
  });

  it("GIF passa com o quadro parado e as medidas", () => {
    const resultado = valido({
      caminho: "https://media.giphy.com/media/x/giphy.gif",
      kind: "gif",
      largura: 480,
      altura: 270,
      parado: "https://media.giphy.com/media/x/giphy_s.gif",
    });

    expect(resultado.success).toBe(true);
  });

  it("tipo de mídia inventado é recusado", () => {
    expect(valido({ caminho: "topicos/a.webp", kind: "video" }).success).toBe(false);
  });

  it("mídia sem caminho é recusada", () => {
    expect(valido({ kind: "image" }).success).toBe(false);
  });
});

/**
 * A conferência de domínio não mora no schema — ela está na Server Action,
 * porque depende de saber que o `caminho` veio do campo de GIF e não do
 * depósito. Este teste guarda a **forma** dela, que é o que o resto do Hub
 * já usa: `features/respostas/actions.ts` e
 * `lib/data/documento-do-post.ts`.
 */
describe("o que conta como GIF do GIPHY", () => {
  const DO_GIPHY = /^https:\/\/[a-z0-9.-]*giphy\.com\//i;

  it.each([
    "https://media.giphy.com/media/x/giphy.gif",
    "https://i.giphy.com/x.gif",
    "https://GIPHY.com/x.gif",
  ])("%s é aceito", (url) => {
    expect(DO_GIPHY.test(url)).toBe(true);
  });

  it.each([
    ["outro domínio", "https://exemplo.test/x.gif"],
    ["domínio que termina parecido", "https://giphy.com.exemplo.test/x.gif"],
    ["sem https", "http://media.giphy.com/x.gif"],
    ["caminho relativo", "/media.giphy.com/x.gif"],
  ])("%s é recusado", (_nome, url) => {
    expect(DO_GIPHY.test(url)).toBe(false);
  });
});
