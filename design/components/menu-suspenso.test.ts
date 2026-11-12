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
