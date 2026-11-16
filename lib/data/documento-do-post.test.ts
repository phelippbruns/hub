import { describe, expect, it } from "vitest";
import {
  documentoEnviadoSchema,
  midiasPedidas,
  minutosDeLeitura,
  montarDocumento,
  resumoDoCorpo,
  textoPuro,
  type DocumentoEnviado,
} from "./documento-do-post";

/**
 * O corpo do post: o que o servidor aceita, e o documento que ele guarda.
 *
 * **Este arquivo é a barreira de segurança do blog.** O editor é um
 * formulário, e formulário é forjável: nada aqui depende de a tela ter
 * feito a coisa certa. Desde 15 de novembro de 2026 o editor é o Tiptap e o
 * documento chega **pronto** do navegador — o que torna estes testes mais
 * importantes, não menos.
 */

const doc = (...content: unknown[]): DocumentoEnviado =>
  ({ type: "doc", content }) as DocumentoEnviado;

const p = (texto: string) => ({ type: "paragraph", content: [{ type: "text", text: texto }] });

describe("o que o servidor aceita como corpo", () => {
  it("um parágrafo basta", () => {
    expect(documentoEnviadoSchema.safeParse(doc(p("Toquei das 2h às 5h."))).success).toBe(true);
  });

  it("corpo vazio é recusado", () => {
    expect(documentoEnviadoSchema.safeParse({ type: "doc", content: [] }).success).toBe(false);
  });

  it("post só de imagem é recusado: o corpo tem de dizer alguma coisa", () => {
    const so = documentoEnviadoSchema.safeParse(doc({ type: "image", attrs: { arquivo: 0 } }));
    expect(so.success).toBe(false);
  });

  it("aceita as cinco formatações que o desenho sabe desenhar", () => {
    const completo = doc(
      {
        type: "paragraph",
        content: [
          { type: "text", text: "forte", marks: [{ type: "bold" }] },
          { type: "text", text: "torto", marks: [{ type: "italic" }] },
          {
            type: "text",
            text: "ligado",
            marks: [{ type: "link", attrs: { href: "https://exemplo.test" } }],
          },
        ],
      },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Subtítulo" }] },
      { type: "blockquote", content: [p("citado")] },
      { type: "bulletList", content: [{ type: "listItem", content: [p("item")] }] },
      { type: "orderedList", content: [{ type: "listItem", content: [p("um")] }] },
    );

    expect(documentoEnviadoSchema.safeParse(completo).success).toBe(true);
  });
});

/**
 * A lista é **fechada nos dois sentidos**: o que o desenho não sabe
 * desenhar não entra, porque entrar significaria o texto sumir depois de
 * publicado — sem erro em lugar nenhum.
 */
describe("a lista fechada de nós e marcas", () => {
  it("nó que o desenho não conhece é recusado", () => {
    const comCodigo = doc(p("antes"), {
      type: "codeBlock",
      content: [{ type: "text", text: "x" }],
    });
    expect(documentoEnviadoSchema.safeParse(comCodigo).success).toBe(false);
  });

  it("marca que o desenho não conhece é recusada", () => {
    const tachado = doc({
      type: "paragraph",
      content: [{ type: "text", text: "riscado", marks: [{ type: "strike" }] }],
    });
    expect(documentoEnviadoSchema.safeParse(tachado).success).toBe(false);
  });

  it("subtítulo fora do nível 2 é recusado: o desenho só faz h2", () => {
    const nivelTres = doc(p("antes"), {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "fundo demais" }],
    });
    expect(documentoEnviadoSchema.safeParse(nivelTres).success).toBe(false);
  });
});

describe("o link, que é a exceção da RN41 à RN16", () => {
  it("aceita http e https", () => {
    for (const href of ["https://exemplo.test/a", "http://exemplo.test"]) {
      const comLink = doc({
        type: "paragraph",
        content: [{ type: "text", text: "veja", marks: [{ type: "link", attrs: { href } }] }],
      });
      expect(documentoEnviadoSchema.safeParse(comLink).success, href).toBe(true);
    }
  });

  /**
   * **Recusado no servidor, não só no desenho.**
   *
   * O desenho já confere `^https?://` antes de montar o `<a>`, mas a
   * conferência no desenho protege só quem desenha com aquele componente.
   * Um `javascript:` guardado no banco é uma bomba esperando a próxima
   * tela que leia o mesmo documento de outro jeito.
   */
  it("recusa javascript:, data: e endereço relativo", () => {
    for (const href of [
      "javascript:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "/perfil",
      "//exemplo.test",
      "ftp://exemplo.test",
    ]) {
      const comLink = doc({
        type: "paragraph",
        content: [{ type: "text", text: "veja", marks: [{ type: "link", attrs: { href } }] }],
      });
      expect(documentoEnviadoSchema.safeParse(comLink).success, href).toBe(false);
    }
  });
});

describe("o documento guardado", () => {
  /**
   * **A barreira mais importante do blog.**
   *
   * O navegador manda o **índice** do arquivo, nunca um endereço. Se um
   * dia o `src` passasse a vir do formulário, um nó de imagem apontando
   * para um servidor qualquer seria buscado pelo navegador de **todo
   * mundo que lesse o post** — um rastreador de IP dentro do Hub.
   *
   * Com o Tiptap o documento chega pronto, então esta barreira passou a
   * valer por duas: o schema **descarta** o `src` que vier, e
   * `montarDocumento` nunca o lê.
   */
  it("o src de cada imagem vem de quem guardou, não do formulário", () => {
    const forjado = {
      type: "doc",
      content: [
        p("antes"),
        {
          type: "image",
          attrs: { arquivo: 0, src: "https://rastreador.test/pixel.gif" },
        },
        p("depois"),
      ],
    };

    // Primeiro: o schema não deixa o `src` sequer entrar na estrutura.
    const lido = documentoEnviadoSchema.parse(forjado);
    const imagemLida = lido.content.find((no) => no.type === "image");
    expect(imagemLida && "src" in imagemLida.attrs).toBe(false);

    // Depois: o documento guardado leva o caminho do depósito.
    const documento = montarDocumento(lido, [
      { src: "posts/abc.webp", largura: 800, altura: 600 },
    ]) as { content: { type: string; attrs?: { src?: string } }[] };

    const imagem = documento.content.find((no) => no.type === "image");
    expect(imagem?.attrs?.src).toBe("posts/abc.webp");
  });

  it("um src forjado dentro de uma lista também não passa", () => {
    /*
     * A forja no primeiro nível é a óbvia. Com listas e citações o
     * documento tem profundidade, e um validador que só olhasse a
     * superfície deixaria passar exatamente a mesma coisa um nível abaixo.
     */
    const fundo = {
      type: "doc",
      content: [
        p("antes"),
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                p("item"),
                { type: "image", attrs: { arquivo: 0, src: "https://rastreador.test/pixel.gif" } },
              ],
            },
          ],
        },
      ],
    };

    const lido = documentoEnviadoSchema.parse(fundo);
    type No = { type: string; attrs?: { src?: string }; content?: No[] };
    const documento = montarDocumento(lido, [{ src: "posts/xyz.webp" }]) as { content: No[] };

    const imagem = documento.content[1]?.content?.[0]?.content?.[1];
    expect(imagem?.attrs?.src).toBe("posts/xyz.webp");
    expect(JSON.stringify(documento)).not.toContain("rastreador.test");
  });

  it("GIF de fora do GIPHY é recusado", () => {
    for (const gif of [
      "https://giphy.com.exemplo.test/a.gif",
      "http://media.giphy.com/a.gif",
      "https://exemplo.test/a.gif",
    ]) {
      const comGif = doc(p("antes"), {
        type: "image",
        attrs: { gif, largura: 10, altura: 10 },
      });
      expect(documentoEnviadoSchema.safeParse(comGif).success, gif).toBe(false);
    }
  });

  it("imagens e GIFs saem na ordem em que foram escritos", () => {
    const lido = documentoEnviadoSchema.parse(
      doc(p("um"), { type: "image", attrs: { arquivo: 0 } }, p("dois"), {
        type: "image",
        attrs: { gif: "https://media.giphy.com/a.gif", largura: 1, altura: 1 },
      }),
    );

    expect(midiasPedidas(lido)).toEqual([
      { arquivo: 0 },
      { gif: "https://media.giphy.com/a.gif", largura: 1, altura: 1 },
    ]);
  });

  it("imagem sem mídia correspondente é descartada, não vira imagem quebrada", () => {
    const lido = documentoEnviadoSchema.parse(
      doc(p("antes"), { type: "image", attrs: { arquivo: 0 } }),
    );
    const documento = montarDocumento(lido, []) as { content: { type: string }[] };

    expect(documento.content.map((no) => no.type)).toEqual(["paragraph"]);
  });

  it("o formato guardado é exatamente o que o desenho lê", () => {
    const lido = documentoEnviadoSchema.parse(doc(p("Oi.")));
    expect(montarDocumento(lido, [])).toEqual({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Oi." }] }],
    });
  });
});

describe("o texto puro, o resumo e o tempo de leitura", () => {
  it("o texto puro anda a árvore inteira, não só o primeiro nível", () => {
    const lido = documentoEnviadoSchema.parse(
      doc(
        p("fora"),
        { type: "blockquote", content: [p("dentro")] },
        { type: "bulletList", content: [{ type: "listItem", content: [p("mais fundo")] }] },
      ),
    );

    expect(textoPuro(lido)).toBe("fora dentro mais fundo");
  });

  it("a mídia não entra no texto puro", () => {
    const lido = documentoEnviadoSchema.parse(
      doc(p("antes"), { type: "image", attrs: { arquivo: 0 } }, p("depois")),
    );
    expect(textoPuro(lido)).toBe("antes depois");
  });

  it("o resumo corta numa palavra inteira", () => {
    const resumo = resumoDoCorpo("palavra ".repeat(40), 50);
    expect(resumo.endsWith("…")).toBe(true);
    expect(resumo.length).toBeLessThanOrEqual(50);
    expect(resumo).not.toMatch(/pal…$/);
  });

  it("o tempo de leitura nunca é zero", () => {
    expect(minutosDeLeitura("duas palavras")).toBe(1);
    expect(minutosDeLeitura("palavra ".repeat(400))).toBe(2);
  });
});
