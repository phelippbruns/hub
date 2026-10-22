import { expect, test, type Page } from "@playwright/test";
import { consultar, esperarNoBanco } from "./apoio-banco";
import {
  abrirConvites,
  alerta,
  cadastroConcluido,
  concluirOnboarding,
  seguirNoPerfil,
} from "./apoio-tela";

/**
 * Perfil (F12).
 *
 * As ausências — Coleção privada, seguindo só para o dono, seguidores sem
 * lista — têm 26 testes contra o banco em `lib/data/perfil.db.test.ts`.
 * Aqui é a tela, e principalmente o que ela **não** mostra.
 */

function unico(p: string) {
  return `${p}${Date.now() % 100000}${Math.floor(Math.random() * 100)}`;
}

async function entrarNoApp(page: Page, prefixo: string): Promise<string> {
  const handle = unico("p").slice(0, 20);

  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill("Pessoa do Perfil");
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

/** Alguém do seed, para ter um perfil alheio com conteúdo. */
async function outraPessoa(): Promise<{ handle: string; nome: string }> {
  const [pessoa] = await consultar<{ handle: string; name: string }>(
    `SELECT p.handle, p.name
       FROM profiles p
       JOIN answers a ON a.author_id = p.id AND a.deleted_at IS NULL
      WHERE p.deleted_at IS NULL
      GROUP BY p.handle, p.name
      LIMIT 1`,
  );
  expect(pessoa, "o seed precisa de alguém que já respondeu").toBeTruthy();
  return { handle: pessoa!.handle, nome: pessoa!.name };
}

test.describe("o perfil próprio", () => {
  test("mostra seguindo e a aba Coleção", async ({ page }) => {
    await entrarNoApp(page, "proprio");
    await page.goto("/perfil");

    await expect(page.getByText(/seguindo$/)).toBeVisible();
    await expect(page.getByRole("tab", { name: "Coleção" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Contribuições" })).toBeVisible();

    // O @ é o h1: o título "Perfil" saiu, e a página não pode ficar sem âncora.
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Perfil", exact: true })).toHaveCount(0);
  });

  test("os dois contadores aparecem, numa linha de texto", async ({ page }) => {
    await entrarNoApp(page, "contadores");
    await page.goto("/perfil");

    // RN28: participação, não popularidade — e "dias ativos" saiu na F18,
    // porque media assiduidade.
    await expect(page.getByText(/^\d+ contribuições$/)).toBeVisible();
    await expect(page.getByText(/^\d+ comunidades$/)).toBeVisible();
    await expect(page.getByText("dias ativos")).toHaveCount(0);
  });

  test("a engrenagem leva a Editar perfil", async ({ page }) => {
    await entrarNoApp(page, "engrenagem");
    await page.goto("/perfil");

    // A engrenagem tomou o lugar dos dois links largos que havia aqui.
    await page.getByRole("link", { name: "Editar perfil" }).click();
    await page.waitForURL(/\/perfil\/editar/);
  });

  test("a Coleção diz que é privada", async ({ page }) => {
    await entrarNoApp(page, "colecao");
    await page.goto("/perfil?aba=colecao");

    await expect(page.getByText("Só você vê a sua Coleção.")).toBeVisible();
  });
});

test.describe("o perfil de outra pessoa", () => {
  test("não mostra seguindo nem a aba Coleção", async ({ page }) => {
    await entrarNoApp(page, "visitante");
    const { handle } = await outraPessoa();

    await page.goto(`/${handle}`);

    // RN27: quem você acompanha diz muito sobre você.
    await expect(page.getByText(/seguindo$/)).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Coleção" })).toHaveCount(0);
  });

  test("seguidores é número, e não abre lista", async ({ page }) => {
    await entrarNoApp(page, "seguidores");
    const { handle } = await outraPessoa();

    await page.goto(`/${handle}`);

    // RN28: é informativo, para evitar comparação entre perfis.
    await expect(page.getByText(/seguidores?$/)).toBeVisible();
    await expect(page.getByRole("link", { name: /seguidores?/ })).toHaveCount(0);
  });

  test("tem Seguir e Cabine, como botões de ícone com rótulo", async ({ page }) => {
    await entrarNoApp(page, "acoes");
    const { handle, nome } = await outraPessoa();

    await page.goto(`/${handle}`);

    // Só ícone: sem `aria-label` eles seriam dois botões mudos.
    const conteudo = page.getByRole("main");
    await expect(conteudo.getByRole("button", { name: `Seguir ${nome}` })).toBeVisible();
    await expect(
      conteudo.getByRole("button", { name: `Abrir uma Cabine com ${nome}` }),
    ).toBeVisible();
  });

  test("abrir o próprio @ leva ao perfil próprio", async ({ page }) => {
    const meuHandle = await entrarNoApp(page, "meuarroba");

    await page.goto(`/${meuHandle}`);

    // Dois endereços para a mesma tela confundiriam o que é "meu".
    await page.waitForURL(/\/perfil$/);
  });
});

test.describe("seguir", () => {
  test("seguir aparece na lista de seguindo", async ({ page }) => {
    await entrarNoApp(page, "seguir");
    const { handle, nome } = await outraPessoa();

    await page.goto(`/${handle}`);
    await page.getByRole("button", { name: `Seguir ${nome}` }).click();
    await expect(
      page.getByRole("button", { name: `Seguindo ${nome}. Toque para deixar de seguir` }),
    ).toBeVisible();

    await esperarNoBanco(`
      SELECT 1 FROM follows f
       JOIN profiles p ON p.id = f.followed_profile_id
      WHERE f.target = 'profile' AND p.handle = '${handle}'`);

    await page.goto("/perfil/seguindo");
    await expect(page.getByText("Só você vê esta lista.")).toBeVisible();
    await expect(page.getByText(nome, { exact: true })).toBeVisible();
  });
});

test.describe("editar o perfil", () => {
  test("salva nome e descrição", async ({ page }) => {
    await entrarNoApp(page, "editar");
    await page.goto("/perfil/editar");

    await page.getByLabel("Nome").fill("Ana Lima");
    await page.getByRole("textbox", { name: "Sobre mim" }).fill("Techno e fotografia de rua.");
    await page.getByRole("button", { name: "Salvar" }).click();

    await page.waitForURL(/\/perfil$/);
    await expect(page.getByText("Ana Lima").first()).toBeVisible();
    await expect(page.getByText("Techno e fotografia de rua.")).toBeVisible();
  });

  test("RN16: link na descrição é barrado antes de enviar", async ({ page }) => {
    await entrarNoApp(page, "linkbio");
    await page.goto("/perfil/editar");

    await page.getByRole("textbox", { name: "Sobre mim" }).fill("me acha em meusite.com");

    await expect(page.getByText('Tire o endereço: "meusite.com"')).toBeVisible();
    await expect(page.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  test("RN17: @ já usado é recusado com a razão", async ({ page }) => {
    await entrarNoApp(page, "arrobausado");
    const { handle } = await outraPessoa();

    await page.goto("/perfil/editar");
    await page.getByLabel("@").fill(handle);
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(alerta(page.locator("form"))).toContainText(/já está em uso/i);
  });
});

test.describe("silenciar e bloquear", () => {
  test("silenciar explica que é só o meu Início", async ({ page }) => {
    await entrarNoApp(page, "silenciar");
    const { handle, nome } = await outraPessoa();

    await page.goto(`/${handle}`);
    await page.getByRole("button", { name: /^Mais opções sobre/ }).click();

    await expect(page.getByRole("button", { name: "Silenciar no Início" })).toBeVisible();
    await expect(page.getByText(`Silenciar tira ${nome} do seu Início`)).toBeVisible();
  });

  test("bloquear avisa que desfaz o seguir, e desfaz", async ({ page }) => {
    await entrarNoApp(page, "bloquear");
    const { handle, nome } = await outraPessoa();

    await page.goto(`/${handle}`);
    await page.getByRole("button", { name: `Seguir ${nome}` }).click();
    await esperarNoBanco(`
      SELECT 1 FROM follows f JOIN profiles p ON p.id = f.followed_profile_id
       WHERE f.target = 'profile' AND p.handle = '${handle}'`);

    await page.getByRole("button", { name: /^Mais opções sobre/ }).click();
    await page.getByRole("button", { name: "Bloquear", exact: true }).click();

    await expect(page.getByText(/deixam de se seguir/)).toBeVisible();
    await page.getByRole("button", { name: "Bloquear", exact: true }).click();

    await esperarNoBanco(`
      SELECT 1 FROM blocks b JOIN profiles p ON p.id = b.blocked_id
       WHERE p.handle = '${handle}'`);

    await page.goto("/perfil/seguindo");
    await expect(page.getByText("Você ainda não segue ninguém.")).toBeVisible();
  });
});

/**
 * RN16/RN27: o campo Links é a única exceção ao bloqueio de links.
 *
 * Por isso a jornada confere o que importa para quem clica: a aba nova e o
 * `rel`. Sem `noopener`, a página aberta pode mexer na aba de onde veio.
 */
test.describe("os links do perfil", () => {
  test("salva, aparece no perfil e abre em outra aba com segurança", async ({ page }) => {
    await entrarNoApp(page, "links");
    await page.goto("/perfil/editar");

    await page.getByLabel("Título do link 1").fill("Instagram");
    // Sem protocolo: o servidor normaliza para https.
    await page.getByLabel("Endereço do link 1").fill("instagram.com/lia");
    await page.getByRole("button", { name: "Salvar" }).click();

    await page.waitForURL(/\/perfil$/);

    const link = page.getByRole("link", { name: "Instagram" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "https://instagram.com/lia");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAttribute("rel", /noreferrer/);
  });

  test("link sem título é recusado com a razão", async ({ page }) => {
    await entrarNoApp(page, "linksemtitulo");
    await page.goto("/perfil/editar");

    await page.getByLabel("Endereço do link 1").fill("https://exemplo.com");
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(alerta(page.locator("form"))).toContainText("Dê um título ao link.");
  });
});

test.describe("a cor de fundo do perfil", () => {
  test("a escolha pinta a tela de editar e depois o perfil", async ({ page }) => {
    await entrarNoApp(page, "cor");
    await page.goto("/perfil/editar");

    const verde = page.getByRole("radio", { name: "Verde" });
    await verde.click();
    await expect(verde).toHaveAttribute("aria-checked", "true");

    await page.getByRole("button", { name: "Salvar" }).click();
    await page.waitForURL(/\/perfil$/);

    /*
     * Esperar o conteúdo, e não só o endereço: a rota tem `loading.tsx`, e
     * medir logo depois da navegação mede o esqueleto, que não é pintado.
     */
    await expect(page.getByRole("tab", { name: "Contribuições" })).toBeVisible();

    // A cor pinta a área de conteúdo, não a barra de navegação.
    const cores = await page.evaluate(() => {
      const conteudo = document.querySelector("main > div");
      const barra = document.querySelector("nav");
      return {
        conteudo: conteudo ? getComputedStyle(conteudo).backgroundColor : null,
        barra: barra ? getComputedStyle(barra).backgroundColor : null,
      };
    });

    expect(cores.conteudo).toBe("rgb(230, 244, 234)");
    expect(cores.barra).not.toBe("rgb(230, 244, 234)");
  });
});

test.describe("RN27: esconder seguidores", () => {
  test("ligado, o número some para o visitante e some do HTML", async ({ page, browser }) => {
    const handle = await entrarNoApp(page, "privado");

    await page.goto("/perfil/editar");
    await page.getByRole("switch", { name: "Ocultar seguidores e seguindo" }).click();
    await page.getByRole("button", { name: "Salvar" }).click();
    await page.waitForURL(/\/perfil$/);

    // O dono continua vendo.
    await expect(page.getByText(/seguidores/)).toBeVisible();

    const outra = await browser.newContext();
    try {
      const visitante = await outra.newPage();
      await entrarNoApp(visitante, "privadovisita");
      await visitante.goto(`/${handle}`);

      await expect(visitante.getByText(/seguidores?/)).toHaveCount(0);

      // Não basta sumir da tela: o número não pode estar no HTML.
      const html = await visitante.content();
      expect(html).not.toContain("seguidores");
    } finally {
      await outra.close();
    }
  });
});

/**
 * RN20: um clique no ícone de Cabine, um destino — a conversa.
 *
 * Antes isto abria a tela de escolher pessoas, com busca e sugestões na
 * frente de quem já tinha escolhido com quem falar.
 */
test.describe("a Cabine a partir do perfil", () => {
  test("quem divide comunidade cai na conversa, sem passar por formulário", async ({ page }) => {
    await entrarNoApp(page, "cabineperfil");
    const { handle, nome } = await outraPessoa();

    await page.goto(`/${handle}`);
    await page.getByRole("button", { name: `Abrir uma Cabine com ${nome}` }).click();

    // Direto na conversa: nem passa por /cabines/nova.
    await page.waitForURL(/\/cabines\/[0-9a-f-]+$/, { timeout: 20_000 });
    await expect(page.getByRole("region", { name: "Conversa" })).toBeVisible();
  });

  test("clicar de novo volta à mesma conversa", async ({ page }) => {
    await entrarNoApp(page, "cabinedenovo");
    const { handle, nome } = await outraPessoa();

    await page.goto(`/${handle}`);
    await page.getByRole("button", { name: `Abrir uma Cabine com ${nome}` }).click();
    await page.waitForURL(/\/cabines\/[0-9a-f-]+$/, { timeout: 20_000 });
    const primeira = page.url();

    await page.goto(`/${handle}`);
    await page.getByRole("button", { name: /Cabine com|conversa com/ }).click();
    await page.waitForURL(/\/cabines\/[0-9a-f-]+$/, { timeout: 20_000 });

    expect(page.url()).toBe(primeira);
  });
});

test.describe("o menu de opções do perfil", () => {
  test("abre ancorado, sem empurrar a página, e fecha ao escolher", async ({ page }) => {
    await entrarNoApp(page, "menuperfil");
    const { handle, nome } = await outraPessoa();

    await page.goto(`/${handle}`);

    // Onde está o nome antes de abrir o menu.
    const titulo = page.getByRole("heading", { level: 1 });
    const antes = await titulo.boundingBox();

    await page.getByRole("button", { name: `Mais opções sobre ${nome}` }).click();
    const menu = page.getByRole("dialog", { name: `Opções sobre ${nome}` });
    await expect(menu).toBeVisible();

    // A folha inferior empurrava o perfil inteiro para baixo.
    const depois = await titulo.boundingBox();
    expect(Math.round(depois!.y)).toBe(Math.round(antes!.y));

    // Escolher uma opção fecha o menu.
    await page.getByRole("button", { name: "Silenciar no Início" }).click();
    await expect(menu).toBeHidden();
  });

  test("fecha com Esc", async ({ page }) => {
    await entrarNoApp(page, "menuesc");
    const { handle, nome } = await outraPessoa();

    await page.goto(`/${handle}`);
    await page.getByRole("button", { name: `Mais opções sobre ${nome}` }).click();

    const menu = page.getByRole("dialog", { name: `Opções sobre ${nome}` });
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });
});

test.describe("RN28: as duas listas abrem no perfil próprio", () => {
  test("seguidores abre a lista, e no perfil alheio continua só número", async ({
    page,
    browser,
  }) => {
    const meuHandle = await entrarNoApp(page, "listas");

    const outra = await browser.newContext();
    try {
      // Alguém me segue, para a lista ter conteúdo.
      const quemSegue = await outra.newPage();
      await entrarNoApp(quemSegue, "quemsegue");
      await seguirNoPerfil(quemSegue, meuHandle);

      await page.goto("/perfil");
      await page.getByRole("link", { name: /seguidor/ }).click();
      await page.waitForURL(/\/perfil\/seguidores/);
      await expect(page.getByText("Só você vê esta lista.")).toBeVisible();

      // No perfil de outra pessoa, seguidores não é link.
      const { handle } = await outraPessoa();
      await page.goto(`/${handle}`);
      await expect(page.getByRole("link", { name: /seguidores?/ })).toHaveCount(0);
    } finally {
      await outra.close();
    }
  });
});

/**
 * RN22: a primeira coisa escrita vira a mensagem do convite.
 *
 * É a volta inteira: clico na Cabine do perfil, escrevo, e a pessoa do
 * outro lado vê o convite **com o que escrevi**. Sem isto o convite
 * chegaria mudo e a frase ficaria presa atrás do aceite.
 */
test.describe("a conversa que vira convite", () => {
  test("o que escrevo chega como mensagem do convite", async ({ page, browser }) => {
    await entrarNoApp(page, "viraconvite");

    const outra = await browser.newContext();
    try {
      const convidada = await outra.newPage();
      const handleDela = await entrarNoApp(convidada, "convidada");

      await page.goto(`/${handleDela}`);
      await page.getByRole("button", { name: /^Abrir uma Cabine com/ }).click();
      await page.waitForURL(/\/cabines\/[0-9a-f-]+$/, { timeout: 20_000 });

      // A conversa diz com quem é, e que está esperando.
      await expect(page.getByText(/^Esperando /)).toBeVisible();

      const campo = page.getByRole("textbox", { name: "Mensagem" });
      await campo.fill("vi sua resposta sobre vinil");
      await page.getByRole("button", { name: "Enviar" }).click();
      await expect(campo).toHaveValue("", { timeout: 15_000 });

      await convidada.goto("/cabines");
      await abrirConvites(convidada);
      await expect(convidada.getByText("vi sua resposta sobre vinil")).toBeVisible({
        timeout: 15_000,
      });
    } finally {
      await outra.close();
    }
  });
});
