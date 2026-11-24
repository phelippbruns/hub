import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * **Todo `MenuSuspenso` leva `ancora`.**
 *
 * Sem ela, clicar no "..." de novo **nunca fecha**: o `mousedown` cai fora
 * da caixa, o menu fecha, e o `click` do próprio botão chega depois e o
 * reabre na mesma batida. Para quem usa, o clique simplesmente não faz
 * nada.
 *
 * O defeito viveu três anos no Hub sem ninguém notar, e foi corrigido no
 * menu da contribuição em 7 de novembro de 2026 — e **só nele**. Em 12 de
 * novembro o PO reclamou do menu do tópico, e o levantamento achou três
 * comportamentos diferentes na mesma casa:
 *
 * | Tela | Clicar de novo fecha | Tirar o mouse fecha |
 * | --- | --- | --- |
 * | Contribuição | sim | sim |
 * | Cabeçalho da comunidade | sim | não |
 * | Painel do tópico | não | não |
 *
 * Consertar os três resolve hoje. Esta varredura é o que resolve o quarto,
 * que nasce na feature seguinte — é a mesma receita de `lib/rotas.test.ts`.
 *
 * **O que ela não alcança:** o `onMouseLeave`, que mora no elemento que
 * envolve o menu e não no menu. Ler a estrutura em volta pediria um
 * analisador de verdade, e uma varredura de texto erraria nos dois
 * sentidos. Fica como jornada.
 */

const PASTAS = ["app", "features", "design"];

function arquivos(pasta: string): string[] {
  const achados: string[] = [];
  for (const entrada of readdirSync(pasta)) {
    if (entrada.startsWith(".") || entrada === "node_modules" || entrada === "generated") continue;
    const caminho = join(pasta, entrada);
    if (statSync(caminho).isDirectory()) {
      achados.push(...arquivos(caminho));
      continue;
    }
    if (!/\.tsx$/.test(entrada)) continue;
    if (/\.test\.tsx$/.test(entrada)) continue;
    achados.push(caminho);
  }
  return achados;
}

/**
 * O trecho de JSX de cada `<MenuSuspenso …>`, do nome da tag até o `>` que
 * fecha a abertura.
 *
 * **Contando chaves, e não com uma regex.** A primeira versão era
 * `/<MenuSuspenso\b[\s\S]*?>/` e reprovava **todos** os arquivos, inclusive
 * os que eu acabara de consertar: ela parava no `>` da arrow function de
 * `onFechar={() => …}`, e o trecho capturado nunca chegava ao `ancora`. Um
 * teste que reprova sempre é tão inútil quanto um que passa sempre.
 */
function aberturasDeMenu(fonte: string): string[] {
  const achados: string[] = [];

  for (const inicio of [...fonte.matchAll(/<MenuSuspenso\b/g)].map((m) => m.index)) {
    let profundidade = 0;

    for (let i = inicio; i < fonte.length; i++) {
      const caractere = fonte[i];
      if (caractere === "{") profundidade += 1;
      else if (caractere === "}") profundidade -= 1;
      else if (caractere === ">" && profundidade === 0) {
        achados.push(fonte.slice(inicio, i + 1));
        break;
      }
    }
  }

  return achados;
}

/** Quem desenha o próprio componente, e a galeria, que é demonstração. */
const PERMITIDOS = new Set([
  join("design", "components", "menu-suspenso.tsx"),
  join("design", "gallery.tsx"),
]);

describe("todo menu suspenso leva âncora", () => {
  const todos = PASTAS.flatMap(arquivos);

  it("acha código para varrer", () => {
    // Varredura que olha o lugar errado passa vazia e não guarda nada.
    expect(todos.length).toBeGreaterThan(100);
  });

  it("acha os menus que existem hoje", () => {
    const comMenu = todos.filter(
      (arquivo) => aberturasDeMenu(readFileSync(arquivo, "utf8")).length,
    );

    // Se a regex parar de casar, o teste abaixo passa sem conferir nada.
    expect(comMenu.length).toBeGreaterThanOrEqual(4);
  });

  it.each(todos.filter((arquivo) => !PERMITIDOS.has(arquivo)))(
    "%s passa ancora em todo MenuSuspenso",
    (arquivo) => {
      const semAncora = aberturasDeMenu(readFileSync(arquivo, "utf8")).filter(
        (abertura) => !/\bancora=/.test(abertura),
      );

      expect(
        semAncora,
        "sem ancora, clicar no botão de novo reabre o menu que ele acabou de fechar — e parece que o clique não faz nada",
      ).toEqual([]);
    },
  );
});

/**
 * **E a âncora de todo menu declara a própria caixa.**
 *
 * O balão é `absolute right-0`: ele se pendura na caixa do elemento
 * `relative` que o envolve, e **essa caixa tem de incluir o botão**.
 *
 * Em 24 de novembro de 2026 o Chromium 159 mudou de onde um elemento
 * posicionado se pendura quando o `relative` é um elemento **de linha**, e
 * o menu da contribuição passou a nascer 44 px à esquerda — ao lado do
 * botão, em vez de embaixo. Botão e balão passavam a se tocar num ponto
 * só, e levar o mouse de um até o outro fechava o menu debaixo do cursor.
 *
 * Três das quatro âncoras em `<span>` escaparam **por acidente**: eram
 * itens de um `flex`, que transforma o filho em bloco e dá caixa própria
 * de graça. É isso que esta varredura tira do caminho — a âncora não
 * depende mais de onde foi parar.
 *
 * `<div>` já é bloco, e passa sem classe nenhuma. `<span>` precisa dizer.
 *
 * **O que ela não alcança:** a geometria. Uma classe certa com um pai
 * estranho ainda poderia errar, e nenhuma leitura de texto veria. Quem
 * mede são os quatro menus da jornada "todo balão termina na direita do
 * botão" (`e2e/correcoes-v6.spec.ts`).
 */

/** Classes do Tailwind que dão caixa própria ao elemento. */
const CAIXA_PROPRIA = [
  "block",
  "inline-block",
  "flex",
  "inline-flex",
  "grid",
  "inline-grid",
  "table",
  "flow-root",
];

/** Tags que já são bloco sem precisar de classe. */
const JA_SAO_BLOCO = new Set(["div", "section", "header", "footer", "aside", "nav", "li", "p"]);

/** A abertura da tag que carrega `ref={nome}`, com o nome da tag. */
function ancoraDe(fonte: string, nome: string): { tag: string; abertura: string } | null {
  const ref = fonte.indexOf(`ref={${nome}}`);
  if (ref < 0) return null;

  // De trás para a frente até o `<` que abre este elemento.
  let inicio = -1;
  for (let i = ref; i >= 0; i--) {
    if (fonte[i] === "<") {
      inicio = i;
      break;
    }
    if (fonte[i] === ">") return null; // passou o fim de outra tag: não é aqui.
  }
  if (inicio < 0) return null;

  const tag = /^<([A-Za-z][\w.-]*)/.exec(fonte.slice(inicio))?.[1];
  if (!tag) return null;

  let profundidade = 0;
  for (let i = inicio; i < fonte.length; i++) {
    const c = fonte[i];
    if (c === "{") profundidade += 1;
    else if (c === "}") profundidade -= 1;
    else if (c === ">" && profundidade === 0) {
      return { tag, abertura: fonte.slice(inicio, i + 1) };
    }
  }
  return null;
}

describe("a âncora de todo menu tem caixa própria", () => {
  const todos = PASTAS.flatMap(arquivos).filter((arquivo) => !PERMITIDOS.has(arquivo));

  const ancoras = todos.flatMap((arquivo) => {
    const fonte = readFileSync(arquivo, "utf8");
    return aberturasDeMenu(fonte)
      .map((abertura) => /\bancora=\{([A-Za-z_$][\w$]*)\}/.exec(abertura)?.[1])
      .filter((nome): nome is string => !!nome)
      .map((nome) => ({ arquivo, nome, achada: ancoraDe(fonte, nome) }));
  });

  it("acha as âncoras que existem hoje", () => {
    // Varredura que não acha nada passa vazia e não guarda coisa nenhuma.
    expect(ancoras.length).toBeGreaterThanOrEqual(6);
    expect(ancoras.filter((a) => !a.achada)).toEqual([]);
  });

  it.each(ancoras.map((a) => [`${a.arquivo} → ${a.nome}`, a] as const))(
    "%s declara a caixa",
    (_nome, { achada }) => {
      const { tag, abertura } = achada!;
      if (JA_SAO_BLOCO.has(tag)) return;

      const classes = /className="([^"]*)"/.exec(abertura)?.[1]?.split(/\s+/) ?? [];

      expect(
        classes.some((c) => CAIXA_PROPRIA.includes(c)),
        `<${tag}> é elemento de linha, e o balão se pendura na caixa dele. ` +
          `Sem uma classe de caixa (${CAIXA_PROPRIA.join(", ")}), o menu nasce ao ` +
          `lado do botão em vez de embaixo — e fecha quando o mouse vai até ele.`,
      ).toBe(true);
    },
  );
});
