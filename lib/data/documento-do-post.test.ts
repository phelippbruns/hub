import { describe, expect, it } from "vitest";
import {
  corpoEnviadoSchema,
  minutosDeLeitura,
  montarDocumento,
  resumoDoCorpo,
  textoPuro,
  type BlocoEnviado,
} from "./documento-do-post";

/**
 * O corpo do post: o que o servidor aceita, e o documento que ele monta.
 *
 * **Este arquivo é a barreira de segurança do blog.** O editor é um
 * formulário, e formulário é forjável: nada aqui depende de a tela ter
 * feito a coisa certa.
 */

const p = (texto: string): BlocoEnviado => ({ tipo: "paragrafo", texto });

describe("o que o servidor aceita como corpo", () => {
  it("um parágrafo basta", () => {
    expect(corpoEnviadoSchema.safeParse([p("Toquei das 2h às 5h.")]).success).toBe(true);
  });

  it("corpo vazio é recusado", () => {
    expect(corpoEnviadoSchema.safeParse([]).success).toBe(false);
  });

  /**
   * Post só de imagem não é post. O título diz do que se trata; o corpo
   * tem de dizer alguma coisa, senão a lista mostra um resumo vazio e
   * quem lê não sabe se vale abrir.
   */
  it("só imagem, sem nenhum parágrafo, é recusado", () => {
    const so = corpoEnviadoSchema.safeParse([{ tipo: "imagem", arquivo: 0 }]);

    expect(so.success).toBe(false);
    expect(so.error?.issues[0]?.message).toMatch(/ao menos um parágrafo/);
  });

  it("o limite de 5.000 conta os blocos de texto juntos", () => {
    const tresMil = p("a".repeat(3000));

    expect(corpoEnviadoSchema.safeParse([tresMil]).success).toBe(true);
    expect(corpoEnviadoSchema.safeParse([tresMil, tresMil]).success).toBe(false);
  });

  it("subtítulo é uma linha, não um parágrafo", () => {
    expect(
      corpoEnviadoSchema.safeParse([p("texto"), { tipo: "subtitulo", texto: "a".repeat(121) }])
        .success,
    ).toBe(false);
  });

  it("tipo de bloco inventado é recusado", () => {
    expect(corpoEnviadoSchema.safeParse([p("texto"), { tipo: "video", url: "x" }]).success).toBe(
      false,
    );
  });
});

describe("o GIF só pode vir do GIPHY", () => {
  const comGif = (url: string) => [
    p("olha"),
    { tipo: "gif" as const, url, largura: 480, altura: 270 },
  ];

  it("endereço do GIPHY passa", () => {
    expect(
      corpoEnviadoSchema.safeParse(comGif("https://media.giphy.com/media/a/x.gif")).success,
    ).toBe(true);
  });

  it.each([
    ["outro domínio", "https://exemplo.test/x.gif"],
    ["domínio parecido", "https://giphy.com.exemplo.test/x.gif"],
    ["sem https", "http://media.giphy.com/x.gif"],
  ])("%s é recusado", (_nome, url) => {
    expect(corpoEnviadoSchema.safeParse(comGif(url)).success).toBe(false);
  });
});

describe("o documento é montado pelo servidor", () => {
  /**
   * **A barreira mais importante do blog.**
   *
   * O navegador manda o **índice** do arquivo, nunca um endereço. Se um
   * dia o `src` passasse a vir do formulário, um nó de imagem apontando
   * para um servidor qualquer seria buscado pelo navegador de **todo
   * mundo que lesse o post** — um rastreador de IP dentro do Hub.
   */
  it("o src de cada imagem vem de quem guardou, não do formulário", () => {
    // O formulário tenta mandar um endereço. Ele não pode chegar ao documento.
    const blocos = [
      p("antes"),
      { tipo: "imagem", arquivo: 0, src: "https://rastreador.test/pixel.gif" },
      p("depois"),
    ] as BlocoEnviado[];
    const midias = [{ src: "posts/abc.webp", largura: 800, altura: 600 }];

    const documento = montarDocumento(blocos, midias) as {
      content: { type: string; attrs?: { src?: string } }[];
    };

    const imagem = documento.content.find((no) => no.type === "image");
    expect(imagem?.attrs?.src).toBe("posts/abc.webp");
  });

  it("imagens e GIFs saem na ordem em que foram escritos", () => {
    const blocos: BlocoEnviado[] = [
      p("um"),
      { tipo: "imagem", arquivo: 0 },
      p("dois"),
      { tipo: "gif", url: "https://media.giphy.com/a.gif", largura: 1, altura: 1 },
    ];
    const midias = [{ src: "posts/foto.webp" }, { src: "https://media.giphy.com/a.gif" }];

    const documento = montarDocumento(blocos, midias) as {
      content: { type: string; attrs?: { src?: string } }[];
    };

    expect(documento.content.map((no) => no.type)).toEqual([
      "paragraph",
      "image",
      "paragraph",
      "image",
    ]);
    expect(
      documento.content.filter((no) => no.type === "image").map((no) => no.attrs?.src),
    ).toEqual(["posts/foto.webp", "https://media.giphy.com/a.gif"]);
  });

  it("o subtítulo é sempre nível 2", () => {
    const documento = montarDocumento([{ tipo: "subtitulo", texto: "Ora" }, p("x")], []) as {
      content: { type: string; attrs?: { level?: number } }[];
    };

    // Um `h1` solto no corpo brigaria com o título do post, e níveis
    // pulados quebram a ordem de leitura de quem usa leitor de tela.
    expect(documento.content[0]?.attrs?.level).toBe(2);
  });

  it("imagem sem mídia correspondente é descartada, e não vira nó quebrado", () => {
    const documento = montarDocumento([p("texto"), { tipo: "imagem", arquivo: 0 }], []) as {
      content: unknown[];
    };

    expect(documento.content).toHaveLength(1);
  });

  /**
   * O formato é o do Tiptap de propósito: o editor de blocos é o MVP, e
   * trocar por um editor de texto rico depois **não pode migrar dado**.
   */
  it("o formato é o que o editor completo produziria", () => {
    const documento = montarDocumento([p("oi")], []);

    expect(documento).toEqual({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "oi" }] }],
    });
  });
});

describe("o resumo e o tempo de leitura saem do servidor", () => {
  it("o texto puro junta parágrafos e subtítulos, e ignora mídia", () => {
    const texto = textoPuro([
      p("Primeiro."),
      { tipo: "imagem", arquivo: 0 },
      { tipo: "subtitulo", texto: "Meio" },
      p("Último."),
    ]);

    expect(texto).toBe("Primeiro. Meio Último.");
  });

  it("o resumo corta numa palavra inteira, não no meio dela", () => {
    const resumo = resumoDoCorpo(`${"palavra ".repeat(40)}fim`, 50);

    expect(resumo.length).toBeLessThanOrEqual(50);
    expect(resumo).toMatch(/…$/);
    expect(resumo).not.toMatch(/pal…$/);
  });

  it("texto curto fica inteiro, sem reticências", () => {
    expect(resumoDoCorpo("Curto.", 200)).toBe("Curto.");
  });

  it("o tempo de leitura nunca é zero", () => {
    // "0 min de leitura" não é informação nenhuma.
    expect(minutosDeLeitura("duas palavras")).toBe(1);
    expect(minutosDeLeitura("")).toBe(1);
  });

  it("200 palavras por minuto", () => {
    expect(minutosDeLeitura("palavra ".repeat(600))).toBe(3);
  });
});
