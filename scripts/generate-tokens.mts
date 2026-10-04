/**
 * Gera design/tokens.ts e design/tokens.css a partir de
 * docs/design-system/tokens.json.
 *
 * O JSON é a fonte da verdade: nenhum valor de cor, tamanho, espaçamento ou
 * raio é escrito à mão no código. Rode `npm run tokens` depois de mexer no JSON.
 *
 * Com `--check` nada é gravado: o script compara o que geraria com o que está
 * em disco e falha se divergir. É o que a CI roda. A comparação é com o arquivo,
 * não com o último commit, então o resultado não depende do estado do git.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { format, resolveConfig } from "prettier";

type ColorToken = { name: string; value: string; usage: string };
type TypeStyle = {
  name: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  letterSpacing?: string;
  usage: string;
};
type SizeToken = { name: string; value: string; usage: string };

type TokensFile = {
  color: { tokens: ColorToken[] };
  type: { families: Record<string, string>; groups: { styles: TypeStyle[] }[] };
  spacing: { tokens: SizeToken[] };
  radius: { tokens: SizeToken[] };
  /** Medidas de controle: ícone, marca, avatar, miniatura, interruptor. */
  size: { tokens: SizeToken[] };
};

const SOURCE = "docs/design-system/tokens.json";
const tokens = JSON.parse(readFileSync(SOURCE, "utf8")) as TokensFile;

const colors = tokens.color.tokens;
const styles = tokens.type.groups.flatMap((group) => group.styles);
const spacing = tokens.spacing.tokens;
const radii = tokens.radius.tokens;
const sizes = tokens.size.tokens;
const sans = tokens.type.families.sans;

const header = (extension: string) => {
  const open = extension === "css" ? "/*" : "/**";
  return `${open}
 * GERADO POR scripts/generate-tokens.mts — NÃO EDITE À MÃO.
 * Fonte: ${SOURCE}. Para mudar um valor, mude o JSON e rode \`npm run tokens\`.
 ${extension === "css" ? "*/" : "*/"}`;
};

/** `radiusSm` → `sm`, `space1` → `1`: o prefixo vira o namespace do Tailwind. */
const shortName = (name: string) => name.replace(/^(radius|space)/, "").toLowerCase();

// ---------------------------------------------------------------- tokens.ts

const ts = `${header("ts")}

/** Cores do Hub. Cada nível da hierarquia tem a sua, fixa em toda a rede. */
export const color = {
${colors.map((c) => `  /** ${c.usage} */\n  ${c.name}: "${c.value}",`).join("\n")}
} as const;

export type ColorName = keyof typeof color;

/** Escala tipográfica. Uma família só: Bricolage Grotesque. */
export const typography = {
${styles
  .map(
    (s) => `  /** ${s.usage} */
  ${s.name}: {
    fontSize: "${s.fontSize}",
    lineHeight: "${s.lineHeight}",
    fontWeight: ${s.fontWeight},${s.letterSpacing ? `\n    letterSpacing: "${s.letterSpacing}",` : ""}
  },`,
  )
  .join("\n")}
} as const;

export type TypographyName = keyof typeof typography;

/** Grade de 8 px. */
export const spacing = {
${spacing.map((s) => `  /** ${s.usage} */\n  ${s.name}: "${s.value}",`).join("\n")}
} as const;

export const radius = {
${radii.map((r) => `  /** ${r.usage} */\n  ${r.name}: "${r.value}",`).join("\n")}
} as const;

/**
 * Medidas dos controles. Ficam no mesmo namespace de espaçamento do Tailwind,
 * então viram utilitário: \`size-mark\`, \`h-toggleH\`, \`max-w-contentColumn\`.
 */
export const size = {
${sizes.map((s) => `  /** ${s.usage} */\n  ${s.name}: "${s.value}",`).join("\n")}
} as const;

export const fontFamily = ${JSON.stringify(sans)} as const;
`;

// --------------------------------------------------------------- tokens.css

const css = `${header("css")}

@theme {
  /* \`initial\` apaga a escala padrão do Tailwind. Sobram só os tokens do Hub,
     então \`bg-red-500\` ou \`p-7\` simplesmente não existem: a regra "nenhuma cor
     ou tamanho fora dos tokens" passa a ser impossível de quebrar por descuido. */
  --color-*: initial;
  --text-*: initial;
  --spacing-*: initial;
  --radius-*: initial;
  --font-*: initial;

  --color-transparent: transparent;
  --color-current: currentColor;

${colors.map((c) => `  --color-${c.name}: ${c.value};`).join("\n")}

${styles
  .map((s) =>
    [
      `  --text-${s.name}: ${s.fontSize};`,
      `  --text-${s.name}--line-height: ${s.lineHeight};`,
      `  --text-${s.name}--font-weight: ${s.fontWeight};`,
      s.letterSpacing ? `  --text-${s.name}--letter-spacing: ${s.letterSpacing};` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  )
  .join("\n")}

${spacing.map((s) => `  --spacing-${shortName(s.name)}: ${s.value};`).join("\n")}

${sizes.map((s) => `  --spacing-${s.name}: ${s.value};`).join("\n")}

${radii.map((r) => `  --radius-${shortName(r.name)}: ${r.value};`).join("\n")}

  --font-sans: var(--hub-font-sans), ${sans};
}
`;

const checkOnly = process.argv.includes("--check");
const stale: string[] = [];

/*
 * Formata com o Prettier do projeto antes de gravar. Sem isso o arquivo gerado
 * sairia diferente do arquivo formatado que está no repositório, e a conferência
 * acusaria diferença a cada rodada.
 */
async function emit(path: string, contents: string, parser: "typescript" | "css") {
  const options = await resolveConfig(path);
  const formatted = await format(contents, { ...options, parser });

  if (!checkOnly) {
    writeFileSync(path, formatted);
    return;
  }

  const current = readFileSync(path, "utf8");
  if (current !== formatted) stale.push(path);
}

await emit("design/tokens.ts", ts, "typescript");
await emit("design/tokens.css", css, "css");

if (checkOnly && stale.length > 0) {
  console.error(
    `Os tokens gerados estão desatualizados:\n${stale.map((f) => `  - ${f}`).join("\n")}\n` +
      "Rode `npm run tokens` e inclua o resultado no commit.",
  );
  process.exit(1);
}
console.log(
  `tokens${checkOnly ? " em dia" : ""}: ${colors.length} cores, ${styles.length} estilos de texto, ` +
    `${spacing.length} espaçamentos, ${radii.length} raios, ${sizes.length} medidas.`,
);
