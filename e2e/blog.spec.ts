import { expect, test, type Page } from "@playwright/test";
import { consultar } from "./apoio-banco";
import { alerta, cadastroConcluido, concluirOnboarding } from "./apoio-tela";

/**
 * O blog no perfil (RN39).
 *
 * Esta jornada cresce com os blocos: aqui ficam as abas e a Coleção, que é
 * o Bloco 3. A lista, o painel e o editor entram nos blocos seguintes.
 */

function unico(p: string) {
  return `${p}${Date.now() % 100000}${Math.floor(Math.random() * 100)}`;
}

async function entrarNoApp(page: Page, prefixo: string): Promise<string> {
  const handle = unico("b").slice(0, 20);

  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill("Pessoa do Blog");
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

/** Visitante no Hub é outra pessoa **com conta**: o perfil não é público. */
async function trocarDePessoa(page: Page, prefixo: string): Promise<string> {
  await page.context().clearCookies();
  return entrarNoApp(page, prefixo);
}

/**
 * Cria um post direto no banco.
 *
 * O editor só chega no Bloco 7, e a lista precisa de posts para ser
 * testada. É o mesmo caminho que `ciclo.spec.ts` usa para ter dois tópicos
 * no mesmo dia, que a RN07 não deixaria criar pela tela.
 */
async function criarPost(
  handle: string,
  titulo: string,
  extras: { fixado?: boolean; capa?: string; dias?: number } = {},
) {
  const quando = `now() - interval '${extras.dias ?? 0} days'`;
  await consultar(
    `INSERT INTO posts (author_id, title, body, excerpt, read_minutes, cover_url, pinned_at, created_at, updated_at)
     SELECT id, '${titulo}', '{"type":"doc","content":[]}'::jsonb,
            'Resumo de ${titulo}.', 2,
            ${extras.capa ? `'${extras.capa}'` : "NULL"},
            ${extras.fixado ? quando : "NULL"},
            ${quando}, ${quando}
       FROM profiles WHERE handle = '${handle}'`,
  );
}

/** A âncora positiva de cada troca de contexto: a tela certa carregou. */
async function perfilCarregado(page: Page, handle: string) {
  await expect(page.getByRole("heading", { level: 1, name: handle })).toBeVisible();
}

test.describe("as abas do perfil", () => {
  test("Blog é a primeira aba, e é a que abre num perfil sem post", async ({ page }) => {
    const handle = await entrarNoApp(page, "abas");
    await page.goto("/perfil");
    await perfilCarregado(page, handle);

    const abas = page.getByRole("tab");
    await expect(abas).toHaveText(["Blog", "Contribuições", "Comunidades"]);
    await expect(page.getByRole("tab", { name: "Blog" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Nenhum post ainda")).toBeVisible();
  });

  test("Blog também é a que abre no perfil de outra pessoa", async ({ page }) => {
    const dona = await entrarNoApp(page, "donaabas");

    await trocarDePessoa(page, "visitaabas");
    await page.goto(`/${dona}`);
    await perfilCarregado(page, dona);

    await expect(page.getByRole("tab", { name: "Blog" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Nenhum post ainda")).toBeVisible();
  });

  test("a Coleção saiu das abas", async ({ page }) => {
    const handle = await entrarNoApp(page, "semcolecao");
    await page.goto("/perfil");
    await perfilCarregado(page, handle);

    // Positivo primeiro: as três abas chegaram. Senão o zero abaixo seria
    // satisfeito pela página ainda vazia.
    await expect(page.getByRole("tab")).toHaveCount(3);
    await expect(page.getByRole("tab", { name: "Coleção" })).toHaveCount(0);
  });
});

test.describe("a Coleção no menu de três pontos", () => {
  test("o dono acha a Coleção no menu, e ela abre", async ({ page }) => {
    const handle = await entrarNoApp(page, "colmenu");
    await page.goto("/perfil");
    await perfilCarregado(page, handle);

    await page.getByRole("button", { name: "Mais opções do seu perfil" }).click();
    await page.getByRole("button", { name: "Coleção", exact: true }).click();

    await expect(page).toHaveURL(/aba=colecao/);
    await expect(page.getByText("Só você vê a sua Coleção.")).toBeVisible();
  });

  test("clicar no '...' de novo fecha o menu", async ({ page }) => {
    const handle = await entrarNoApp(page, "fecharmenu");
    await page.goto("/perfil");
    await perfilCarregado(page, handle);

    const tresPontos = page.getByRole("button", { name: "Mais opções do seu perfil" });
    await tresPontos.click();
    await expect(page.getByRole("button", { name: "Coleção", exact: true })).toBeVisible();

    await tresPontos.click();
    await expect(page.getByRole("button", { name: "Coleção", exact: true })).toHaveCount(0);
  });

  test("RN27: o visitante não tem esse menu, nem o endereço da Coleção", async ({ page }) => {
    const dona = await entrarNoApp(page, "donacol");

    await trocarDePessoa(page, "visitacol");
    await page.goto(`/${dona}?aba=colecao`);
    await perfilCarregado(page, dona);

    // O endereço é aceito e cai no padrão, em vez de quebrar — mas a
    // Coleção não aparece, e o menu do dono não existe aqui.
    await expect(page.getByText("Só você vê a sua Coleção.")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Mais opções do seu perfil" })).toHaveCount(0);
  });

  test("?aba=colecao continua abrindo a Coleção para o dono", async ({ page }) => {
    const handle = await entrarNoApp(page, "endantigo");

    // O endereço que alguém pode ter guardado de antes da mudança.
    await page.goto("/perfil?aba=colecao");
    await perfilCarregado(page, handle);

    await expect(page.getByText("Só você vê a sua Coleção.")).toBeVisible();
  });
});

test.describe("RN39: a lista do blog", () => {
  test("RN39: os fixados vêm numa seção, acima dos demais", async ({ page }) => {
    const handle = await entrarNoApp(page, "listafix");

    // Publicado há mais tempo, mas fixado: tem de aparecer acima do recente.
    await criarPost(handle, "Antigo e fixado", { fixado: true, dias: 30 });
    await criarPost(handle, "Recente sem fixar", { dias: 1 });

    await page.goto("/perfil");
    await perfilCarregado(page, handle);

    await expect(page.getByRole("heading", { name: "Fixados" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Todos os posts" })).toBeVisible();

    const titulos = page.getByRole("heading", { level: 3 });
    await expect(titulos).toHaveText(["Antigo e fixado", "Recente sem fixar"]);
  });

  test("sem fixado nenhum, não há seção — só a lista", async ({ page }) => {
    const handle = await entrarNoApp(page, "listalimpa");
    await criarPost(handle, "Um post só");

    await page.goto("/perfil");
    await perfilCarregado(page, handle);

    // Positivo primeiro: o post chegou. Senão o zero abaixo seria
    // satisfeito pela aba ainda vazia.
    await expect(page.getByRole("heading", { name: "Um post só" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Fixados" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Todos os posts" })).toHaveCount(0);
  });

  test("RN39: a lista aparece no perfil de outra pessoa", async ({ page }) => {
    const dona = await entrarNoApp(page, "donalista");
    await criarPost(dona, "O que eu escrevi", { dias: 2 });

    await trocarDePessoa(page, "visitalista");
    await page.goto(`/${dona}`);
    await perfilCarregado(page, dona);

    await expect(page.getByRole("heading", { name: "O que eu escrevi" })).toBeVisible();
    // Tempo de leitura e data juntos, discretos, no fim da linha de selos.
    await expect(page.getByText("2 min · há 2 dias")).toBeVisible();
  });

  test("sem imagem nenhuma, a prévia é a inicial do título", async ({ page }) => {
    const handle = await entrarNoApp(page, "semimagem");
    await criarPost(handle, "Vinil na chuva");

    await page.goto("/perfil");
    await perfilCarregado(page, handle);
    await expect(page.getByRole("heading", { name: "Vinil na chuva" })).toBeVisible();

    // A inicial é decorativa e não entra na árvore de acessibilidade, então
    // o que se confere é que não há imagem desenhada na linha.
    const linha = page.getByRole("heading", { name: "Vinil na chuva" }).locator("../../..");
    await expect(linha.locator("img")).toHaveCount(0);
    await expect(linha.getByText("V", { exact: true })).toBeVisible();
  });
});

test.describe("o post aberto no painel", () => {
  test("abrir põe o post na URL e destaca a linha", async ({ page }) => {
    const handle = await entrarNoApp(page, "abrirpost");
    await criarPost(handle, "Uma noite no galpão");

    await page.goto("/perfil");
    await perfilCarregado(page, handle);
    await page.getByRole("heading", { name: "Uma noite no galpão" }).click();

    await expect(page).toHaveURL(/post=uma-noite-no-galpao/);
    await expect(page.getByRole("complementary", { name: /^Post / })).toBeVisible();
  });

  test("abrir outro troca o conteúdo sem fechar o painel", async ({ page }) => {
    const handle = await entrarNoApp(page, "trocarpost");
    await criarPost(handle, "Primeiro post", { dias: 2 });
    await criarPost(handle, "Segundo post", { dias: 1 });

    await page.goto("/perfil?post=primeiro-post");
    await perfilCarregado(page, handle);
    await expect(page.getByRole("complementary", { name: "Post Primeiro post" })).toBeVisible();

    await page.getByRole("heading", { name: "Segundo post" }).click();

    await expect(page.getByRole("complementary", { name: "Post Segundo post" })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Post Primeiro post" })).toHaveCount(0);
  });

  test("Esc fecha o painel e o foco volta para a linha que estava aberta", async ({ page }) => {
    const handle = await entrarNoApp(page, "focovolta");
    await criarPost(handle, "Volta para mim");

    await page.goto("/perfil?post=volta-para-mim");
    await perfilCarregado(page, handle);
    await expect(page.getByRole("complementary", { name: /^Post / })).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.getByRole("complementary", { name: /^Post / })).toHaveCount(0);
    /*
     * O foco volta para a linha, e não para o topo da página. É o defeito
     * que o painel do tópico tem e este não herdou: sem a volta, quem usa
     * teclado precisa tabular a lista inteira de novo.
     */
    const focado = await page.evaluate(() =>
      document.activeElement?.closest("[data-post]")?.getAttribute("data-post"),
    );
    expect(focado).toBe("volta-para-mim");
  });

  test("fechar o painel preserva os outros parâmetros da URL", async ({ page }) => {
    const handle = await entrarNoApp(page, "fecharparam");
    await criarPost(handle, "Com parâmetro");

    // `aba=comunidades` é um parâmetro que a tela usa e que não tem nada a
    // ver com o painel: fechar o post não pode levá-lo junto.
    await page.goto("/perfil?aba=comunidades&post=com-parametro");
    await perfilCarregado(page, handle);
    await expect(page.getByRole("complementary", { name: /^Post / })).toBeVisible();

    await page.getByRole("button", { name: "Fechar post" }).click();

    await expect(page).toHaveURL(/aba=comunidades/);
    await expect(page).not.toHaveURL(/post=/);
  });

  test("sem post aberto, a coluna do perfil continua centralizada", async ({ page }) => {
    const handle = await entrarNoApp(page, "colunaigual");
    await criarPost(handle, "Existe mas está fechado");

    await page.goto("/perfil");
    await perfilCarregado(page, handle);

    /*
     * **O critério que o PO fixou**: sem `?post=`, o perfil é o de antes.
     * O painel é irmão da coluna e só nasce quando há post aberto, então
     * sem ele não existe `<aside>` nenhum e a coluna fica centrada.
     */
    await expect(page.getByRole("complementary", { name: /^Post / })).toHaveCount(0);

    const centrada = await page.evaluate(() => {
      const titulo = document.querySelector("h1");
      const coluna = titulo?.closest("div.mx-auto") ?? titulo?.parentElement;
      if (!coluna) return null;
      const caixa = coluna.getBoundingClientRect();
      const esquerda = caixa.left;
      const direita = window.innerWidth - caixa.right;
      return Math.abs(esquerda - direita);
    });

    expect(centrada, "a coluna deveria estar centrada na janela").not.toBeNull();
    expect(centrada!).toBeLessThan(90);
  });

  test("o endereço canônico leva ao painel", async ({ page }) => {
    const handle = await entrarNoApp(page, "canonico");
    await criarPost(handle, "Link de fora");

    await page.goto(`/${handle}/link-de-fora`);

    // Redireciona para o perfil com o painel aberto — o endereço canônico
    // é o que se compartilha, não uma tela.
    await expect(page).toHaveURL(/post=link-de-fora/);
    await expect(page.getByRole("complementary", { name: "Post Link de fora" })).toBeVisible();
  });

  test("endereço de post que não existe dá 404 de verdade", async ({ page }) => {
    const handle = await entrarNoApp(page, "quatrocentos");

    const resposta = await page.goto(`/${handle}/nunca-escrevi-isso`);

    // O código, não a tela: `loading.tsx` nesta rota faria o 404 virar 200
    // com a tela de não encontrado no meio do fluxo.
    expect(resposta?.status()).toBe(404);
  });

  test("RN39: o dono fixa pelo painel, e o selo aparece na lista", async ({ page }) => {
    const handle = await entrarNoApp(page, "fixarpainel");
    await criarPost(handle, "Vou ser fixado");

    await page.goto("/perfil?post=vou-ser-fixado");
    await perfilCarregado(page, handle);

    await page.getByRole("button", { name: "Mais opções do post" }).click();
    await page.getByRole("button", { name: "Fixar no perfil" }).click();

    await expect(page.getByRole("heading", { name: "Fixados" })).toBeVisible();
    await expect(page.getByText("Fixado", { exact: true })).toBeVisible();
  });

  test("RN39: o quarto fixado é recusado com a frase, não em silêncio", async ({ page }) => {
    const handle = await entrarNoApp(page, "quartofixo");
    for (const titulo of ["Um", "Dois", "Três"]) {
      await criarPost(handle, titulo, { fixado: true });
    }
    await criarPost(handle, "Quatro");

    await page.goto("/perfil?post=quatro");
    await perfilCarregado(page, handle);

    await page.getByRole("button", { name: "Mais opções do post" }).click();
    await page.getByRole("button", { name: "Fixar no perfil" }).click();

    // `alerta()` e não `getByRole("alert")`: o anunciador de rota do Next
    // também tem esse papel, e casa junto. O projeto já caiu nisso três
    // vezes — é por isso que a função existe.
    await expect(alerta(page)).toContainText(/até 3 posts/);
  });

  test("o visitante vê a Cabine, e não o menu do dono", async ({ page }) => {
    const dona = await entrarNoApp(page, "donapost");
    await criarPost(dona, "O que eu penso");

    await trocarDePessoa(page, "visitapost");
    await page.goto(`/${dona}?post=o-que-eu-penso`);
    await perfilCarregado(page, dona);

    await expect(page.getByRole("complementary", { name: "Post O que eu penso" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Conversar com/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mais opções do post" })).toHaveCount(0);
  });
});

test.describe("RN39: escrever um post", () => {
  test("RN39: escrevo, publico, e o post abre no painel", async ({ page }) => {
    const handle = await entrarNoApp(page, "escrever");
    await page.goto("/perfil");
    await perfilCarregado(page, handle);

    await page.getByRole("button", { name: "Novo post" }).click();
    await expect(page.getByRole("dialog", { name: "Novo post" })).toBeVisible();

    await page.getByLabel("Título").fill("Uma noite no galpão");
    await page.getByLabel("Parágrafo 1").fill("Toquei das 2h às 5h num galpão sem janela nenhuma.");

    await page.getByRole("button", { name: "+ Subtítulo" }).click();
    await page.getByLabel("Subtítulo 2").fill("O que funcionou");

    await page.getByRole("button", { name: "+ Parágrafo" }).click();
    await page.getByLabel("Parágrafo 3").fill("Começar mais lento do que eu queria.");

    await page.getByRole("button", { name: "Publicar" }).click();

    // Vai direto para o post publicado: é a melhor confirmação possível.
    await expect(page).toHaveURL(/post=uma-noite-no-galpao/);
    const painel = page.getByRole("complementary", { name: "Post Uma noite no galpão" });
    await expect(painel).toBeVisible();
    await expect(painel.getByRole("heading", { level: 2, name: "O que funcionou" })).toBeVisible();
    await expect(painel.getByText("Começar mais lento do que eu queria.")).toBeVisible();
  });

  test("o servidor calcula o resumo e o tempo de leitura", async ({ page }) => {
    const handle = await entrarNoApp(page, "resumo");
    await page.goto("/perfil");
    await perfilCarregado(page, handle);

    await page.getByRole("button", { name: "Novo post" }).click();
    await page.getByLabel("Título").fill("Discos por ano");
    await page.getByLabel("Parágrafo 1").fill("palavra ".repeat(400).trim());
    await page.getByRole("button", { name: "Publicar" }).click();
    await expect(page).toHaveURL(/post=discos-por-ano/);

    const [linha] = await consultar<{ excerpt: string; read_minutes: number }>(
      `SELECT excerpt, read_minutes FROM posts
        WHERE author_id = (SELECT id FROM profiles WHERE handle = '${handle}')`,
    );

    // 400 palavras a 200 por minuto. O resumo para em 200 caracteres.
    expect(linha?.read_minutes).toBe(2);
    expect(linha?.excerpt.length).toBeLessThanOrEqual(200);
    expect(linha?.excerpt).toMatch(/…$/);
  });

  test("sem título ou sem parágrafo, o botão diz o que falta", async ({ page }) => {
    const handle = await entrarNoApp(page, "oquefalta");
    await page.goto("/perfil");
    await perfilCarregado(page, handle);

    await page.getByRole("button", { name: "Novo post" }).click();
    const publicar = page.getByRole("button", { name: "Publicar" });

    await expect(publicar).toBeDisabled();
    await expect(page.getByText("Dê um título ao post.")).toBeVisible();

    await page.getByLabel("Título").fill("Tem título");
    await expect(page.getByText("Escreva ao menos um parágrafo.")).toBeVisible();

    await page.getByLabel("Parágrafo 1").fill("Agora tem texto.");
    await expect(publicar).toBeEnabled();
  });

  test("dá para reordenar e tirar blocos", async ({ page }) => {
    const handle = await entrarNoApp(page, "reordenar");
    await page.goto("/perfil");
    await perfilCarregado(page, handle);

    await page.getByRole("button", { name: "Novo post" }).click();
    await page.getByLabel("Título").fill("Fora de ordem");
    await page.getByLabel("Parágrafo 1").fill("Era o primeiro.");
    await page.getByRole("button", { name: "+ Parágrafo" }).click();
    await page.getByLabel("Parágrafo 2").fill("Era o segundo.");

    await page.getByRole("button", { name: "Mover o bloco 2 para cima" }).click();
    await page.getByRole("button", { name: "Publicar" }).click();

    await expect(page).toHaveURL(/post=fora-de-ordem/);
    const painel = page.getByRole("complementary", { name: "Post Fora de ordem" });
    const paragrafos = painel.locator("p");
    await expect(paragrafos.first()).toContainText("Era o segundo.");
  });

  test("dois posts com o mesmo título ganham endereços diferentes", async ({ page }) => {
    const handle = await entrarNoApp(page, "mesmotitulo");

    for (let vez = 0; vez < 2; vez++) {
      await page.goto("/perfil");
      await perfilCarregado(page, handle);
      await page.getByRole("button", { name: "Novo post" }).click();
      await page.getByLabel("Título").fill("Teoria do set");
      await page.getByLabel("Parágrafo 1").fill("Uma faixa que ninguém reconhece.");
      await page.getByRole("button", { name: "Publicar" }).click();
      await expect(page).toHaveURL(/post=teoria-do-set/);
    }

    const slugs = await consultar<{ slug: string }>(
      `SELECT slug FROM posts
        WHERE author_id = (SELECT id FROM profiles WHERE handle = '${handle}')
        ORDER BY created_at`,
    );

    // O nome continua valendo; só o endereço ganha um número.
    expect(slugs.map((l) => l.slug)).toEqual(["teoria-do-set", "teoria-do-set-2"]);
  });

  test("o visitante não tem como escrever no blog de outra pessoa", async ({ page }) => {
    const dona = await entrarNoApp(page, "donaescreve");

    await trocarDePessoa(page, "visitaescreve");
    await page.goto(`/${dona}`);
    await perfilCarregado(page, dona);

    await expect(page.getByText("Nenhum post ainda")).toBeVisible();
    await expect(page.getByRole("button", { name: "Novo post" })).toHaveCount(0);
  });
});
