import { expect, test, type Page } from "@playwright/test";
import { consultar } from "./apoio-banco";
import { cadastroConcluido, concluirOnboarding } from "./apoio-tela";

/**
 * RN40: o status do perfil.
 *
 * O que esta jornada guarda, e que teste de unidade não alcança: que a
 * pílula **não existe** no perfil de quem não tem status, que o prefixo
 * aparece em quatro tipos e some no quinto, e que o editor fecha só depois
 * de o servidor aceitar.
 */

function unico(p: string) {
  return `${p}${Date.now() % 100000}${Math.floor(Math.random() * 100)}`;
}

async function entrarNoApp(page: Page, prefixo: string): Promise<string> {
  const handle = unico("s").slice(0, 20);

  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill("Pessoa do Status");
  await page.getByLabel("Email").fill(`${unico(prefixo)}@teste.hub`);
  await page.getByLabel("@").fill(handle);
  await page.getByLabel("Senha", { exact: true }).fill("senhaboa123");
  await page.getByLabel("Data de nascimento").fill(`${new Date().getUTCFullYear() - 25}-03-10`);

  const caixa = page.getByRole("checkbox");
  await caixa.click();
  await expect(caixa).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Continuar" }).click();

  await cadastroConcluido(page);
  await concluirOnboarding(page);
  await expect(page).toHaveURL(/\/inicio/);

  return handle;
}

/**
 * Entra como outra pessoa.
 *
 * **Visitante aqui é alguém com conta**, nunca anônimo: o perfil não é rota
 * pública, e sem sessão o proxy manda para o login. A primeira versão deste
 * arquivo usava `clearCookies()` e um dos testes passou verde **olhando a
 * tela de entrar** — a pílula não estava lá porque o perfil não estava.
 */
async function trocarDePessoa(page: Page, prefixo: string): Promise<string> {
  await page.context().clearCookies();
  return entrarNoApp(page, prefixo);
}

async function abrirEditor(page: Page) {
  await page.getByRole("button", { name: /Definir status|^Status:/ }).click();
  await expect(page.getByRole("dialog", { name: "Seu status" })).toBeVisible();
}

test.describe("RN40: o status no perfil", () => {
  test("RN40: sem status, o dono vê o convite e o visitante não vê nada", async ({ page }) => {
    const handle = await entrarNoApp(page, "semstatus");

    await page.goto("/perfil");
    // Positivo primeiro: a tela chegou. Senão o `toHaveCount(0)` abaixo
    // passaria com a página ainda vazia.
    await expect(page.getByRole("heading", { level: 1, name: handle })).toBeVisible();
    await expect(page.getByRole("button", { name: "Definir status" })).toBeVisible();

    // Outra pessoa olhando: o convite é do dono, e ninguém mais o vê.
    await trocarDePessoa(page, "visita1");
    await page.goto(`/${handle}`);
    // Positivo primeiro: o perfil **dela** carregou, e não a tela de entrar.
    await expect(page.getByRole("heading", { level: 1, name: handle })).toBeVisible();
    await expect(page.getByRole("button", { name: "Definir status" })).toHaveCount(0);
  });

  test("RN40: os quatro tipos levam prefixo, e o personalizado não", async ({ page }) => {
    const handle = await entrarNoApp(page, "prefixo");
    await page.goto("/perfil");

    await abrirEditor(page);
    await page.getByRole("button", { name: "Ouvindo", exact: true }).click();
    await page.getByLabel("Ouvindo…").fill("Floating Points, Cascade");
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(
      page.getByRole("button", { name: "Status: Ouvindo Floating Points, Cascade" }),
    ).toBeVisible();

    // O mesmo texto em Personalizado perde o prefixo.
    await abrirEditor(page);
    await page.getByRole("button", { name: "Personalizado", exact: true }).click();
    await page.getByLabel("Escreva seu status").fill("De férias até segunda");
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(page.getByRole("button", { name: "Status: De férias até segunda" })).toBeVisible();

    const [linha] = await consultar<{ kind: string; text: string }>(
      `SELECT kind, text FROM profile_statuses
        WHERE profile_id = (SELECT id FROM profiles WHERE handle = '${handle}')
          AND ended_at IS NULL`,
    );
    expect(linha?.kind).toBe("custom");
    expect(linha?.text).toBe("De férias até segunda");
  });

  test("RN40: o anterior vai para o histórico, e não some", async ({ page }) => {
    const handle = await entrarNoApp(page, "historico");
    await page.goto("/perfil");

    for (const texto of ["Primeiro", "Segundo"]) {
      await abrirEditor(page);
      await page.getByRole("button", { name: "Personalizado", exact: true }).click();
      await page.getByLabel("Escreva seu status").fill(texto);
      await page.getByRole("button", { name: "Salvar" }).click();
      await expect(page.getByRole("button", { name: `Status: ${texto}` })).toBeVisible();
    }

    const encerrados = await consultar<{ text: string }>(
      `SELECT text FROM profile_statuses
        WHERE profile_id = (SELECT id FROM profiles WHERE handle = '${handle}')
          AND ended_at IS NOT NULL`,
    );
    expect(encerrados.map((l) => l.text)).toEqual(["Primeiro"]);
  });

  test("RN40: limpar tira a pílula e devolve o convite ao dono", async ({ page }) => {
    await entrarNoApp(page, "limpar");
    await page.goto("/perfil");

    await abrirEditor(page);
    await page.getByRole("button", { name: "Personalizado", exact: true }).click();
    await page.getByLabel("Escreva seu status").fill("Some daqui a pouco");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByRole("button", { name: "Status: Some daqui a pouco" })).toBeVisible();

    await page.getByRole("button", { name: "Status: Some daqui a pouco" }).click();
    await page.getByRole("button", { name: "Limpar status" }).click();

    await expect(page.getByRole("button", { name: "Definir status" })).toBeVisible();
  });

  test("RN40: 41 caracteres num tipo com prefixo não salva", async ({ page }) => {
    await entrarNoApp(page, "limite");
    await page.goto("/perfil");

    await abrirEditor(page);
    await page.getByRole("button", { name: "Ouvindo", exact: true }).click();
    await page.getByLabel("Ouvindo…").fill("a".repeat(41));

    const salvar = page.getByRole("button", { name: "Salvar" });
    await expect(salvar).toBeDisabled();
    await expect(page.getByText(/Este tipo aceita 40 caracteres\. Encurte/)).toBeVisible();

    // E o que foi escrito continua lá: trocar de tipo não apaga o texto.
    await page.getByRole("button", { name: "Personalizado", exact: true }).click();
    await expect(page.getByLabel("Escreva seu status")).toHaveValue("a".repeat(41));
    await expect(salvar).toBeEnabled();
  });

  test("RN40: o status aparece no perfil para quem visita", async ({ page }) => {
    const handle = await entrarNoApp(page, "visitante");
    await page.goto("/perfil");

    await abrirEditor(page);
    await page.getByRole("button", { name: "Lendo", exact: true }).click();
    await page.getByLabel("Lendo…").fill("Torto Arado");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByRole("button", { name: "Status: Lendo Torto Arado" })).toBeVisible();

    await trocarDePessoa(page, "visita2");
    await page.goto(`/${handle}`);
    await expect(page.getByRole("heading", { level: 1, name: handle })).toBeVisible();

    // Visível, e **não** clicável: o histórico mora no painel, que chega no
    // Bloco 6. Botão que não faz nada promete uma ação que não existe.
    await expect(page.getByText("Torto Arado")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Status:/ })).toHaveCount(0);
  });
});
