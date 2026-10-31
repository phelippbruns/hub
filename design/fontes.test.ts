import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * O build não pode depender de o Google estar no ar.
 *
 * `next/font/google` busca o arquivo da fonte **na hora de compilar**. Em
 * 31 de outubro isso derrubou duas rodadas locais e a CI de um pull
 * request, com um erro que fala de "import map" e não diz uma palavra
 * sobre rede.
 *
 * A fonte passou a morar em `design/fontes/`. Este teste é a barreira: um
 * `next/font/google` que volte ao código reprova aqui, em três segundos,
 * em vez de reprovar num deploy quando a rede piscar.
 */

const PASTAS = ["app", "design", "features", "lib"];

function arquivosDeCodigo(dir: string): string[] {
  const achados: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const caminho = join(dir, entrada);
    if (statSync(caminho).isDirectory()) {
      achados.push(...arquivosDeCodigo(caminho));
    } else if (/\.(ts|tsx)$/.test(entrada)) {
      achados.push(caminho);
    }
  }
  return achados;
}

const arquivos = PASTAS.flatMap(arquivosDeCodigo);

describe("a fonte é servida do repositório", () => {
  it("encontra os arquivos de código", () => {
    expect(arquivos.length).toBeGreaterThan(50);
  });

  it("ninguém importa next/font/google", () => {
    const culpados = arquivos.filter((caminho) =>
      // O próprio teste cita o nome; por isso a busca é pelo import.
      /from\s+["']next\/font\/google["']/.test(readFileSync(caminho, "utf8")),
    );
    expect(culpados).toEqual([]);
  });

  it("os arquivos da fonte estão no repositório, e são woff2 de verdade", () => {
    const fontes = readdirSync(join("design", "fontes"));
    expect(fontes).toContain("bricolage-grotesque-latin.woff2");

    // `wOF2` é a assinatura do formato. Um arquivo vazio ou um HTML de
    // erro baixado por engano passaria pelo nome e morreria no navegador.
    const bytes = readFileSync(join("design", "fontes", "bricolage-grotesque-latin.woff2"));
    expect(bytes.subarray(0, 4).toString("latin1")).toBe("wOF2");
    expect(bytes.byteLength).toBeGreaterThan(10_000);
  });
});
