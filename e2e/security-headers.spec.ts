import { expect, test } from "@playwright/test";

/**
 * Regra de segurança 6: toda resposta sai com os cabeçalhos de segurança.
 * Critério de aceite da F00: "a página responde com os cabeçalhos de segurança".
 */
test("a página inicial responde com os cabeçalhos de segurança", async ({ page }) => {
  const response = await page.goto("/");
  expect(response).not.toBeNull();

  const headers = response!.headers();

  expect(headers["strict-transport-security"]).toBe("max-age=63072000; includeSubDomains; preload");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["permissions-policy"]).toContain("camera=()");

  const csp = headers["content-security-policy"];
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  // O nonce muda a cada requisição; aqui basta confirmar que existe um.
  expect(csp).toMatch(/script-src [^;]*'nonce-[a-f0-9]+'/);
});

test("a página inicial abre sem erro", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main")).toBeAttached();
});
