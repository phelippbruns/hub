import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A busca de GIFs, sem falar com o GIPHY de verdade.
 *
 * O que estes testes protegem não é o formato da resposta — é que a
 * classificação restrita **sempre** vá junto, e que a chave não escape.
 */

const ORIGINAL = process.env.GIPHY_API_KEY;

async function carregar() {
  vi.resetModules();
  return import("./giphy");
}

/** Guarda cada endereço pedido, e responde o que o teste mandar. */
function fingirGiphy(corpo: unknown, status = 200) {
  const pedidos: URL[] = [];

  vi.stubGlobal("fetch", async (entrada: URL | string) => {
    pedidos.push(new URL(String(entrada)));
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => corpo,
    } as Response;
  });

  return pedidos;
}

const UM_GIF = {
  data: [
    {
      id: "abc",
      alt_text: "pessoa dançando",
      images: {
        downsized: { url: "https://media.giphy.com/abc.gif", width: "200", height: "150" },
        fixed_width_small: { url: "https://media.giphy.com/abc-small.gif" },
      },
    },
  ],
};

beforeEach(() => {
  process.env.GIPHY_API_KEY = "chave-de-teste";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  process.env.GIPHY_API_KEY = ORIGINAL;
});

describe("a classificação restrita nunca falta", () => {
  it("vai na busca", async () => {
    const pedidos = fingirGiphy(UM_GIF);
    const { procurarGifs } = await carregar();

    await procurarGifs("festa", "chave-de-teste");

    // `g` é a mais restritiva do GIPHY. O Hub tem gente de 18 anos
    // recém-feitos; um GIF impróprio numa busca inocente faz alguém sair.
    expect(pedidos[0]?.searchParams.get("rating")).toBe("g");
    expect(pedidos[0]?.pathname).toContain("/search");
    expect(pedidos[0]?.searchParams.get("q")).toBe("festa");
  });

  it("vai também nos que estão em alta, quando não há termo", async () => {
    const pedidos = fingirGiphy(UM_GIF);
    const { procurarGifs } = await carregar();

    await procurarGifs("   ", "chave-de-teste");

    expect(pedidos[0]?.pathname).toContain("/trending");
    expect(pedidos[0]?.searchParams.get("rating")).toBe("g");
  });
});

describe("quando o GIPHY não colabora", () => {
  it.each([
    ["recusa", () => fingirGiphy({}, 403)],
    ["responde vazio", () => fingirGiphy({})],
    ["responde sem imagens", () => fingirGiphy({ data: [{ id: "x" }] })],
  ])("devolve lista vazia se %s", async (_caso, preparar) => {
    preparar();
    const { procurarGifs } = await carregar();

    // Derrubar a tela de resposta por causa de um serviço de terceiro seria
    // desproporcional: sem GIF, o campo continua funcionando.
    await expect(procurarGifs("festa", "chave-de-teste")).resolves.toEqual([]);
  });

  it("devolve lista vazia se a rede cair", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("sem rede");
    });
    const { procurarGifs } = await carregar();

    await expect(procurarGifs("festa", "chave-de-teste")).resolves.toEqual([]);
  });

  it("não registra o endereço no erro, porque ele carrega a chave", async () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => undefined);
    fingirGiphy({}, 500);
    const { procurarGifs } = await carregar();

    await procurarGifs("festa", "chave-de-teste");

    const escrito = JSON.stringify(registro.mock.calls);
    expect(escrito).not.toContain("chave-de-teste");
    expect(escrito).not.toContain("api_key");
  });
});

describe("sem chave configurada", () => {
  it("o GIF fica desligado e nada é pedido", async () => {
    delete process.env.GIPHY_API_KEY;
    const pedidos = fingirGiphy(UM_GIF);
    const { procurarGifs } = await carregar();

    // `gifEstaLigado()` lê o ambiente inteiro e é conferido na tela, não
    // aqui: o que importa neste teste é que sem chave nada é pedido.
    expect(await procurarGifs("festa", undefined)).toEqual([]);
    expect(pedidos).toHaveLength(0);
  });
});

describe("o que volta para a tela", () => {
  it("traz o arquivo, a prévia e uma descrição", async () => {
    fingirGiphy(UM_GIF);
    const { procurarGifs } = await carregar();

    const [gif] = await procurarGifs("festa", "chave-de-teste");

    expect(gif).toEqual({
      id: "abc",
      url: "https://media.giphy.com/abc.gif",
      previa: "https://media.giphy.com/abc-small.gif",
      descricao: "pessoa dançando",
      largura: 200,
      altura: 150,
    });
  });

  it("sem descrição no GIPHY, o alt não fica vazio", async () => {
    fingirGiphy({
      data: [
        {
          id: "sem",
          images: {
            downsized: { url: "https://media.giphy.com/s.gif" },
            fixed_width_small: { url: "https://media.giphy.com/s-small.gif" },
          },
        },
      ],
    });
    const { procurarGifs } = await carregar();

    // Imagem sem texto alternativo é imagem que não existe para quem usa
    // leitor de tela.
    expect((await procurarGifs("x", "chave-de-teste"))[0]?.descricao).toBe("GIF");
  });

  it("descarta o que vier quebrado em vez de mostrar um buraco", async () => {
    fingirGiphy({ data: [{ id: "bom", images: { downsized: { url: "https://x/g.gif" } } }, {}] });
    const { procurarGifs } = await carregar();

    const achados = await procurarGifs("x", "chave-de-teste");
    expect(achados).toHaveLength(1);
    expect(achados[0]?.id).toBe("bom");
  });
});
