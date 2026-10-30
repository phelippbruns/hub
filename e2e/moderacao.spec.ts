import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  cadastroConcluido,
  campoDeContribuicao,
  concluirOnboarding,
  preencherNovaComunidade,
  respostaPublicada,
} from "./apoio-tela";

/**
 * Denúncia e moderação (F16).
 *
 * As regras estão em `lib/data/moderacao.db.test.ts`, 35 casos. Aqui fica o
 * laço inteiro pela tela: alguém denuncia, a moderação vê o que foi
 * denunciado, remove, e o autor é avisado do motivo.
 */

function unico(p: string) {
  return `${p}${Date.now() % 100000}${Math.floor(Math.random() * 1000)}`;
}

async function entrarNoApp(page: Page, prefixo: string) {
  const handle = unico("m").slice(0, 20);

  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill(`Pessoa ${unico(prefixo)}`);
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

  return { handle };
}

async function outraSessao(browser: Browser, prefixo: string) {
  const contexto = await browser.newContext();
  const page = await contexto.newPage();
  const { handle } = await entrarNoApp(page, prefixo);
  return { contexto, page, handle };
}

/** Uma comunidade minha, com um tópico aberto. */
async function minhaComunidadeComTopico(page: Page, prefixo: string) {
  await preencherNovaComunidade(page, `${prefixo} ${Date.now()}`);
  await page.waitForURL(/\/c\/[^/]+$/);
  const comunidade = new URL(page.url()).pathname;

  await page.goto(`${comunidade}/novo`);
  await page.getByLabel("Nome").fill("assunto moderado");
  await page.getByLabel("Descrição").fill("Uma pergunta de abertura.");
  await page.getByRole("button", { name: "Criar tópico" }).click();
  await page.waitForURL(/\/assunto-moderado$/);

  return { comunidade, topico: new URL(page.url()).pathname };
}

/** A outra pessoa entra na comunidade e responde. */
async function responderComo(page: Page, comunidade: string, topico: string, texto: string) {
  await page.goto(comunidade);
  await page.getByRole("button", { name: /^Entrar em / }).click();
  await expect(page.getByRole("button", { name: /^Membro de / })).toBeVisible();

  await page.goto(topico);
  await campoDeContribuicao(page).fill(texto);
  await page.getByRole("button", { name: "Responder" }).click();
  await expect(respostaPublicada(page, texto)).toBeVisible();
}

test.describe("o laço da denúncia", () => {
  test("denunciar, a moderação remover e o autor ser avisado", async ({ page, browser }) => {
    await entrarNoApp(page, "moder");
    const outra = await outraSessao(browser, "autora");

    try {
      const { comunidade, topico } = await minhaComunidadeComTopico(page, "Com Moderacao");
      await responderComo(outra.page, comunidade, topico, "compre seguidores no meu perfil");

      // Quem modera denuncia pelo menu da resposta, como qualquer pessoa.
      await page.goto(topico);
      await page.getByRole("button", { name: /^Opções da resposta de / }).click();
      await page.getByRole("link", { name: "Denunciar" }).click();
      await page.waitForURL(/\/denuncia/);

      // O que está sendo denunciado aparece na tela da denúncia.
      await expect(page.getByText("compre seguidores no meu perfil")).toBeVisible();
      await page.getByRole("radio", { name: "Spam ou golpe" }).click();
      await page.getByRole("button", { name: "Enviar denúncia" }).click();

      // E volta para o tópico, não para o Início.
      await page.waitForURL((url) => url.pathname === topico);

      // A fila da moderação mostra o trecho, não só "alguém denunciou".
      await page.goto(`${comunidade}/moderar`);
      await expect(page.getByText("compre seguidores no meu perfil")).toBeVisible();
      await expect(page.getByText(/denunciada por spam/)).toBeVisible();

      await page.getByRole("button", { name: "Remover" }).click();
      await expect(page.getByText("Nenhuma denúncia aberta")).toBeVisible();

      // Sumiu do tópico para quem lê.
      await page.goto(topico);
      await expect(respostaPublicada(page, "compre seguidores")).toHaveCount(0);

      // E o autor foi avisado, com o motivo da categoria.
      await outra.page.goto("/notificacoes");
      await expect(outra.page.getByText(/Sua resposta foi removida de/)).toBeVisible();
      await expect(outra.page.getByText(/spam ou golpe/i)).toBeVisible();
    } finally {
      await outra.contexto.close();
    }
  });

  test("quem não modera recebe 404 em /moderar", async ({ page, browser }) => {
    await entrarNoApp(page, "dono");
    const outra = await outraSessao(browser, "curiosa");

    try {
      const { comunidade } = await minhaComunidadeComTopico(page, "Sem Entrada");

      await outra.page.goto(comunidade);
      await outra.page.getByRole("button", { name: /^Entrar em / }).click();
      await expect(outra.page.getByRole("button", { name: /^Membro de / })).toBeVisible();

      // 404 e não 403: "você não tem permissão" confirmaria que a tela existe.
      const resposta = await outra.page.goto(`${comunidade}/moderar`);
      expect(resposta?.status()).toBe(404);
    } finally {
      await outra.contexto.close();
    }
  });
});

test.describe("membros e moderadores", () => {
  test("removido pode voltar; banido não entra de novo", async ({ page, browser }) => {
    await entrarNoApp(page, "banir");
    const outra = await outraSessao(browser, "banida");

    try {
      const { comunidade } = await minhaComunidadeComTopico(page, "Com Banimento");

      await outra.page.goto(comunidade);
      await outra.page.getByRole("button", { name: /^Entrar em / }).click();
      await expect(outra.page.getByRole("button", { name: /^Membro de / })).toBeVisible();

      await page.goto(`${comunidade}/moderar?aba=membros`);
      await page.getByRole("button", { name: "Remover" }).first().click();
      const confirmacao = page.getByRole("dialog");
      await expect(confirmacao.getByText(/pode entrar de novo/)).toBeVisible();
      await confirmacao.getByRole("button", { name: "Remover", exact: true }).click();
      await expect(confirmacao).toHaveCount(0);

      // Removida: a porta continua aberta.
      await outra.page.goto(comunidade);
      await outra.page.getByRole("button", { name: /^Entrar em / }).click();
      await expect(outra.page.getByRole("button", { name: /^Membro de / })).toBeVisible();

      // Agora banida: a porta fecha.
      await page.goto(`${comunidade}/moderar?aba=membros`);
      await page.getByRole("button", { name: "Remover" }).first().click();
      await page.getByRole("button", { name: "Banir da comunidade" }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);

      await outra.page.goto(comunidade);
      // Nem a porta aparece: oferecer "Entrar" a quem está banido é pedir
      // um clique que só devolve erro.
      await expect(outra.page.getByText("Você não pode entrar nesta comunidade.")).toBeVisible();
      await expect(outra.page.getByRole("button", { name: /^Entrar em / })).toHaveCount(0);
    } finally {
      await outra.contexto.close();
    }
  });

  test("moderador novo só assume depois de aceitar o convite", async ({ page, browser }) => {
    await entrarNoApp(page, "convida");
    const outra = await outraSessao(browser, "convidada");

    try {
      const { comunidade } = await minhaComunidadeComTopico(page, "Com Convite");

      await outra.page.goto(comunidade);
      await outra.page.getByRole("button", { name: /^Entrar em / }).click();
      await expect(outra.page.getByRole("button", { name: /^Membro de / })).toBeVisible();

      await page.goto(`${comunidade}/moderar?aba=moderadores`);
      await page.getByRole("button", { name: "Adicionar moderador" }).click();
      await page.getByLabel("Buscar entre os membros").fill(outra.handle);
      await page.getByRole("button", { name: "Enviar convite" }).click();
      await expect(page.getByText(/vira moderadora ao aceitar/)).toBeVisible();
      // O aviso aparece antes de a ação terminar; o que prova que o convite
      // existe é ele chegar do outro lado.
      await outra.page.goto("/notificacoes");
      await expect(outra.page.getByRole("button", { name: "Aceitar" })).toBeVisible();

      // Convidada, mas ainda sem as ferramentas: a tela não abre.
      const antes = await outra.page.goto(`${comunidade}/moderar`);
      expect(antes?.status()).toBe(404);

      await outra.page.goto("/notificacoes");
      await outra.page.getByRole("button", { name: "Aceitar" }).click();
      // Esperar o cartão do convite sumir, e não só clicar: a ação é
      // assíncrona, e navegar na sequência chega antes de ela terminar. O
      // aviso na lista continua lá — ele é o registro de que aconteceu.
      await expect(outra.page.getByRole("button", { name: "Aceitar" })).toHaveCount(0);

      // Aceitou: agora abre.
      const depois = await outra.page.goto(`${comunidade}/moderar`);
      expect(depois?.status()).toBe(200);
      await expect(outra.page.getByText("Nenhuma denúncia aberta")).toBeVisible();
    } finally {
      await outra.contexto.close();
    }
  });
});

/*
 * A CSP exige nonce em todo script, e as duas telas desta feature rodam com
 * sessão — as abertas são conferidas em `design-system.spec.ts`.
 */
test("todo script de /denuncia e /moderar leva nonce", async ({ page, browser }) => {
  await entrarNoApp(page, "nonce16");
  const outra = await outraSessao(browser, "alvo16");

  try {
    const { comunidade, topico } = await minhaComunidadeComTopico(page, "Com Nonce");
    await responderComo(outra.page, comunidade, topico, "resposta para a denúncia");

    const resposta = await page.goto(topico);
    expect(resposta?.status()).toBe(200);
    await page.getByRole("button", { name: /^Opções da resposta de / }).click();
    await page.getByRole("link", { name: "Denunciar" }).click();
    await page.waitForURL(/\/denuncia/);

    for (const rota of [page.url(), `${comunidade}/moderar`]) {
      await page.goto(rota);

      const semNonce = await page.evaluate(() =>
        [...document.querySelectorAll("script")]
          .filter((script) => !script.hasAttribute("nonce"))
          .map((script) => script.src || "(inline)"),
      );

      expect(semNonce, `scripts sem nonce em ${rota}`).toEqual([]);
    }
  } finally {
    await outra.contexto.close();
  }
});
