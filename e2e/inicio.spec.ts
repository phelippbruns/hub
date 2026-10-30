import { expect, test, type Page } from "@playwright/test";
import { consultar, esperarNoBanco } from "./apoio-banco";
import {
  cadastroConcluido,
  campoDeContribuicao,
  concluirOnboarding,
  preencherNovaComunidade,
} from "./apoio-tela";

/**
 * Meio-dia de ontem **no fuso do ciclo**, como instante.
 *
 * Nada de "now() menos 20 horas": depois das 20h de Brasília, vinte horas
 * atrás ainda é hoje, o ciclo elegia o dia errado e o Início não mostrava
 * destaque nenhum. A CI pegou às 20h01, num PR que só mexia em documento.
 * A mesma correção está em `e2e/ciclo.spec.ts`.
 */
const ONTEM_AO_MEIO_DIA = `((hub_cycle_date(now()) - 1) + time '12:00') AT TIME ZONE hub_cycle_timezone()`;

/**
 * O Início (F11).
 *
 * Os limites de cada seção têm 17 testes contra o banco em
 * `lib/data/inicio.db.test.ts`. Aqui é a tela: a ordem das seções, o fim da
 * lista e o estado vazio.
 */

function unico(p: string) {
  return `${p}${Date.now() % 100000}${Math.floor(Math.random() * 100)}`;
}

/** Cria conta e para no onboarding, antes de escolher comunidades. */
async function criarConta(page: Page, prefixo: string) {
  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill("Pessoa do Início");
  await page.getByLabel("Email").fill(`${unico(prefixo)}@teste.hub`);
  await page.getByLabel("@").fill(unico("ini").slice(0, 20));
  await page.getByLabel("Senha", { exact: true }).fill("senhaboa123");
  await page.getByLabel("Data de nascimento").fill(`${new Date().getUTCFullYear() - 25}-03-10`);

  const caixa = page.getByRole("checkbox");
  await caixa.click();
  await expect(caixa).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Continuar" }).click();
  await cadastroConcluido(page);
}

async function entrarNoApp(page: Page, prefixo: string) {
  await criarConta(page, prefixo);
  await concluirOnboarding(page);
  await expect(page).toHaveURL(/\/inicio/);
}

test.describe("o Início termina", () => {
  test("sempre acaba em Você está em dia", async ({ page }) => {
    await entrarNoApp(page, "termina");

    // Princípio 3: a lista termina. Mesmo sem nada para mostrar.
    await expect(page.getByText("Você está em dia.")).toBeVisible();
  });

  test("o título é Hoje, e o item da navegação é Início", async ({ page }) => {
    await entrarNoApp(page, "titulo");

    await expect(page.getByRole("heading", { name: "Hoje", level: 1 })).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Navegação principal" })
        .getByRole("link", { name: "Início", exact: true }),
    ).toBeVisible();
  });
});

test.describe("sem comunidade nenhuma", () => {
  test("mostra o estado vazio com sugestões e o botão Explorar", async ({ page }) => {
    await entrarNoApp(page, "vazio");

    /*
     * Tirar as três comunidades do onboarding direto no banco: sair pela
     * tela é jornada da F07 e já tem teste lá. Aqui o assunto é o que o
     * Início mostra para quem não acompanha nada.
     */
    await consultar(`
      DELETE FROM memberships
       WHERE profile_id = (
         SELECT id FROM profiles WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 1
       )`);

    await page.goto("/inicio");

    await expect(page.getByText("Suas comunidades aparecem aqui")).toBeVisible();
    await expect(page.getByText(/Entre em comunidades para acompanhar/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Explorar comunidades" })).toBeVisible();

    // E o estado vazio não termina em "Você está em dia": não há o que estar
    // em dia quando não se acompanha nada.
    await expect(page.getByText("Você está em dia.")).toHaveCount(0);
  });
});

test.describe("com conteúdo", () => {
  /** Uma comunidade minha, um tópico, e o ciclo virado em cima dele. */
  async function cenarioComDestaque(page: Page) {
    await preencherNovaComunidade(page, `Início ${Date.now()}`, "Comunidade do teste do Início.");
    await page.waitForURL(/\/c\/[^/]+$/);
    const comunidade = new URL(page.url()).pathname;

    await page.goto(`${comunidade}/novo`);
    await page.getByLabel("Nome").fill("assunto do inicio");
    await page.getByLabel("Descrição").fill("A pergunta que vai virar destaque.");
    await page.getByRole("button", { name: "Criar tópico" }).click();
    await page.waitForURL(/\/assunto-do-inicio$/);

    await consultar(`
      WITH alvo AS (
        SELECT id FROM topics WHERE slug = 'assunto-do-inicio' ORDER BY created_at DESC LIMIT 1
      ), gente AS (SELECT id FROM profiles WHERE deleted_at IS NULL LIMIT 3)
      INSERT INTO answers (id, topic_id, author_id, text, created_at)
      SELECT gen_random_uuid(), alvo.id, gente.id, 'resposta de ontem', ${ONTEM_AO_MEIO_DIA}
        FROM alvo, gente`);
    await consultar(`SELECT hub_virar_ciclo(hub_cycle_date(now()) - 1)`);

    return comunidade;
  }

  test("o Hot Topic aparece no topo e leva ao tópico", async ({ page }) => {
    await entrarNoApp(page, "destaque");
    await cenarioComDestaque(page);

    await page.goto("/inicio");

    await expect(page.getByRole("heading", { name: "Hot Topics" })).toBeVisible();
    await expect(page.getByText("A pergunta que vai virar destaque.")).toBeVisible();

    await page.getByRole("link", { name: "Responder" }).click();
    await page.waitForURL(/\/assunto-do-inicio$/);
  });

  test("abrir o tópico zera as novas", async ({ page }) => {
    await entrarNoApp(page, "zera");
    const comunidade = await cenarioComDestaque(page);

    await page.goto(`${comunidade}/assunto-do-inicio`);
    await page.getByRole("button", { name: /^Seguir o tópico/ }).click();
    await expect(page.getByRole("button", { name: /^Seguindo o tópico/ })).toBeVisible();

    await esperarNoBanco(`
      SELECT 1 FROM follows f JOIN topics t ON t.id = f.topic_id
       WHERE t.slug = 'assunto-do-inicio' AND f.target = 'topic'`);

    /*
     * Sair da página do tópico antes de a resposta chegar: enquanto a
     * pessoa está lá, cada carregamento marca o tópico como visto, e a
     * resposta nasceria já lida.
     */
    await page.goto("/inicio");

    // Uma resposta nova chega depois de a pessoa ter seguido.
    await consultar(`
      WITH alvo AS (
        SELECT id FROM topics WHERE slug = 'assunto-do-inicio' ORDER BY created_at DESC LIMIT 1
      ), quem AS (
        -- Outra pessoa, de propósito: a própria resposta nunca é novidade
        -- para quem a escreveu.
        SELECT p.id FROM profiles p, alvo
         WHERE p.deleted_at IS NULL
           AND p.id <> (SELECT author_id FROM topics WHERE id = alvo.id)
         LIMIT 1
      )
      INSERT INTO answers (id, topic_id, author_id, text, created_at)
      SELECT gen_random_uuid(), alvo.id, quem.id, 'chegou agora', now() FROM alvo, quem`);

    await page.reload();
    await expect(page.getByText("1 nova")).toBeVisible();

    // Abrir o tópico é o que zera: é o que a palavra "nova" promete.
    await page.goto(`${comunidade}/assunto-do-inicio`);
    await page.goto("/inicio");
    await expect(page.getByText("1 nova")).toHaveCount(0);
  });

  test("suas últimas interações mostram o que veio depois da sua", async ({ page }) => {
    await entrarNoApp(page, "depois");
    const comunidade = await cenarioComDestaque(page);

    await page.goto(`${comunidade}/assunto-do-inicio`);
    await campoDeContribuicao(page).fill("minha resposta");
    await page.getByRole("button", { name: "Responder" }).click();
    await expect(page.locator("article").filter({ hasText: "minha resposta" })).toBeVisible();

    await consultar(`
      WITH alvo AS (
        SELECT id FROM topics WHERE slug = 'assunto-do-inicio' ORDER BY created_at DESC LIMIT 1
      ), gente AS (SELECT id FROM profiles WHERE deleted_at IS NULL LIMIT 2)
      INSERT INTO answers (id, topic_id, author_id, text, created_at)
      SELECT gen_random_uuid(), alvo.id, gente.id, 'veio depois', now() + interval '1 second'
        FROM alvo, gente`);

    await page.goto("/inicio");
    await expect(page.getByRole("heading", { name: "Suas últimas interações" })).toBeVisible();
    await expect(page.getByText(/2 depois da sua/)).toBeVisible();
  });
});

test.describe("o sino", () => {
  test("ganha o ponto quando há notificação não lida", async ({ page }) => {
    await entrarNoApp(page, "sino");

    const sino = page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Notificações", exact: true });

    await expect(sino.getByText("Há novidade")).toHaveCount(0);

    await consultar(`
      INSERT INTO notifications (id, profile_id, kind, payload)
      SELECT gen_random_uuid(), p.id, 'topic_became_hot', '{}'::jsonb
        FROM profiles p WHERE p.deleted_at IS NULL ORDER BY p.created_at DESC LIMIT 1`);

    await page.reload();
    await expect(sino.getByRole("status")).toBeVisible();
  });
});
