import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { color, radius, size, spacing, typography } from "./tokens";

/**
 * A regra "nenhuma cor ou tamanho fora dos tokens" tem duas defesas.
 *
 * A primeira é estrutural: design/tokens.css zera as escalas padrão do Tailwind
 * com `--color-*: initial`, então `bg-red-500` e `p-7` nem existem.
 *
 * A segunda é este teste, que pega o que escapa por fora do Tailwind: hex solto,
 * rgb(), e valor arbitrário em px ou rem.
 */

const SOURCE_DIRS = ["design", "app"];
const GENERATED = ["design/tokens.ts", "design/tokens.css"];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    if (!/\.(ts|tsx|css)$/.test(path)) return [];
    if (GENERATED.includes(path)) return [];
    if (path.endsWith(".test.ts") || path.endsWith(".test.tsx")) return [];
    return [path];
  });
}

const files = SOURCE_DIRS.flatMap(sourceFiles);

describe("nenhuma cor fora dos tokens", () => {
  it("encontra os arquivos de origem", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  /**
   * #fff e #000 dentro de uma máscara SVG não são cor: são os canais da
   * máscara — branco mostra, preto vaza. Trocá-los por um token quebraria o
   * desenho. A exceção vale só para os ícones, para não vazar aos componentes.
   */
  const maskChannels = new Set(["#fff", "#000"]);

  it.each(files)("%s não tem cor escrita à mão", (file) => {
    const source = readFileSync(file, "utf8");
    const isIcon = file.startsWith("design/icons/");

    const hex = (source.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).filter(
      (value) => !(isIcon && maskChannels.has(value.toLowerCase())),
    );
    const functional = source.match(/\b(rgba?|hsla?|oklch|color-mix)\s*\(/g) ?? [];

    expect({ file, hex, functional }).toEqual({ file, hex: [], functional: [] });
  });
});

describe("nenhum tamanho fora dos tokens", () => {
  it.each(files)("%s não usa valor arbitrário em px ou rem", (file) => {
    const source = readFileSync(file, "utf8");

    // Valor arbitrário do Tailwind: classe-[...]. Relativo (em, %, calc com var)
    // é permitido: não inventa um degrau novo da escala, só acompanha o contexto.
    const arbitrary = (source.match(/-\[[^\]]+\]/g) ?? []).filter((value) =>
      /\d(px|rem)\b/.test(value),
    );

    expect({ file, arbitrary }).toEqual({ file, arbitrary: [] });
  });
});

describe("os tokens vieram do JSON", () => {
  const json = JSON.parse(readFileSync("docs/design-system/tokens.json", "utf8")) as {
    color: { tokens: { name: string; value: string }[] };
    spacing: { tokens: { name: string; value: string }[] };
    radius: { tokens: { name: string; value: string }[] };
    size: { tokens: { name: string; value: string }[] };
    type: { groups: { styles: { name: string; fontSize: string }[] }[] };
  };

  it("tem exatamente as cores do design system", () => {
    expect(Object.keys(color)).toEqual(json.color.tokens.map((t) => t.name));
  });

  it.each(json.color.tokens)("$name vale $value", ({ name, value }) => {
    expect(color[name as keyof typeof color]).toBe(value);
  });

  it("tem a escala tipográfica inteira", () => {
    const expected = json.type.groups.flatMap((g) => g.styles.map((s) => s.name));
    expect(Object.keys(typography)).toEqual(expected);
  });

  it("tem os espaçamentos, os raios e as medidas de controle", () => {
    expect(Object.keys(spacing)).toEqual(json.spacing.tokens.map((t) => t.name));
    expect(Object.keys(radius)).toEqual(json.radius.tokens.map((t) => t.name));
    expect(Object.keys(size)).toEqual(json.size.tokens.map((t) => t.name));
  });

  it("não sobrou nenhum arquivo de medida fora do gerado", () => {
    // As medidas de controle moravam em design/sizes.css até virarem token.
    expect(files).not.toContain("design/sizes.css");
  });
});
