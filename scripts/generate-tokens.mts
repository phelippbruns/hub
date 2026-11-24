/**
 * Gera design/tokens.ts, design/tokens.css e docs/design-system/index.html a
 * partir de docs/design-system/tokens.json.
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
  /** Frase de exemplo, desenhada no documento no tamanho real. */
  sample?: string;
  usage: string;
};
type SizeToken = { name: string; value: string; usage: string };
type ContrastPair = {
  foreground: string;
  background: string;
  /** Valor publicado, com uma casa decimal. `design/contrast.test.ts` o mede. */
  expected: number;
  usage: string;
};

type TokensFile = {
  version: number;
  color: { tokens: ColorToken[] };
  /** Cores de fundo do perfil (RN27). Fora da paleta principal de propósito. */
  fundoDePerfil: { nota?: string; tokens: ColorToken[] };
  type: { families: Record<string, string>; groups: { name: string; styles: TypeStyle[] }[] };
  spacing: { tokens: SizeToken[] };
  radius: { tokens: SizeToken[] };
  /** Medidas de controle: ícone, marca, avatar, miniatura, interruptor. */
  size: { tokens: SizeToken[] };
  /**
   * A tabela de pares de contraste do design system.
   *
   * Ela mora no JSON, e não no código, porque é **dado do design system**: a
   * mesma lista alimenta `design/tokens.ts` (de onde o teste a mede) e o HTML
   * do documento. Escrita nos dois, a terceira divergiria em silêncio.
   */
  contrast: { pairs: ContrastPair[] };
};

const SOURCE = "docs/design-system/tokens.json";
const tokens = JSON.parse(readFileSync(SOURCE, "utf8")) as TokensFile;

const colors = tokens.color.tokens;
const fundos = tokens.fundoDePerfil.tokens;
const styles = tokens.type.groups.flatMap((group) => group.styles);
const spacing = tokens.spacing.tokens;
const radii = tokens.radius.tokens;
const sizes = tokens.size.tokens;
const sans = tokens.type.families.sans;
const pares = tokens.contrast.pairs;

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

/**
 * Cor de fundo da página de perfil, escolhida por quem é dono (RN27).
 *
 * Separada da paleta porque é outra coisa: são variações claras de
 * superfície, e misturá-las com as 9 cores do sistema faria \`fundoVerde\`
 * parecer tão fundamental quanto \`ink\`. O perfil guarda a **chave**, nunca
 * o hex — assim a paleta muda sem migration.
 */
export const fundoDePerfil = {
${fundos.map((c) => `  /** ${c.usage} */\n  ${c.name}: "${c.value}",`).join("\n")}
} as const;

export type FundoDePerfil = keyof typeof fundoDePerfil;

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

/**
 * A tabela de pares de contraste do design system, na ordem publicada.
 *
 * \`design/contrast.ts\` mede cada um e \`design/contrast.test.ts\` reprova se o
 * valor divergir; o HTML do documento desenha a mesma lista.
 */
export const contrastPairs = [
${pares
  .map(
    (p) =>
      `  { foreground: "${p.foreground}", background: "${p.background}", expected: ${p.expected}, usage: "${p.usage}" },`,
  )
  .join("\n")}
] as const;
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

${fundos.map((c) => `  --color-${c.name}: ${c.value};`).join("\n")}

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

// -------------------------------------------------------------- index.html

/**
 * Em que grupo cada medida entra, e nesta ordem.
 *
 * As 44 medidas são metade do sistema e até aqui **não apareciam em lugar
 * nenhum**: não havia tela, documento nem teste que as mostrasse. Agrupá-las
 * por função é o que as torna legíveis — `icon` ao lado de `iconLg` diz algo;
 * `icon` ao lado de `cabinList` não diz nada.
 *
 * A lista é exaustiva de propósito: medida nova que não entre em nenhum grupo
 * **derruba o gerador**. Sem isso ela nasceria invisível, que é exatamente o
 * estado de que esta seção tirou as 44.
 */
const GRUPOS_DE_MEDIDA: { nome: string; escala: number; nota?: string; medidas: string[] }[] = [
  {
    nome: "Ícone",
    escala: 1,
    nota: "Todos desenhados numa grade de 24 px, traço de 2 px.",
    medidas: ["iconSm", "iconTool", "icon", "iconNav", "iconLg"],
  },
  {
    nome: "Marca",
    escala: 1,
    nota: "A chave, a cerquilha e o asterisco, e a palavra “hub” ao lado da marca.",
    medidas: ["palavraNav", "mark", "markNav", "markCover", "markLg"],
  },
  {
    nome: "Controle",
    escala: 1,
    nota: "Alvo de toque mínimo: 44 px, que é o navItem e o btnRound.",
    medidas: [
      "sliderTrack",
      "toggleKnob",
      "checkbox",
      "sliderKnob",
      "toggleH",
      "controlXs",
      "toggleW",
      "controlSm",
      "control",
      "navItem",
      "btnRound",
      "controlLg",
      "navItemBox",
    ],
  },
  {
    nome: "Avatar e miniatura",
    escala: 1,
    medidas: [
      "avatar",
      "avatarSm",
      "thumb",
      "avatarMd",
      "avatarLg",
      "postThumb",
      "avatarPerfil",
      "mediaThumb",
      "fotoAjuste",
    ],
  },
  {
    nome: "Layout",
    escala: 0.5,
    nota: "Desenhadas a 50%: a maior tem 1120 px e não caberia na página.",
    medidas: [
      "navRail",
      "composeMax",
      "navRailOpen",
      "cover",
      "contextPanel",
      "cabinList",
      "demoPanel",
      "authColumn",
      "demoCard",
      "topicPanel",
      "contentColumn",
      "stageColumn",
    ],
  },
];

const porNome = new Map(sizes.map((s) => [s.name, s]));
const agrupadas = GRUPOS_DE_MEDIDA.flatMap((g) => g.medidas);
const semGrupo = sizes.filter((s) => !agrupadas.includes(s.name)).map((s) => s.name);
const inexistentes = agrupadas.filter((n) => !porNome.has(n));

if (semGrupo.length > 0 || inexistentes.length > 0) {
  console.error(
    [
      semGrupo.length > 0
        ? `Medidas sem grupo em GRUPOS_DE_MEDIDA: ${semGrupo.join(", ")}.\n` +
          "Toda medida aparece no documento agrupada por função. Escolha o grupo dela em scripts/generate-tokens.mts."
        : "",
      inexistentes.length > 0
        ? `GRUPOS_DE_MEDIDA cita medidas que não existem no JSON: ${inexistentes.join(", ")}.`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  process.exit(1);
}

/** Texto de usuário dentro de HTML gerado. Nenhum valor vem da rede, mas o JSON é editável à mão. */
const esc = (texto: string) =>
  texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const permitido: Record<string, string> = {
  "qualquer-texto": "Qualquer texto",
  "texto-grande": "Só texto de 24 px ou mais",
  proibido: "Proibido como texto",
  "nao-e-sinal-unico": "Não pode ser o único sinal de estado",
};

const amostraDoEstilo = (nome: string) => styles.find((s) => s.name === nome)?.sample ?? "Hub";

const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hub — design system</title>
    <!--
      GERADO POR scripts/generate-tokens.mts — NÃO EDITE À MÃO.
      Fonte: ${SOURCE}. Para mudar um valor, mude o JSON e rode \`npm run tokens\`.
      A CI confere com \`npm run tokens:check\`.
    -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
${colors.map((c) => `        --${c.name}: ${c.value};`).join("\n")}
${fundos.map((c) => `        --${c.name}: ${c.value};`).join("\n")}
${spacing.map((s) => `        --${s.name}: ${s.value};`).join("\n")}
${radii.map((r) => `        --${r.name}: ${r.value};`).join("\n")}
        --sans: ${sans};
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        background: var(--surfacePage);
        color: var(--ink);
        font-family: var(--sans);
        font-size: 15px;
        line-height: 22px;
      }
      .pagina {
        max-width: 960px;
        margin: 0 auto;
        padding: var(--space5) var(--space3) var(--space5);
      }
      h1 {
        font-size: 88px;
        line-height: 80px;
        font-weight: 800;
        letter-spacing: -0.04em;
        margin: 0;
      }
      .intro {
        font-size: 18px;
        line-height: 27px;
        max-width: 640px;
        margin: var(--space4) 0 0;
      }
      .fonte {
        color: var(--inkMuted);
        font-size: 13px;
        line-height: 18px;
        margin: var(--space3) 0 0;
      }
      nav {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space2);
        margin: var(--space5) 0 0;
      }
      nav a {
        font-size: 13px;
        line-height: 18px;
        font-weight: 600;
        color: var(--ink);
        text-decoration: none;
        background: var(--paper);
        border: 2px solid var(--ink);
        border-radius: var(--radiusPill);
        padding: 6px 14px;
      }
      nav a:hover {
        background: var(--lavender);
      }
      section {
        margin: var(--space5) 0 0;
        padding: var(--space5) 0 0;
        border-top: 1px solid var(--line);
      }
      h2 {
        font-size: 28px;
        line-height: 32px;
        font-weight: 800;
        letter-spacing: -0.02em;
        margin: 0 0 var(--space2);
      }
      h3 {
        font-size: 13px;
        line-height: 18px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--inkMuted);
        margin: var(--space4) 0 var(--space2);
      }
      .sub {
        color: var(--inkMuted);
        max-width: 640px;
        margin: 0 0 var(--space4);
      }
      .cores {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: var(--space3);
      }
      .cor {
        background: var(--paper);
        border-radius: var(--radiusSm);
        overflow: hidden;
      }
      .amostra {
        height: 72px;
        border-bottom: 1px solid var(--line);
      }
      .cor .texto {
        padding: var(--space3);
      }
      .nome {
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        gap: var(--space2);
      }
      .hex {
        color: var(--inkMuted);
        font-weight: 500;
        font-variant-numeric: tabular-nums;
      }
      .uso {
        color: var(--inkMuted);
        font-size: 13px;
        line-height: 18px;
        margin: var(--space1) 0 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        background: var(--paper);
        border-radius: var(--radiusSm);
        overflow: hidden;
      }
      th,
      td {
        text-align: left;
        padding: var(--space2) var(--space3);
        border-bottom: 1px solid var(--line);
        vertical-align: middle;
      }
      th {
        font-size: 12px;
        line-height: 16px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--inkMuted);
      }
      tr:last-child td {
        border-bottom: 0;
      }
      .valor {
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .par {
        border-radius: var(--radiusControl);
        padding: 6px 10px;
        display: inline-block;
        white-space: nowrap;
      }
      .estilo {
        background: var(--paper);
        border-radius: var(--radiusSm);
        padding: var(--space3);
        margin: 0 0 var(--space2);
      }
      .ficha {
        color: var(--inkMuted);
        font-size: 12px;
        line-height: 16px;
        font-weight: 500;
        margin: 0 0 var(--space2);
        font-variant-numeric: tabular-nums;
      }
      .escala {
        background: var(--paper);
        border-radius: var(--radiusSm);
        padding: var(--space3);
      }
      .linha {
        display: grid;
        grid-template-columns: 152px 1fr;
        gap: var(--space3);
        align-items: center;
        padding: var(--space2) 0;
        border-bottom: 1px solid var(--line);
      }
      .linha:last-child {
        border-bottom: 0;
      }
      .rotulo {
        font-weight: 600;
        font-size: 13px;
        line-height: 18px;
      }
      .rotulo span {
        display: block;
        color: var(--inkMuted);
        font-weight: 500;
        font-variant-numeric: tabular-nums;
      }
      .barra {
        height: 12px;
        background: var(--lavender);
        border-radius: var(--radiusControl);
      }
      .medida .uso {
        margin: var(--space1) 0 0;
      }
      .raios {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space3);
      }
      .raio {
        background: var(--paper);
        padding: var(--space3);
        border-radius: var(--radiusSm);
        min-width: 180px;
      }
      .caixa {
        height: 56px;
        background: var(--lavender);
        border: 2px solid var(--ink);
        margin: 0 0 var(--space2);
      }
      footer {
        margin: var(--space5) 0 0;
        padding: var(--space5) 0 0;
        border-top: 1px solid var(--line);
        color: var(--inkMuted);
        font-size: 13px;
        line-height: 18px;
      }
      code {
        font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-size: 0.92em;
      }
    </style>
  </head>
  <body>
    <div class="pagina">
      <header>
        <h1>Hub</h1>
        <p class="intro">
          O design system do Hub: ${colors.length + fundos.length} cores, ${styles.length} estilos de
          texto, ${spacing.length} espaçamentos, ${radii.length} raios e ${sizes.length} medidas de
          controle e de layout. Tudo o que está aqui é o que o app usa — não há valor de exemplo.
        </p>
        <p class="fonte">
          Gerado de <code>${SOURCE}</code> por <code>npm run tokens</code>. Para mudar um valor, mude
          o JSON: este arquivo é reescrito e a integração reprova se os dois divergirem. A prova viva
          é a tela <code>/design</code> do Hub, que roda os componentes de verdade. O livro da marca
          está em <code>docs/design-system/README.md</code>.
        </p>
        <nav>
          <a href="#cores">Cores</a>
          <a href="#perfil">Fundos de perfil</a>
          <a href="#contraste">Contraste</a>
          <a href="#tipografia">Tipografia</a>
          <a href="#espacamento">Espaçamento</a>
          <a href="#raio">Raio</a>
          <a href="#medidas">Medidas</a>
        </nav>
      </header>

      <section id="cores">
        <h2>Cores</h2>
        <p class="sub">
          ${colors.length} cores, e cada nível da hierarquia tem a sua, fixa em toda a rede:
          comunidade é <code>lavender</code>, tópico é <code>ink</code>, e a marca do Hub é
          <code>sun</code>. Nenhum hex é escrito à mão no código.
        </p>
        <div class="cores">
${colors
  .map(
    (c) => `          <article class="cor">
            <div class="amostra" style="background: var(--${c.name})"></div>
            <div class="texto">
              <p class="nome"><span>${c.name}</span><span class="hex">${c.value}</span></p>
              <p class="uso">${esc(c.usage)}</p>
            </div>
          </article>`,
  )
  .join("\n")}
        </div>
      </section>

      <section id="perfil">
        <h2>Fundos de perfil</h2>
        <p class="sub">
          ${esc(tokens.fundoDePerfil.nota ?? "")}
        </p>
        <div class="cores">
${fundos
  .map(
    (c) => `          <article class="cor">
            <div class="amostra" style="background: var(--${c.name})"></div>
            <div class="texto">
              <p class="nome"><span>${c.name}</span><span class="hex">${c.value}</span></p>
              <p class="uso">${esc(c.usage)}</p>
            </div>
          </article>`,
  )
  .join("\n")}
        </div>
      </section>

      <section id="contraste">
        <h2>Contraste</h2>
        <p class="sub">
          Os ${pares.length} pares permitidos, pela fórmula de luminância relativa do WCAG 2. A
          amostra ao lado é o par de verdade: o texto está na cor da frente, sobre a cor de fundo.
          <code>design/contrast.test.ts</code> mede cada um e reprova se o valor publicado divergir.
        </p>
        <table>
          <thead>
            <tr>
              <th>Par</th>
              <th>Amostra</th>
              <th>Contraste</th>
              <th>Uso permitido</th>
            </tr>
          </thead>
          <tbody>
${pares
  .map(
    (p) => `            <tr>
              <td><code>${p.foreground}</code> sobre <code>${p.background}</code></td>
              <td>
                <span
                  class="par"
                  style="background: var(--${p.background}); color: var(--${p.foreground})"
                  >${p.usage === "texto-grande" ? '<span style="font-size: 24px; line-height: 28px">Hub</span>' : "Hub"}</span
                >
              </td>
              <td class="valor">${p.expected.toFixed(1).replace(".", ",")}:1</td>
              <td>${permitido[p.usage] ?? p.usage}</td>
            </tr>`,
  )
  .join("\n")}
          </tbody>
        </table>
      </section>

      <section id="tipografia">
        <h2>Tipografia</h2>
        <p class="sub">
          Uma família só, Bricolage Grotesque, pelo Google Fonts. ${styles.length} estilos, cada um
          desenhado abaixo no tamanho real. Sem rede, a página cai na fonte do sistema e os tamanhos
          continuam certos.
        </p>
${tokens.type.groups
  .map(
    (grupo) => `        <h3>${esc(grupo.name)}</h3>
${grupo.styles
  .map(
    (s) => `        <article class="estilo">
          <p class="ficha">
            ${s.name} · ${s.fontSize}/${s.lineHeight} · peso ${s.fontWeight}${s.letterSpacing ? ` · entreletra ${s.letterSpacing}` : ""}
          </p>
          <p
            style="
              margin: 0;
              font-size: ${s.fontSize};
              line-height: ${s.lineHeight};
              font-weight: ${s.fontWeight};${s.letterSpacing ? `\n              letter-spacing: ${s.letterSpacing};` : ""}
            "
          >
            ${esc(amostraDoEstilo(s.name))}
          </p>
          <p class="uso">${esc(s.usage)}</p>
        </article>`,
  )
  .join("\n")}`,
  )
  .join("\n")}
      </section>

      <section id="espacamento">
        <h2>Espaçamento</h2>
        <p class="sub">Grade de 8 px, desenhada no tamanho real.</p>
        <div class="escala">
${spacing
  .map(
    (s) => `          <div class="linha medida">
            <p class="rotulo">${s.name}<span>${s.value}</span></p>
            <div>
              <div class="barra" style="width: ${s.value}; min-width: 2px"></div>
              <p class="uso">${esc(s.usage)}</p>
            </div>
          </div>`,
  )
  .join("\n")}
        </div>
      </section>

      <section id="raio">
        <h2>Raio</h2>
        <p class="sub">${radii.length} raios, cada um desenhado numa caixa de verdade.</p>
        <div class="raios">
${radii
  .map(
    (r) => `          <article class="raio">
            <div class="caixa" style="border-radius: ${r.value}"></div>
            <p class="nome"><span>${r.name}</span><span class="hex">${r.value}</span></p>
            <p class="uso">${esc(r.usage)}</p>
          </article>`,
  )
  .join("\n")}
        </div>
      </section>

      <section id="medidas">
        <h2>Medidas</h2>
        <p class="sub">
          As ${sizes.length} medidas de controle e de layout, agrupadas como são usadas e desenhadas
          em escala. Elas são metade do sistema e até aqui não apareciam em lugar nenhum. No código
          viram utilitário do Tailwind: <code>size-mark</code>, <code>h-toggleH</code>,
          <code>max-w-contentColumn</code> — não existe pixel escrito à mão.
        </p>
${GRUPOS_DE_MEDIDA.map(
  (g) => `        <h3>${esc(g.nome)}${g.escala === 1 ? "" : ` · escala ${g.escala * 100}%`}</h3>
${g.nota ? `        <p class="sub">${esc(g.nota)}</p>\n` : ""}        <div class="escala">
${g.medidas
  .map((nome) => {
    const medida = porNome.get(nome)!;
    const px = Number.parseFloat(medida.value) * g.escala;
    return `          <div class="linha medida">
            <p class="rotulo">${medida.name}<span>${medida.value}</span></p>
            <div>
              <div class="barra" style="width: ${px}px"></div>
              <p class="uso">${esc(medida.usage)}</p>
            </div>
          </div>`;
  })
  .join("\n")}
        </div>`,
).join("\n")}
      </section>

      <footer>
        <p>
          Hub · design system versão ${tokens.version} · ${colors.length + fundos.length} cores,
          ${styles.length} estilos, ${spacing.length} espaçamentos, ${radii.length} raios,
          ${sizes.length} medidas, ${pares.length} pares de contraste.
        </p>
        <p>
          Os componentes não estão aqui: um HTML estático não roda React, e desenhá-los à mão criaria
          uma segunda verdade que divergiria do código. Eles vivem em <code>/design</code>, que roda
          o código de verdade, e no documento navegável do design system.
        </p>
      </footer>
    </div>
  </body>
</html>
`;

const checkOnly = process.argv.includes("--check");
const stale: string[] = [];

/*
 * Formata com o Prettier do projeto antes de gravar. Sem isso o arquivo gerado
 * sairia diferente do arquivo formatado que está no repositório, e a conferência
 * acusaria diferença a cada rodada.
 */
async function emit(path: string, contents: string, parser: "typescript" | "css" | "html") {
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
await emit("docs/design-system/index.html", html, "html");

if (checkOnly && stale.length > 0) {
  console.error(
    `Os tokens gerados estão desatualizados:\n${stale.map((f) => `  - ${f}`).join("\n")}\n` +
      "Rode `npm run tokens` e inclua o resultado no commit.",
  );
  process.exit(1);
}
console.log(
  `tokens${checkOnly ? " em dia" : ""}: ${colors.length} cores, ${fundos.length} fundos de perfil, ` +
    `${styles.length} estilos de texto, ` +
    `${spacing.length} espaçamentos, ${radii.length} raios, ${sizes.length} medidas, ` +
    `${pares.length} pares de contraste.`,
);
