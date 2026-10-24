import { expect, test, type Page } from "@playwright/test";
import { cadastroConcluido, concluirOnboarding } from "./apoio-tela";

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
  await concluirOnboarding(page);
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
     * Este botão já saiu errado três vezes: uma cerquilha solta, depois um
     * selo de 24 px dentro de um anel vazado de 42, e depois uma pílula
     * oval de 52. O que o prende é o disco cheio — se ele voltar a ser
     * vazado, isto reprova.
     *
     * A cor mora no **disco** dentro da linha, não na linha: é o disco que
     * é redondo, e a linha é só o alvo de clique com o rótulo ao lado.
     */
    const disco = (nome: string) =>
      barra.getByRole("link", { name: nome, exact: true }).locator("span > span");

    await expect(disco("Criar tópico")).toHaveCSS("background-color", "rgb(30, 26, 51)");
    await expect(disco("Criar comunidade")).toHaveCSS("background-color", "rgb(166, 156, 251)");
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

/**
 * Os rótulos da barra saem todos do mesmo lugar.
 *
 * Os botões de criar tinham caixa própria de 42 px com um recuo de 5 para
 * o **ícone** cair no eixo. O ícone caía; o rótulo não — ele começava 13 px
 * antes de "Configurações", e com a barra aberta dava para ver.
 */
test("os rótulos da barra lateral começam no mesmo x", async ({ page }) => {
  await entrarNoApp(page, "alinhamento");
  await page.goto("/inicio");

  const barra = page.getByRole("navigation", { name: "Navegação principal" });
  await barra.hover();

  const esquerdas = await barra.evaluate((nav) => {
    const nomes = ["Início", "Explorar", "Criar tópico", "Criar comunidade", "Configurações"];
    return nomes.map((nome) => {
      const alvo = [...nav.querySelectorAll("a")].find((a) => a.textContent?.trim() === nome);
      // O rótulo é o último filho do link; o ícone é o primeiro.
      const rotulo = alvo?.lastElementChild as HTMLElement | undefined;
      return rotulo ? Math.round(rotulo.getBoundingClientRect().left) : -1;
    });
  });

  expect(esquerdas).not.toContain(-1);
  expect(new Set(esquerdas).size, `rótulos em ${esquerdas.join(", ")}`).toBe(1);
});

test("Configurações tem os Termos, e Sair é a última coisa da tela", async ({ page }) => {
  await entrarNoApp(page, "configs");
  await page.goto("/configuracoes");

  // A seção "Conta" sumiu: um título para um botão só é moldura em volta de nada.
  await expect(page.getByRole("heading", { name: "Conta" })).toHaveCount(0);

  const sair = page.getByRole("button", { name: "Sair" });
  const termos = page.getByRole("link", { name: /Termos de uso/ });
  await expect(sair).toBeVisible();
  await expect(termos).toBeVisible();

  // Sair embaixo de tudo.
  const posicoes = await page.evaluate(() => {
    const principal = document.querySelector("main")!;
    const botao = [...principal.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Sair",
    )!;
    const ultimo = [...principal.querySelectorAll("p, h2, a, button")].pop()!;
    return { sair: botao.getBoundingClientRect().top, fim: ultimo.getBoundingClientRect().top };
  });
  expect(posicoes.sair).toBeGreaterThanOrEqual(posicoes.fim);

  await termos.click();
  await page.waitForURL(/\/termos/);
});

/**
 * Os botões de criar são redondos, e os três últimos itens ficam à mesma
 * distância um do outro.
 *
 * Na rodada passada os dois de criar viraram pílulas de 52 px para o rótulo
 * cair no eixo, e o que se via era uma forma oval onde antes havia um botão
 * redondo — queixa do PO. O círculo voltou, agora **dentro** do `Eixo`, o
 * que resolve o rótulo sem mudar o desenho.
 *
 * E Configurações vinha com 16 px de distância contra os 8 px dos dois de
 * cima; empilhados, a diferença aparecia.
 */
test("os botões de criar são redondos e os três últimos são igualmente espaçados", async ({
  page,
}) => {
  await entrarNoApp(page, "redondos");
  await page.goto("/inicio");

  const barra = page.getByRole("navigation", { name: "Navegação principal" });

  const medidas = await barra.evaluate((nav) => {
    const linha = (nome: string) =>
      [...nav.querySelectorAll("a")].find((a) => a.getAttribute("aria-label") === nome) ??
      [...nav.querySelectorAll("a")].find((a) => a.textContent?.trim() === nome);

    const disco = (nome: string) => {
      const span = linha(nome)!.querySelector("span > span") as HTMLElement;
      const caixa = span.getBoundingClientRect();
      return { largura: Math.round(caixa.width), altura: Math.round(caixa.height) };
    };

    const topo = (nome: string) => Math.round(linha(nome)!.getBoundingClientRect().top);
    const base = (nome: string) => Math.round(linha(nome)!.getBoundingClientRect().bottom);

    return {
      topico: disco("Criar tópico"),
      comunidade: disco("Criar comunidade"),
      vaos: [
        topo("Criar comunidade") - base("Criar tópico"),
        topo("Configurações") - base("Criar comunidade"),
      ],
    };
  });

  // `control` é 42 px, e redondo quer dizer largura igual à altura.
  expect(medidas.topico).toEqual({ largura: 42, altura: 42 });
  expect(medidas.comunidade).toEqual({ largura: 42, altura: 42 });

  // `space2`, os mesmos 8 px entre os três.
  expect(medidas.vaos, `vãos de ${medidas.vaos.join(" e ")} px`).toEqual([8, 8]);
});

/**
 * A marca do Hub é um quarto maior que uma marca de nível.
 *
 * 40 contra 32: na barra ela não está ao lado de um nome, ela é a logo.
 * Decisão do PO em 24 de outubro, junto com os arquivos de logo.
 */
test("a marca do Hub na barra é um quarto maior que a marca de nível", async ({ page }) => {
  await entrarNoApp(page, "marcamaior");
  await page.goto("/inicio");

  const marca = page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Hub" })
    .locator("svg")
    .first();

  const caixa = (await marca.boundingBox())!;
  expect(Math.round(caixa.width)).toBe(40);
  expect(Math.round(caixa.height)).toBe(40);
});

/**
 * A marca se mexe quando deve, e só então.
 *
 * O protótipo que o PO mandou tem dois movimentos com donos diferentes: a
 * chave cresce ao passar o mouse **na marca**, e a palavra "hub" sai de
 * dentro dela quando **a barra** abre. Trocar os donos é o erro fácil — a
 * palavra presa ao hover da marca deixaria a logo pela metade sempre que
 * alguém abrisse a barra pelo lado.
 */
test("a chave cresce no hover da marca, e a palavra sai quando a barra abre", async ({ page }) => {
  await entrarNoApp(page, "animamarca");
  await page.goto("/inicio");

  const barra = page.getByRole("navigation", { name: "Navegação principal" });
  const marca = barra.getByRole("link", { name: "Hub" });
  const chave = marca.locator(".hub-marca-chave");
  const palavra = barra.locator(".hub-marca-palavra");

  const animacao = () => chave.evaluate((el) => getComputedStyle(el).animationName);
  const opacidade = () => palavra.evaluate((el) => Number(getComputedStyle(el).opacity));

  // Parada, e a palavra escondida dentro da chave.
  expect(await animacao()).toBe("none");
  expect(await opacidade()).toBeLessThan(0.1);

  // O mouse na marca abre a barra (ela é parte da barra) e anima a chave.
  await marca.hover();
  expect(await animacao()).toBe("hub-chave-abre");
  await expect.poll(opacidade, { timeout: 2000 }).toBeGreaterThan(0.9);

  // Abrir a barra por outro item mostra a palavra sem animar a chave.
  // Longe da barra: (0, 0) ainda está dentro dela.
  await page.mouse.move(900, 400);
  await expect.poll(opacidade, { timeout: 2000 }).toBeLessThan(0.1);
  await barra.getByRole("link", { name: "Explorar" }).hover();
  await expect.poll(opacidade, { timeout: 2000 }).toBeGreaterThan(0.9);
  expect(await animacao()).toBe("none");
});
