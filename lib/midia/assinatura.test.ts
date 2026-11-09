import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Assinar endereços **em lote** (Bloco C da rodada de velocidade, 8 de
 * novembro de 2026).
 *
 * Assinar não é conta local: é uma ida à rede, por imagem. Uma lista de 20
 * membros fazia 20 pedidos ao depósito — em paralelo, mas 20, e o depósito
 * tem limite de taxa. O `createSignedUrls` faz a lista inteira de uma vez.
 *
 * O teste **conta chamadas**, porque é a única coisa que fica vermelha
 * quando alguém volta ao `Promise.all` de chamadas individuais. O resultado
 * continuaria certo: só mais lento.
 */

type Item = { path: string | null; signedUrl: string | null; error: string | null };

const { chamadas, forcado } = vi.hoisted(() => ({
  chamadas: { individuais: 0, lotes: 0, tamanhos: [] as number[] },
  // Uma resposta combinada para o próximo lote, quando o teste precisa de uma.
  forcado: { proxima: null as Item[] | null },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        createSignedUrl: async (caminho: string) => {
          chamadas.individuais += 1;
          return { data: { signedUrl: `https://deposito/${caminho}?t=1` }, error: null };
        },
        createSignedUrls: async (caminhos: string[]) => {
          chamadas.lotes += 1;
          chamadas.tamanhos.push(caminhos.length);
          const combinada = forcado.proxima;
          forcado.proxima = null;
          return {
            data:
              combinada ??
              caminhos.map((path) => ({
                path,
                signedUrl: `https://deposito/${path}?t=1`,
                error: null,
              })),
            error: null,
          };
        },
      }),
    },
  }),
}));

vi.mock("@/lib/env", () => ({
  serverEnv: () => ({ SUPABASE_SECRET_KEY: "chave-de-teste" }),
  clientEnv: () => ({ NEXT_PUBLIC_SUPABASE_URL: "https://exemplo.supabase.co" }),
}));

const { comAvatares, enderecosDeMidia } = await import("./deposito");

beforeEach(() => {
  chamadas.individuais = 0;
  chamadas.lotes = 0;
  chamadas.tamanhos = [];
  forcado.proxima = null;
});

afterEach(() => vi.clearAllMocks());

describe("uma lista de imagens custa um pedido, não um por imagem", () => {
  it("10 pessoas: 1 pedido ao depósito", async () => {
    const pessoas = Array.from({ length: 10 }, (_, i) => ({ avatarUrl: `perfis/${i}.webp` }));

    const prontas = await comAvatares(pessoas);

    expect(chamadas.lotes).toBe(1);
    expect(chamadas.individuais).toBe(0);
    expect(prontas[0]!.avatarUrl).toBe("https://deposito/perfis/0.webp?t=1");
    expect(prontas[9]!.avatarUrl).toBe("https://deposito/perfis/9.webp?t=1");
  });

  it("o mesmo caminho repetido é assinado uma vez só", async () => {
    const mesma = Array.from({ length: 8 }, () => ({ avatarUrl: "perfis/lia.webp" }));

    await comAvatares(mesma);

    expect(chamadas.tamanhos).toEqual([1]);
  });

  it("sem nenhum caminho no depósito, não pede nada", async () => {
    await enderecosDeMidia([null, "https://media.giphy.com/a.gif", null]);

    expect(chamadas.lotes).toBe(0);
    expect(chamadas.individuais).toBe(0);
  });
});

describe("o lote não troca a foto de uma pessoa pela de outra", () => {
  /**
   * O casamento é **pelo caminho**, nunca pela posição: a ordem da resposta
   * do depósito não é promessa de ninguém. Confiar nela daria o avatar de
   * uma pessoa a outra, que é defeito de privacidade e não de desenho.
   */
  it("mistura de URL externa, caminho e vazio sai na ordem de quem pediu", async () => {
    const saida = await enderecosDeMidia([
      "respostas/a.webp",
      "https://media.giphy.com/x.gif",
      null,
      "respostas/b.webp",
    ]);

    expect(saida).toEqual([
      "https://deposito/respostas/a.webp?t=1",
      "https://media.giphy.com/x.gif",
      null,
      "https://deposito/respostas/b.webp?t=1",
    ]);
  });

  it("caminho que o depósito não devolveu vira nulo, e não o endereço do vizinho", async () => {
    forcado.proxima = [
      {
        path: "perfis/existe.webp",
        signedUrl: "https://deposito/perfis/existe.webp?t=1",
        error: null,
      },
      { path: "perfis/sumiu.webp", signedUrl: null, error: "not found" },
    ];

    const prontas = await comAvatares([
      { avatarUrl: "perfis/existe.webp" },
      { avatarUrl: "perfis/sumiu.webp" },
    ]);

    expect(prontas[0]!.avatarUrl).toBe("https://deposito/perfis/existe.webp?t=1");
    expect(prontas[1]!.avatarUrl).toBeNull();
  });
});
