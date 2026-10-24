import { expect, test } from "@playwright/test";

/**
 * A tela /design é a conferência visual do design system.
 *
 * Estes testes guardam o que um snapshot de HTML não pega: que a página de fato
 * roda no navegador, sob a Content-Security-Policy real.
 */

test("a galeria carrega sem violar a Content-Security-Policy", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });
  page.on("pageerror", (error) => problems.push(String(error)));

  await page.goto("/design", { waitUntil: "networkidle" });

  expect(problems).toEqual([]);
});

/**
 * A CSP exige nonce nos scripts, e o Next só consegue injetá-lo quando a rota
 * renderiza por requisição. Numa rota estática os scripts saem sem nonce e o
 * navegador bloqueia tudo — sem erro no build, sem teste vermelho.
 *
 * Por isso o layout raiz marca todas as rotas como dinâmicas. Este teste varre
 * as rotas e falha se alguma voltar a sair sem nonce.
 *
 * Aqui só entram as rotas abertas. As autenticadas são conferidas em
 * `comunidades.spec.ts`, que já tem sessão — inclusive a página da
 * comunidade, a primeira com rota paralela.
 */
for (const rota of ["/", "/design"]) {
  test(`todo script de ${rota} leva nonce`, async ({ page }) => {
    await page.goto(rota);

    const semNonce = await page.evaluate(() =>
      [...document.querySelectorAll("script")]
        .filter((script) => !script.hasAttribute("nonce"))
        .map((script) => script.src || "(inline)"),
    );

    expect(semNonce).toEqual([]);
  });
}

/**
 * Utilitário sem token correspondente é **descartado em silêncio**.
 *
 * `design/tokens.css` apaga a escala padrão do Tailwind com `--spacing-*:
 * initial` para que `p-7` não exista. O efeito colateral: `inset-0` também
 * deixou de existir, porque ele se resolve a partir da mesma base. Um véu de
 * contraste com `absolute inset-0` ficou com 0 × 0 e o texto branco foi parar
 * sobre lavanda pura — sem erro de build, sem aviso do lint, sem teste
 * vermelho. Só olhando a tela.
 *
 * Existe um token `space0` por causa disso. Este teste é a barreira.
 */
test("os utilitários de zero valem zero, e não nada", async ({ page }) => {
  await page.goto("/design");

  const medidas = await page.evaluate(() => {
    const alvo = document.createElement("div");
    document.body.append(alvo);

    const ler = (classe: string, propriedade: string) => {
      alvo.className = classe;
      return getComputedStyle(alvo).getPropertyValue(propriedade);
    };

    const resultado = {
      "inset-0": ler("absolute inset-0", "top"),
      "gap-0": ler("flex gap-0", "gap"),
      "w-0": ler("w-0", "width"),
      "p-0": ler("p-0", "padding-top"),
      "min-w-0": ler("min-w-0", "min-width"),
    };

    alvo.remove();
    return resultado;
  });

  expect(medidas).toEqual({
    "inset-0": "0px",
    "gap-0": "0px",
    "w-0": "0px",
    "p-0": "0px",
    "min-w-0": "0px",
  });
});

test("a galeria hidrata: o chip responde ao clique", async ({ page }) => {
  await page.goto("/design");

  const chip = page.getByRole("button", { name: "Música", exact: true }).first();
  await expect(chip).toHaveAttribute("aria-pressed", "true");

  await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "false");
});

test("cada máscara de ícone ativo tem id próprio", async ({ page }) => {
  await page.goto("/design");

  // Id repetido faria um ícone usar a máscara do outro.
  const masks = await page.evaluate(() => {
    const ids = [...document.querySelectorAll("mask")].map((mask) => mask.id);
    return { total: ids.length, unicos: new Set(ids).size };
  });

  expect(masks.total).toBeGreaterThan(0);
  expect(masks.unicos).toBe(masks.total);
});

test("Bricolage Grotesque é servida do próprio domínio", async ({ page }) => {
  const externas: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname.endsWith("gstatic.com") || url.hostname.endsWith("googleapis.com")) {
      externas.push(request.url());
    }
  });

  await page.goto("/design", { waitUntil: "networkidle" });

  const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(family).toContain("Bricolage Grotesque");
  // next/font baixa a fonte no build: nenhuma requisição ao Google em runtime.
  expect(externas).toEqual([]);
});

test("ícone sem texto tem rótulo de acessibilidade", async ({ page }) => {
  await page.goto("/design");

  // O botão de ícone da galeria não tem texto visível.
  await expect(page.getByRole("button", { name: "Criar tópico" }).first()).toBeVisible();
  // A marca # da comunidade diz o que faz e em que estado está.
  await expect(page.getByRole("button", { name: "Entrar na comunidade" }).first()).toBeVisible();
});

/*
 * As marcas da abertura se inclinam sozinhas (tela 1).
 *
 * O movimento é CSS puro, então o que dá para provar é o que o navegador
 * calculou: que há animação, que são três animações diferentes, e que elas
 * somem quando o sistema pede menos movimento.
 */
test.describe("as marcas da abertura", () => {
  const MARCAS = ["hub-marca-balanca-1", "hub-marca-balanca-2", "hub-marca-balanca-3"];

  test("as três se movem, cada uma com o seu tempo", async ({ page }) => {
    await page.goto("/");

    const nomes: string[] = [];
    for (const classe of MARCAS) {
      const marca = page.locator(`.${classe}`);
      await expect(marca).toHaveCount(1);
      nomes.push(await marca.evaluate((el) => getComputedStyle(el).animationName));
    }

    // Três animações distintas: é o que faz a inclinação virar onda em vez
    // de as três marcas pularem juntas.
    expect(new Set(nomes).size).toBe(3);
    expect(nomes.every((nome) => nome !== "none")).toBe(true);
  });

  test("com movimento reduzido, nenhuma se move", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    for (const classe of MARCAS) {
      await expect(page.locator(`.${classe}`)).toHaveCSS("animation-name", "none");
    }
  });

  /**
   * A chave é desenho, e por isso o centro é exato.
   *
   * Era a letra `{` da fonte, e a posição de uma letra dentro da linha vem
   * das métricas que **cada sistema** lê do arquivo: a mesma Bricolage
   * punha a chave 1,17 px abaixo do centro no macOS e perto de 1,9 px no
   * Linux. O ajuste em `em` era um só, zerava num e deixava 0,7 px no
   * outro — por isso este teste tinha 1 px de folga, e por isso a chave
   * apareceu torta três vezes mesmo com ele verde.
   *
   * Desenhada, não há métrica de fonte no caminho: a tinta vai de 6,5 a
   * 17,5 na horizontal e de 2 a 22 na vertical, as duas centradas em 12 da
   * grade de 24. A folga cai para um quarto de pixel, que é só o
   * arredondamento do navegador.
   */
  test("a chave fica centrada no quadrado", async ({ page }) => {
    await page.goto("/");

    const desvio = await page.locator(".hub-marca-balanca-1").evaluate((marca) => {
      const quadrado = marca.getBoundingClientRect();
      const desenho = marca.querySelector("svg")!.getBoundingClientRect();

      return {
        horizontal: (desenho.left + desenho.right) / 2 - (quadrado.left + quadrado.right) / 2,
        vertical: (desenho.top + desenho.bottom) / 2 - (quadrado.top + quadrado.bottom) / 2,
      };
    });

    expect(Math.abs(desvio.horizontal), "a chave está fora do centro na horizontal").toBeLessThan(
      0.25,
    );
    expect(Math.abs(desvio.vertical), "a chave está fora do centro na vertical").toBeLessThan(0.25);
  });
});

/**
 * A espessura da borda diz o que o elemento é.
 *
 * **Campo é moldura de conteúdo**, e leva 1 px: foi a queixa do PO, e a
 * Cabine já era assim. **Botão, chip e marca levam 2 px**, porque ali a
 * borda não contorna nada — ela é o corpo. O botão secundário *é* a
 * borda, e afiná-la o deixa frágil ao lado do primário, que é cheio.
 */
test("campo tem borda fina; botão continua com a grossa", async ({ page }) => {
  await page.goto("/entrar");

  const campo = page.getByLabel("Email");
  await expect(campo).toHaveCSS("border-top-width", "1px");

  const botao = page.getByRole("button", { name: "Entrar" });
  await expect(botao).toHaveCSS("border-top-width", "2px");
});
