import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  enderecoDaComunidade,
  enderecoDoPerfil,
  enderecoDoPost,
  enderecoDoTopico,
  enderecoParaCompartilharPost,
  enderecoParaCompartilharTopico,
} from "./rotas";

/**
 * **Ninguém monta o endereço de tópico à mão.**
 *
 * Em 6 de novembro de 2026 a tela cheia do tópico deixou de existir: todo
 * clique dentro do Hub abre o painel, em `/c/<com>?t=<topico>`. Eram
 * **catorze** lugares montando o endereço antigo — cinco no Início, a
 * comunidade, o perfil, a Coleção, Explorar, a busca, as notificações duas
 * vezes, a Cabine e o redirecionamento depois de criar.
 *
 * O que torna essa mudança perigosa não é trocar catorze strings: é a
 * décima quinta, que nasce na feature seguinte. **Um link para o endereço
 * errado não quebra nada** — ele redireciona, custa uma volta ao servidor,
 * e leva a pessoa para a tela certa pelo caminho longo. Nenhum teste de
 * jornada reprova por isso, e nenhum build reclama.
 *
 * Por isso a barreira é uma varredura, e não uma jornada.
 */

/** Onde procurar: todo código de aplicação, menos o que é teste. */
const PASTAS = ["app", "features", "lib", "design"];

function arquivos(pasta: string): string[] {
  const achados: string[] = [];
  for (const entrada of readdirSync(pasta)) {
    if (entrada.startsWith(".") || entrada === "node_modules" || entrada === "generated") continue;
    const caminho = join(pasta, entrada);
    if (statSync(caminho).isDirectory()) {
      achados.push(...arquivos(caminho));
      continue;
    }
    if (!/\.tsx?$/.test(entrada)) continue;
    if (/\.test\.tsx?$/.test(entrada)) continue;
    achados.push(caminho);
  }
  return achados;
}

/**
 * `/c/${algo}/${algo}` escrito à mão, em template literal.
 *
 * Só com **duas** interpolações: `/c/${slug}` é a comunidade e é legítimo
 * em dezenas de lugares, inclusive em `revalidatePath`.
 */
const MONTAGEM_A_MAO = /`\/c\/\$\{[^}]+\}\/\$\{[^}]+\}/;

/**
 * Quem pode montar à mão, e por quê.
 *
 * - `lib/rotas.ts` é o lugar onde isto mora.
 * - A rota do tópico recebe os dois slugs do próprio endereço, e o que
 *   ela monta é o destino do redirecionamento, pela função.
 */
const PERMITIDOS = new Set(["lib/rotas.ts"]);

describe("o endereço de tópico vem de lib/rotas.ts", () => {
  const todos = PASTAS.flatMap(arquivos);

  it("acha código para varrer", () => {
    // Se a varredura olhar o lugar errado, ela passa vazia e não guarda nada.
    expect(todos.length).toBeGreaterThan(100);
  });

  it.each(todos.filter((a) => !PERMITIDOS.has(a)))("%s não monta /c/<com>/<top>", (arquivo) => {
    const linhas = readFileSync(arquivo, "utf8").split("\n");
    const culpadas = linhas
      .map((linha, i) => ({ linha, numero: i + 1 }))
      .filter(({ linha }) => MONTAGEM_A_MAO.test(linha));

    expect(
      culpadas.map((c) => `${arquivo}:${c.numero} ${c.linha.trim()}`),
      "use enderecoDoTopico() para navegar, ou enderecoParaCompartilharTopico() para o link canônico",
    ).toEqual([]);
  });
});

describe("as duas formas do endereço de tópico", () => {
  it("navegar abre o painel na comunidade", () => {
    expect(enderecoDoTopico("vinil", "primeiro-disco")).toBe("/c/vinil?t=primeiro-disco");
  });

  it("compartilhar continua com o tópico no caminho", () => {
    // É este que carrega a prévia do link e a tela de convite. Se um dia
    // ele virar `?t=`, quem abre sem conta cai numa tela de dentro.
    expect(enderecoParaCompartilharTopico("vinil", "primeiro-disco")).toBe(
      "/c/vinil/primeiro-disco",
    );
  });

  it("a comunidade é só a comunidade", () => {
    expect(enderecoDaComunidade("vinil")).toBe("/c/vinil");
  });

  it("escapa o que o endereço não aceita", () => {
    // Slug vem do banco e é sempre limpo — mas a função é pública, e um
    // `&` no parâmetro viraria outro parâmetro na URL.
    expect(enderecoDoTopico("vinil", "a&b")).toBe("/c/vinil?t=a%26b");
  });
});

describe("as duas formas do endereço de post", () => {
  it("navegar abre o painel no perfil", () => {
    expect(enderecoDoPost(enderecoDoPerfil("lia", false), "uma-noite-no-galpao")).toBe(
      "/lia?post=uma-noite-no-galpao",
    );
  });

  /**
   * **O dono tem dois endereços de perfil, e só um deles funciona com
   * parâmetro.** `/<meu handle>` redireciona para `/perfil`, e um link do
   * dono para `/<handle>?post=x` passava por esse redirecionamento e
   * chegava sem o parâmetro — o painel ficava fechado, sem explicação.
   */
  it("o post do dono abre em /perfil, não no @ dele", () => {
    expect(enderecoDoPerfil("lia", true)).toBe("/perfil");
    expect(enderecoDoPost(enderecoDoPerfil("lia", true), "meu-post")).toBe("/perfil?post=meu-post");
  });

  it("compartilhar põe o post no caminho", () => {
    // É este que se cola numa conversa, e que leva quem não tem conta ao
    // convite. Virar `?post=` faria o link de fora cair numa tela de
    // dentro.
    expect(enderecoParaCompartilharPost("lia", "uma-noite-no-galpao")).toBe(
      "/lia/uma-noite-no-galpao",
    );
  });

  it("escapa o que o endereço não aceita", () => {
    expect(enderecoDoPost("/lia", "a&b")).toBe("/lia?post=a%26b");
  });

  /**
   * As duas formas existem porque **são destinos diferentes**, e colapsá-las
   * quebraria o compartilhamento — a mesma lição do tópico, que já custou
   * uma rodada.
   */
  it("navegar e compartilhar não são a mesma coisa", () => {
    expect(enderecoDoPost("/lia", "x")).not.toBe(enderecoParaCompartilharPost("lia", "x"));
  });
});
