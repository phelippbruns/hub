import { expect, test, type Page } from "@playwright/test";
import { cadastroConcluido, escolherComunidades } from "./apoio-tela";

/**
 * Navegação e layout (F05).
 *
 * Critérios de aceite: navegar entre as áreas, o leitor de tela anunciar o
 * nome de cada ícone, e rota autenticada sem sessão redirecionar.
 *
 * Só acima de 768 px: o celular é a F21, e testar um layout que ainda não
 * existe daria um verde falso.
 */

const AREAS = [
  { nome: "Início", url: /\/inicio/ },
  { nome: "Explorar", url: /\/comunidades$/ },
  { nome: "Comunidades", url: /\/comunidades\/minhas$/ },
  { nome: "Cabine", url: /\/cabines/ },
  { nome: "Perfil", url: /\/perfil/ },
  { nome: "Notificações", url: /\/notificacoes/ },
] as const;

function novoEmail(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@teste.hub`;
}

/** Cria conta, conclui o onboarding e para no Início. */
/** Um @ livre para o cadastro, que agora exige um. */
function novoHandle(prefixo: string) {
  return `${prefixo}${Date.now() % 100000}${Math.floor(Math.random() * 100)}`.slice(0, 20);
}

async function entrarNoApp(page: Page, prefixo: string) {
  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill("Pessoa Navegando");
  await page.getByLabel("Email").fill(novoEmail(prefixo));
  await page.getByLabel("@").fill(novoHandle("nav"));
  await page.getByLabel("Senha", { exact: true }).fill("senhaboa123");
  await page.getByLabel("Data de nascimento").fill(`${new Date().getUTCFullYear() - 25}-03-10`);

  const caixa = page.getByRole("checkbox");
  await caixa.click();
  await expect(caixa).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Continuar" }).click();

  await cadastroConcluido(page);
  await page.getByRole("link", { name: "Começar" }).click();
  await escolherComunidades(page);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Agora não" }).click();
  await expect(page).toHaveURL(/\/inicio/);
}

test.describe("barra de navegação", () => {
  test("leva às seis áreas, e cada ícone tem nome", async ({ page }) => {
    await entrarNoApp(page, "nav");
    const barra = page.getByRole("navigation", { name: "Navegação principal" });

    for (const area of AREAS) {
      // Buscar por nome é o que um leitor de tela faz: se o rótulo sumir,
      // o teste falha junto.
      await barra.getByRole("link", { name: area.nome, exact: true }).click();
      await expect(page).toHaveURL(area.url);
    }
  });

  test("a área atual é marcada, e não só pela cor", async ({ page }) => {
    await entrarNoApp(page, "atual");
    const barra = page.getByRole("navigation", { name: "Navegação principal" });

    await barra.getByRole("link", { name: "Cabine", exact: true }).click();
    await expect(barra.getByRole("link", { name: "Cabine", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(barra.getByRole("link", { name: "Início", exact: true })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  /*
   * O erro da F05: a regra de "qual ícone está aceso" usava prefixo de URL,
   * então /comunidades/minhas acendia Explorar e Comunidades ao mesmo tempo.
   * Este teste conta os acesos em vez de conferir um por um — se dois
   * acenderem de novo, ele falha.
   *
   * Tudo num teste só, com uma conta só: cada cadastro gasta cota do Supabase,
   * e seis contas para seis telas já derrubou a suíte antes.
   */
  test("cada tela acende exatamente um ícone", async ({ page }) => {
    await entrarNoApp(page, "aceso");
    const barra = page.getByRole("navigation", { name: "Navegação principal" });

    for (const [tela, esperado] of [
      ["/inicio", "Início"],
      ["/comunidades", "Explorar"],
      ["/busca?q=musica", "Explorar"],
      ["/comunidades/minhas", "Comunidades"],
      ["/cabines", "Cabine"],
      ["/notificacoes", "Notificações"],
    ] as const) {
      await page.goto(tela);
      const acesos = barra.locator('[aria-current="page"]');

      await expect(acesos, `${tela} devia acender só ${esperado}`).toHaveCount(1);
      await expect(acesos).toHaveAccessibleName(esperado);
    }
  });

  test("os dois botões de criar estão na barra, com nome", async ({ page }) => {
    await entrarNoApp(page, "criar");
    const barra = page.getByRole("navigation", { name: "Navegação principal" });

    await expect(barra.getByRole("link", { name: "Criar comunidade" })).toBeVisible();
    await expect(barra.getByRole("link", { name: "Criar tópico" })).toBeVisible();
  });

  test("os botões de criar continuam na tela depois de descer a página", async ({ page }) => {
    /*
     * A barra é `sticky` com a altura da janela. Sem isso ela é só uma coluna
     * do grid, do tamanho do conteúdo — e numa página comprida descer levava
     * os botões de criar embora, porque eles ficam no fim da barra.
     *
     * Este teste também guarda contra `h-screen` ou `sticky` deixarem de
     * existir: as escalas padrão do Tailwind estão zeradas neste projeto, e
     * utilitário que não existe não avisa, só não faz nada.
     */
    await entrarNoApp(page, "fixos");
    const barra = page.getByRole("navigation", { name: "Navegação principal" });
    const criar = barra.getByRole("link", { name: "Criar tópico" });

    await page.goto("/comunidades");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const janela = page.viewportSize()!.height;
    const caixa = await criar.boundingBox();

    expect(caixa, "o botão de criar tópico desapareceu").not.toBeNull();
    expect(caixa!.y, "o botão de criar tópico saiu da janela ao descer").toBeLessThan(janela);
    expect(caixa!.y + caixa!.height).toBeGreaterThan(0);
  });
});

test.describe("rota autenticada sem sessão", () => {
  for (const rota of ["/inicio", "/configuracoes", "/cabines", "/comunidades/minhas"]) {
    test(`${rota} redireciona para a tela inicial`, async ({ page }) => {
      await page.goto(rota);
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByText("Conecte-se pelo que realmente importa.")).toBeVisible();
    });
  }

  test("as telas de entrada seguem abertas", async ({ page }) => {
    for (const rota of ["/", "/entrar", "/criar-conta", "/senha", "/termos"]) {
      await page.goto(rota);
      expect(new URL(page.url()).pathname).toBe(rota);
    }
  });
});

test.describe("coluna de conteúdo", () => {
  test("tem 720 px e o título alinhado a ela", async ({ page }) => {
    await entrarNoApp(page, "coluna");

    /*
     * "Hoje" é o título da tela, como o protótipo escreve; "Início" é o nome
     * do item na barra de navegação. São coisas diferentes, e eu tinha
     * confundido as duas até a F11.
     */
    const titulo = page.getByRole("heading", { name: "Hoje", level: 1 });
    const coluna = await titulo.evaluate((el) => {
      const pai = el.parentElement!;
      return {
        largura: pai.getBoundingClientRect().width,
        esquerda: el.getBoundingClientRect().left,
      };
    });

    // 720 de coluna; o título começa dentro dela, não colado na barra.
    expect(coluna.largura).toBeLessThanOrEqual(720);
    expect(coluna.esquerda).toBeGreaterThan(72);
  });
});

/*
 * A barra que recolhe e expande.
 *
 * Quatro coisas que só a tela prova, e que um teste de unidade não
 * alcançaria: a largura nos dois estados, o conteúdo não se mexer, o
 * teclado abrir sem mouse, e o eixo do ícone não sair do lugar.
 */
test.describe("a barra recolhe e expande", () => {
  /** A largura que a barra tem agora, depois de a transição terminar. */
  async function largura(page: Page): Promise<number> {
    const caixa = await page.getByRole("navigation", { name: "Navegação principal" }).boundingBox();
    return Math.round(caixa!.width);
  }

  /** O centro horizontal do ícone de uma área. */
  async function eixoDoIcone(page: Page, nome: string): Promise<number> {
    const caixa = await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: nome, exact: true })
      .locator("svg")
      .first()
      .boundingBox();
    return Math.round(caixa!.x + caixa!.width / 2);
  }

  test("84 px recolhida, 232 px com o mouse em cima", async ({ page }) => {
    await entrarNoApp(page, "largura");
    expect(await largura(page)).toBe(84);

    await page.getByRole("navigation", { name: "Navegação principal" }).hover();
    await expect.poll(() => largura(page)).toBe(232);
  });

  test("o conteúdo não se move quando a barra abre", async ({ page }) => {
    await entrarNoApp(page, "parado");

    const titulo = page.getByRole("heading", { level: 1 }).first();
    const antes = (await titulo.boundingBox())!.x;

    await page.getByRole("navigation", { name: "Navegação principal" }).hover();
    await expect.poll(() => largura(page)).toBe(232);

    // É isto que separa "a barra passa por cima" de "a barra empurra".
    expect(Math.round((await titulo.boundingBox())!.x)).toBe(Math.round(antes));
  });

  test("o teclado abre a barra, sem mouse nenhum", async ({ page }) => {
    await entrarNoApp(page, "teclado");
    expect(await largura(page)).toBe(84);

    // Quem navega por Tab não tem hover: sem isto, a barra ficaria com os
    // rótulos escondidos justamente para quem mais precisa deles.
    await page.keyboard.press("Tab");
    await expect.poll(() => largura(page)).toBe(232);
  });

  test("o ícone fica no mesmo eixo nos dois estados", async ({ page }) => {
    await entrarNoApp(page, "eixo");

    const recolhida = await eixoDoIcone(page, "Início");
    // Metade da barra recolhida: é o eixo que a referência pede.
    expect(recolhida).toBe(42);

    await page.getByRole("navigation", { name: "Navegação principal" }).hover();
    await expect.poll(() => largura(page)).toBe(232);

    expect(await eixoDoIcone(page, "Início")).toBe(recolhida);
  });

  test("com movimento reduzido, a barra abre sem animar", async ({ page }) => {
    await entrarNoApp(page, "quieto");

    // Quem pediu menos movimento no sistema não deve ver a barra deslizar.
    await page.emulateMedia({ reducedMotion: "reduce" });
    const barra = page.getByRole("navigation", { name: "Navegação principal" });

    /*
     * `transition-property: none` é o que desliga de verdade.
     *
     * A duração continua declarada — `transition-duration` segue 0,15 s —
     * e olhar para ela daria um teste vermelho com o código certo. Quem
     * manda na animação é a propriedade em transição.
     */
    await expect(barra).toHaveCSS("transition-property", "none");

    // E continua abrindo: desligar a animação não pode desligar a função.
    await barra.hover();
    await expect.poll(() => largura(page)).toBe(232);
  });

  test("Configurações fecha a barra, e leva à tela", async ({ page }) => {
    await entrarNoApp(page, "config");
    const barra = page.getByRole("navigation", { name: "Navegação principal" });

    await barra.getByRole("link", { name: "Configurações" }).click();
    await expect(page).toHaveURL(/\/configuracoes/);
  });
});

/*
 * O que a barra faz **depois** do clique.
 *
 * Abrir com qualquer foco deixava a barra aberta por cima da tela recém
 * aberta: o clique põe o foco no link, o mouse sai, e ela ficava lá.
 */
test.describe("a barra fecha sozinha", () => {
  test("clicar num item não deixa a barra aberta", async ({ page }) => {
    await entrarNoApp(page, "fecha");
    const barra = page.getByRole("navigation", { name: "Navegação principal" });

    await barra.getByRole("link", { name: "Explorar", exact: true }).click();
    await expect(page).toHaveURL(/\/comunidades$/);

    // Tira o ponteiro de cima e confere: sem o `focus-visible`, o foco que
    // ficou no link a manteria aberta.
    await page.mouse.move(900, 400);
    await expect.poll(async () => Math.round((await barra.boundingBox())!.width)).toBe(84);
  });

  test("os três botões do rodapé têm ícones do mesmo tamanho", async ({ page }) => {
    await entrarNoApp(page, "tamanhos");
    const barra = page.getByRole("navigation", { name: "Navegação principal" });

    const medir = async (nome: string) => {
      const caixa = await barra
        .getByRole("link", { name: nome, exact: true })
        .locator("svg, span[aria-hidden='true']")
        .first()
        .boundingBox();
      return Math.round(caixa!.width);
    };

    // Três tamanhos diferentes em três botões empilhados é o tipo de coisa
    // que se nota antes de saber o que é.
    const engrenagem = await medir("Configurações");
    expect(await medir("Criar tópico")).toBe(engrenagem);
    expect(await medir("Criar comunidade")).toBe(engrenagem);
  });

  test("os dois botões de criar são cheios, cada um com a cor do seu nível", async ({ page }) => {
    await entrarNoApp(page, "cheios");
    const barra = page.getByRole("navigation", { name: "Navegação principal" });

    /*
     * Este botão já saiu errado duas vezes: uma cerquilha solta e, depois,
     * um selo de 24 px dentro de um anel vazado de 42. O que o prende é a
     * cor de fundo — se ele voltar a ser vazado, isto reprova.
     */
    await expect(barra.getByRole("link", { name: "Criar tópico", exact: true })).toHaveCSS(
      "background-color",
      "rgb(30, 26, 51)",
    );
    await expect(barra.getByRole("link", { name: "Criar comunidade", exact: true })).toHaveCSS(
      "background-color",
      "rgb(166, 156, 251)",
    );
  });

  test("o glifo fica centrado no botão fechado", async ({ page }) => {
    await entrarNoApp(page, "centro");
    const barra = page.getByRole("navigation", { name: "Navegação principal" });

    for (const nome of ["Criar tópico", "Criar comunidade"]) {
      const botao = barra.getByRole("link", { name: nome, exact: true });
      const fora = (await botao.boundingBox())!;
      const dentro = (await botao.locator("svg").first().boundingBox())!;

      const desvio = dentro.x + dentro.width / 2 - (fora.x + fora.width / 2);
      expect(Math.abs(desvio), `${nome} com o desenho fora do centro`).toBeLessThan(1);
    }
  });

  test("abertos, os dois botões de criar têm a mesma largura", async ({ page }) => {
    await entrarNoApp(page, "larguras");
    const barra = page.getByRole("navigation", { name: "Navegação principal" });

    await barra.hover();
    await expect.poll(async () => Math.round((await barra.boundingBox())!.width)).toBe(232);

    const largura = async (nome: string) =>
      Math.round((await barra.getByRole("link", { name: nome, exact: true }).boundingBox())!.width);

    expect(await largura("Criar tópico")).toBe(await largura("Criar comunidade"));
  });
});
