import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MARCAS_DO_POST, NOS_DO_POST } from "./shared";

/**
 * **As três listas do post concordam.**
 *
 * O editor oferece, o servidor aceita e o desenho desenha. Se o editor
 * oferecer algo que o desenho não sabe desenhar, a pessoa formata, publica,
 * e o texto volta **sem a formatação** — sem erro na tela, sem teste
 * vermelho, sem nada. Nó desconhecido cai no `default: return null` do
 * `switch` e some em silêncio.
 *
 * Esta varredura é o alarme. Ela lê os três arquivos e compara, porque
 * importar o `StarterKit` aqui traria o ProseMirror inteiro para o Vitest
 * de regras, que roda sem navegador.
 */

const raiz = join(import.meta.dirname, "..", "..", "..");
const ler = (...caminho: string[]) => readFileSync(join(raiz, ...caminho), "utf8");

/** Os `case "x":` do `switch` de `desenhar()`. */
function nosQueODesenhoFaz(): Set<string> {
  const fonte = ler("features", "perfil", "blog", "documento.tsx");
  const miolo = fonte.slice(fonte.indexOf("switch (no.type)"));
  return new Set([...miolo.matchAll(/case "([A-Za-z]+)":/g)].map((achado) => achado[1]!));
}

/** Os `nomes.has("x")` e o `m.type === "x"` do aplicador de marcas. */
function marcasQueODesenhoFaz(): Set<string> {
  const fonte = ler("features", "perfil", "blog", "documento.tsx");
  return new Set([
    ...[...fonte.matchAll(/nomes\.has\("([a-z]+)"\)/g)].map((achado) => achado[1]!),
    ...[...fonte.matchAll(/m\.type === "([a-z]+)"/g)].map((achado) => achado[1]!),
  ]);
}

describe("o editor não oferece o que o desenho não sabe desenhar", () => {
  it("todo nó da lista fechada tem um caso no desenho", () => {
    const desenhados = nosQueODesenhoFaz();
    const faltando = NOS_DO_POST.filter((no) => !desenhados.has(no));

    expect(faltando, `nós sem desenho: ${faltando.join(", ")}`).toEqual([]);
  });

  it("toda marca da lista fechada é aplicada pelo desenho", () => {
    const desenhadas = marcasQueODesenhoFaz();
    const faltando = MARCAS_DO_POST.filter((marca) => !desenhadas.has(marca));

    expect(faltando, `marcas sem desenho: ${faltando.join(", ")}`).toEqual([]);
  });

  /**
   * **O outro sentido**, que é o que pega o erro de verdade: o `StarterKit`
   * vem com tachado, código e linha divisória, e quem o configurar sem
   * desligá-los põe botões na barra que produzem texto invisível.
   */
  it("o StarterKit desliga tudo que o desenho não faz", () => {
    const fonte = ler("features", "perfil", "blog", "tiptap.ts");
    const configuracao = fonte.slice(fonte.indexOf("StarterKit.configure"));

    for (const proibido of ["strike", "code", "codeBlock", "horizontalRule"]) {
      expect(configuracao, `${proibido} precisa de \`${proibido}: false\``).toContain(
        `${proibido}: false`,
      );
    }
  });

  it("o subtítulo fica só no nível 2, porque o desenho só faz h2", () => {
    const fonte = ler("features", "perfil", "blog", "tiptap.ts");
    expect(fonte).toContain("heading: { levels: [2] }");

    const desenho = ler("features", "perfil", "blog", "documento.tsx");
    expect(desenho, "o desenho passou a respeitar attrs.level — revise esta regra").not.toMatch(
      /attrs\??\.\s*level/,
    );
  });

  /**
   * O schema do servidor é a terceira lista, e a mais importante: é ela que
   * vale contra um formulário forjado. Se um nó entra na lista sem entrar
   * no schema, o editor o produz e o servidor recusa o post inteiro.
   */
  it("todo nó e toda marca da lista fechada existem no schema do servidor", () => {
    const schema = ler("lib", "data", "documento-do-post.ts");

    for (const no of NOS_DO_POST) {
      expect(schema, `o schema não declara o nó ${no}`).toContain(`z.literal("${no}")`);
    }
    for (const marca of MARCAS_DO_POST) {
      expect(schema, `o schema não declara a marca ${marca}`).toContain(`z.literal("${marca}")`);
    }
  });
});
