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
 * Este teste torna essa falha barulhenta: toda tag <script> da página precisa
 * ter nonce.
 */
test("todo script da página leva nonce", async ({ page }) => {
  await page.goto("/design");

  const semNonce = await page.evaluate(() =>
    [...document.querySelectorAll("script")]
      .filter((script) => !script.hasAttribute("nonce"))
      .map((script) => script.src || "(inline)"),
  );

  expect(semNonce).toEqual([]);
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
