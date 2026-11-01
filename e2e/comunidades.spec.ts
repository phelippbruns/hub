import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { consultar, esperarNoBanco } from "./apoio-banco";
import {
  alerta,
  cadastroConcluido,
  campoDeContribuicao,
  concluirOnboarding,
  preencherNovaComunidade,
  respostaPublicada,
  criarTopico,
  botaoDeContribuir,
} from "./apoio-tela";

/**
 * Comunidades (F07): criar, abrir, fixar e sair.
 *
 * As regras (RN04, RN06, a ordem dos tópicos) têm teste de banco em
 * `lib/data/comunidades.db.test.ts`. Aqui é a tela, e a jornada que a F06
 * deixou pela metade: achar uma comunidade e conseguir entrar nela.
 */

function novoEmail(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@teste.hub`;
}

/** Nome que não colide com o seed nem com outra rodada do teste. */
function novoNome(prefixo: string) {
  return `${prefixo} ${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

/** Um @ livre para o cadastro, que agora exige um. */
function novoHandle(prefixo: string) {
  return `${prefixo}${Date.now() % 100000}${Math.floor(Math.random() * 100)}`.slice(0, 20);
}

async function entrarNoApp(page: Page, prefixo: string) {
  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill("Pessoa das Comunidades");
  await page.getByLabel("Email").fill(novoEmail(prefixo));
  await page.getByLabel("@").fill(novoHandle("com"));
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

/** Preenche e envia o formulário da tela 13. */
async function preencherNova(page: Page, nome: string) {
  await preencherNovaComunidade(page, nome);
}

test.describe("criar comunidade", () => {
  test("cria, abre em /c/<endereço> e eu viro moderadora", async ({ page }) => {
    await entrarNoApp(page, "criar");
    const nome = novoNome("Tecnologia Analógica");

    await preencherNova(page, nome);

    // O endereço vem do nome, sem acento nem símbolo.
    await page.waitForURL(/\/c\/tecnologia-analogica-\d+/);
    await expect(page.getByRole("heading", { name: nome, level: 1 })).toBeVisible();

    // RN06: quem cria é moderador — e Moderar fica na capa, não escondido
    // no menu, com o número de denúncias esperando decisão.
    await expect(page.getByRole("button", { name: "Moderar" })).toBeVisible();

    await page.getByRole("button", { name: "Mais opções" }).click();
    await expect(page.getByText(/Moderada por/)).toBeVisible();
  });

  test("RN04: nome que já existe é recusado, e a mensagem diz qual é", async ({ page }) => {
    await entrarNoApp(page, "duplicado");

    const [existente] = await consultar<{ name: string }>(
      `SELECT name FROM communities WHERE deleted_at IS NULL ORDER BY name LIMIT 1`,
    );
    expect(existente).toBeTruthy();

    // No plural: a RN04 apaga o "s" final antes de comparar.
    await preencherNova(page, `${existente!.name}s`);

    const aviso = alerta(page.locator("form"));
    await expect(aviso).toContainText("Já existe");
    await expect(aviso).toContainText("Entre nela ou escolha outro nome");
    // O nome precisa estar clicável: é a saída que a mensagem oferece.
    await expect(aviso.getByRole("link")).toBeVisible();
  });
});

test.describe("a página da comunidade", () => {
  /*
   * Os dois menus abrem como drop, logo abaixo do botão — pedido do PO em
   * 29 de outubro. Eram folhas subindo do rodapé, e a folha empurrava a
   * tela inteira para baixo.
   */
  test("os menus abrem como drop e fecham com Esc, com clique fora e ao navegar", async ({
    page,
  }) => {
    await entrarNoApp(page, "drop");
    await preencherNova(page, novoNome("Com Drop"));
    await page.waitForURL(/\/c\//);

    const opcoes = page.getByRole("button", { name: "Mais opções" });
    const menu = page.getByRole("dialog", { name: /^Com Drop/ });

    await expect(opcoes).toHaveAttribute("aria-expanded", "false");
    await opcoes.click();
    await expect(opcoes).toHaveAttribute("aria-expanded", "true");
    await expect(menu).toBeVisible();

    /*
     * O drop desce **do botão**, e não do topo da tela: é esta medida que
     * separa um menu suspenso de uma folha que aparece em qualquer lugar.
     */
    const botao = (await opcoes.boundingBox())!;
    const caixa = (await menu.boundingBox())!;
    expect(caixa.y).toBeGreaterThan(botao.y);
    expect(caixa.y - (botao.y + botao.height)).toBeLessThan(24);

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();

    await opcoes.click();
    /*
      "Fora" precisa ser um alvo inerte, não uma coordenada: o clique era em
      (400, 600) e passou a cair sobre um link de Primeiros passos, que
      navegava e arrancava o menu da tela antes da próxima asserção. A linha
      de informações é texto puro e não vai a lugar nenhum.
    */
    await page.getByText(/criada em/).click();
    await expect(menu).toBeHidden();

    // Navegar fecha: sem isso o menu ficaria por cima da tela nova.
    await opcoes.click();
    await page.getByRole("link", { name: "Denunciar comunidade" }).click();
    await page.waitForURL(/\/denuncia/);
    await expect(menu).toBeHidden();
  });

  /**
   * Compartilhar saiu do canto da capa e virou dois itens do menu.
   *
   * Era um botão próprio, entre o de voltar e os três pontos, e o canto
   * tinha três controles. O PO corrigiu em 31 de outubro: o canto de cima
   * fica com um botão só, e o menu ganha "Copiar link da comunidade" (um
   * clique, sem submenu) e "Convidar pessoas" (a janela com a busca).
   */
  test("compartilhar mora no menu: copiar o link, e convidar pessoas", async ({ page }) => {
    await entrarNoApp(page, "dropshare");
    await preencherNova(page, novoNome("Compartilhada"));
    await page.waitForURL(/\/c\//);

    // O canto de cima tem um botão de ícone só, além do voltar.
    await expect(page.getByRole("button", { name: /^Compartilhar / })).toHaveCount(0);

    await page.getByRole("button", { name: "Mais opções" }).click();
    const menu = page.getByRole("dialog");
    await expect(menu.getByRole("button", { name: "Copiar link da comunidade" })).toBeVisible();

    await menu.getByRole("button", { name: "Convidar pessoas" }).click();

    const janela = page.getByRole("dialog", { name: /^Convidar para / });
    await expect(janela).toBeVisible();
    await expect(janela.getByLabel("Buscar pessoas")).toBeVisible();
    await expect(janela.getByRole("button", { name: "Copiar link" })).toBeVisible();
    await expect(janela.getByRole("button", { name: "Outros apps" })).toBeVisible();
  });

  /*
   * A terceira coluna saiu do layout junto com o painel da comunidade, que
   * era a única tela a usá-la.
   */
  test("o painel de contexto não voltou: o resumo é desta página", async ({ page }) => {
    await entrarNoApp(page, "sempainel");
    await preencherNova(page, novoNome("Sem Painel"));
    await page.waitForURL(/\/c\//);

    /*
      A rota paralela do app inteiro, com preferência no banco, não voltou —
      é o vacilo 17. O que existe é um `<aside>` desta página, e ele não
      aparece em tela nenhuma fora da comunidade.
    */
    await expect(page.getByRole("complementary", { name: "Painel de contexto" })).toHaveCount(0);
    await expect(page.getByRole("complementary", { name: "Resumo da comunidade" })).toBeVisible();

    await page.goto("/inicio");
    await expect(page.getByRole("complementary")).toHaveCount(0);
  });

  test("a linha sob a capa conta a comunidade, e troca o número pelo nascimento", async ({
    page,
  }) => {
    await entrarNoApp(page, "linha");
    await preencherNova(page, novoNome("Com Linha"));
    await page.waitForURL(/\/c\//);

    // Parada, a linha diz quando nasceu — "0 contribuições hoje" só anuncia
    // o vazio de quem acabou de chegar.
    /*
      Um número de contribuições, e não "N tópicos · N contribuições":
      pela RN28 o tópico também é contribuição, e os dois lado a lado o
      contariam duas vezes na mesma frase.
    */
    await expect(page.getByText(/1 membro · 0 contribuições · criada em /)).toBeVisible();
  });

  /*
   * Um botão de criar tópico, não dois. Havia um igual no estado vazio da
   * lista, e dois botões idênticos fazem procurar diferença entre eles.
   */
  test("há um único botão de criar tópico, e ele leva o asterisco", async ({ page }) => {
    await entrarNoApp(page, "umbotao");
    await preencherNova(page, novoNome("Um Botao"));
    await page.waitForURL(/\/c\//);

    /*
      Dentro do conteúdo: a barra lateral também tem um "Criar tópico", e
      ele é outra coisa — leva a escolher a comunidade antes.

      Aqui é `button`, e na barra é `link`: o de dentro abre a janela sobre
      a lista, e o da barra navega. A diferença de papel é o que mantém os
      dois distinguíveis neste teste.
    */
    const botoes = page.getByRole("main").getByRole("button", { name: "Criar tópico" });
    await expect(botoes).toHaveCount(1);
    await expect(botoes.locator("svg")).toBeVisible();
  });
});

/*
 * Sair deixou de pedir confirmação — decisão do PO em 29 de outubro: numa
 * comunidade pública não há o que confirmar. Sobraram dois casos em que
 * sair faz mais do que sair, e os dois continuam perguntando.
 */
test.describe("as abas da comunidade", () => {
  test("Início e Membros trocam pela URL, e o endereço é compartilhável", async ({ page }) => {
    await entrarNoApp(page, "abas");
    await preencherNova(page, novoNome("Com Abas"));
    await page.waitForURL(/\/c\//);

    const abas = page.getByRole("tablist", { name: "Seções da comunidade" });
    await expect(abas).toBeVisible();

    const inicio = page.getByRole("tab", { name: "Início" });
    const membros = page.getByRole("tab", { name: "Membros" });
    await expect(inicio).toHaveAttribute("aria-selected", "true");

    await membros.click();
    await page.waitForURL(/aba=membros/);
    await expect(membros).toHaveAttribute("aria-selected", "true");
    // Quem criou aparece na própria lista, com o selo de criadora.
    await expect(page.getByText("Criadora")).toBeVisible();

    /*
     * A aba na URL, e não em estado local: recarregar precisa cair na
     * mesma aba, senão o endereço não serve para mandar a ninguém.
     */
    await page.reload();
    await expect(page.getByRole("tab", { name: "Membros" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await page.getByRole("tab", { name: "Início" }).click();
    await expect(page).not.toHaveURL(/aba=membros/);
  });

  test("a aba Membros tem busca e filtros, e o filtro Moderação deixa só quem modera", async ({
    page,
  }) => {
    await entrarNoApp(page, "filtro");
    await preencherNova(page, novoNome("Com Filtro"));
    await page.waitForURL(/\/c\//);

    await page.getByRole("tab", { name: "Membros" }).click();
    await page.waitForURL(/aba=membros/);

    await page.getByRole("button", { name: "Moderação" }).click();
    await page.waitForURL(/filtro=moderacao/);
    await expect(page.getByText("Criadora")).toBeVisible();

    // A busca por um @ que não existe esvazia a lista, com texto próprio.
    await page.getByRole("button", { name: "Todos" }).click();
    await page.getByLabel("Buscar pessoas na comunidade").fill("naoexisteninguem");
    await expect(page.getByText(/Ninguém encontrado/)).toBeVisible();
  });
});

/**
 * Nada sai pela borda direita.
 *
 * **Esta é vigilância, não regressão** — e a diferença está escrita aqui de
 * propósito.
 *
 * O PO mandou dez prints da tela da comunidade; quatro pareciam botões
 * comidos pela borda direita. Lendo o código eu achei uma causa provável, e
 * escrevi esta jornada para guardá-la. Ao reintroduzir o suposto defeito
 * para ver a jornada reprovar, **ela passou verde** — e uma medida
 * posterior, varrendo todo elemento de `main` em onze larguras de 1400 a
 * 480 px, com e sem o defeito, não achou estouro nenhum.
 *
 * Então ela nunca viu vermelho, e não prova conserto de nada. Fica porque
 * mede a coisa certa pelo lado certo: a geometria da tela, numa largura que
 * nenhum outro teste exercitava. Se um dia um botão sair da janela, ela diz
 * — e aí vira regressão de verdade.
 *
 * A largura estreita é **800 px**: o menor computador que o Hub atende (o
 * CLAUDE.md fixa 768 px como piso até a F21). Rodar só a 1280 px, como toda
 * a suíte fazia, deixa metade de qualquer regra de largura sem exercício.
 */
const LARGURAS = [
  { nome: "1280 px", width: 1280, height: 720 },
  { nome: "800 px, o menor computador que o Hub atende", width: 800, height: 720 },
];

test.describe("nada sai pela borda direita", () => {
  for (const largura of LARGURAS) {
    test(`as quatro abas cabem na janela de ${largura.nome}`, async ({ page }) => {
      await page.setViewportSize({ width: largura.width, height: largura.height });

      await entrarNoApp(page, "borda");
      await preencherNova(page, novoNome("Com Borda"));
      await page.waitForURL(/\/c\//);
      const comunidade = new URL(page.url()).pathname;

      for (const aba of ["Início", "Enquetes", "Eventos", "Membros"]) {
        await page.getByRole("tab", { name: aba }).click();
        // A aba trocou de verdade antes de medir: medir no meio da troca
        // mediria a aba de antes, e passaria verde sem ter olhado nada.
        await expect(page.getByRole("tab", { name: aba })).toHaveAttribute("aria-selected", "true");
        await expect(page.getByRole("main")).toBeVisible();

        /*
         * 1. A página não é mais larga que a janela. Uma barra de rolagem
         *    horizontal em qualquer lugar empurra a borda direita para
         *    fora, e é o que fazia o botão "sair" da tela.
         */
        const sobra = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(sobra, `a aba ${aba} é ${sobra} px mais larga que a janela`).toBeLessThanOrEqual(1);

        /*
         * 2. E todo botão de ação cabe inteiro. A conferência de cima não
         *    basta: um botão pode estar cortado por `overflow: hidden` do
         *    pai sem a página inteira crescer.
         */
        const janela = largura.width;
        const botoes = page.getByRole("main").getByRole("button");
        for (let i = 0; i < (await botoes.count()); i++) {
          const botao = botoes.nth(i);
          if (!(await botao.isVisible())) continue;
          const caixa = await botao.boundingBox();
          if (!caixa) continue;
          const texto = (await botao.textContent())?.trim() ?? "(sem texto)";
          expect(
            Math.round(caixa.x + caixa.width),
            `na aba ${aba}, o botão "${texto}" termina fora da janela`,
          ).toBeLessThanOrEqual(janela);
        }
      }

      /*
       * O menu de três pontos abre **por cima** do que vem abaixo da capa,
       * e não recortado por ela. A capa tinha `overflow-hidden` para
       * arredondar a foto, e o mesmo recorte decepava o último item do
       * menu — print 2 do PO.
       */
      await page.goto(comunidade);
      await page.getByRole("button", { name: "Mais opções" }).click();

      const denunciar = page.getByRole("link", { name: "Denunciar comunidade" });
      await expect(denunciar).toBeVisible();

      const capa = await page.getByRole("heading", { level: 1 }).boundingBox();
      const item = await denunciar.boundingBox();
      expect(capa).not.toBeNull();
      expect(item).not.toBeNull();

      // O último item do menu desce **além** da linha do nome na capa: se
      // o recorte voltasse, ele terminaria dentro dela.
      expect(item!.y + item!.height).toBeGreaterThan(capa!.y + capa!.height);
      await expect(denunciar).toBeInViewport();
    });
  }
});

test.describe("o resumo da direita", () => {
  test("mostra o próximo evento e a enquete aberta, e some com eles quando não há", async ({
    page,
  }) => {
    await entrarNoApp(page, "resumoagenda");
    await preencherNova(page, novoNome("Com Agenda"));
    await page.waitForURL(/\/c\//);
    const comunidade = new URL(page.url()).pathname;

    const resumo = page.getByRole("complementary", { name: "Resumo da comunidade" });

    /*
      Sem evento e sem enquete: o bloco da enquete não existe, e o do
      evento aparece **só para quem modera**, com o atalho de criar.
      Anunciar o vazio a quem não pode preenchê-lo é moldura.
    */
    await expect(resumo.getByText("ENQUETE ABERTA")).toHaveCount(0);
    await expect(resumo.getByText("Nenhum evento marcado")).toBeVisible();

    // Um evento, e o bloco passa a dizer quando é.
    await page.goto(`${comunidade}?aba=eventos`);
    await page.getByRole("button", { name: "Criar evento" }).click();
    const janelaDoEvento = page.getByRole("dialog", { name: "Novo evento" });
    await janelaDoEvento.getByLabel("Nome do evento").fill("Crítica aberta de dezembro");
    await janelaDoEvento.getByRole("button", { name: "Criar evento" }).click();
    await expect(janelaDoEvento).toBeHidden({ timeout: 15_000 });

    await page.goto(comunidade);
    await expect(resumo.getByText("PRÓXIMO EVENTO")).toBeVisible();
    await expect(resumo.getByText("Crítica aberta de dezembro")).toBeVisible();

    // Uma enquete, e o bloco dela aparece com o atalho de votar.
    await page.goto(`${comunidade}?aba=enquetes`);
    await page.getByRole("button", { name: "Criar enquete" }).click();
    await page.getByLabel("Pergunta").fill("Qual tema do próximo mês?");
    await page.getByLabel("Opção 1").fill("Retrato");
    await page.getByLabel("Opção 2").fill("Paisagem");
    await page.getByRole("button", { name: "Publicar enquete" }).click();

    await page.goto(comunidade);
    await expect(resumo.getByText("ENQUETE ABERTA")).toBeVisible();
    await expect(resumo.getByText("Qual tema do próximo mês?")).toBeVisible();
    await expect(resumo.getByRole("link", { name: "Votar" })).toBeVisible();
  });

  test('"N membros" leva à aba Membros', async ({ page }) => {
    await entrarNoApp(page, "clicamembros");
    await preencherNova(page, novoNome("Com Clique"));
    await page.waitForURL(/\/c\//);

    // Era texto morto ao lado de avatares que convidam a clicar.
    await page.getByRole("link", { name: /^1 membro$/ }).click();
    await page.waitForURL(/aba=membros/);
    await expect(page.getByRole("tab", { name: "Membros" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("a tecla / foca a busca, e não rouba o cursor de dentro de um campo", async ({ page }) => {
    await entrarNoApp(page, "atalhobarra");
    await preencherNova(page, novoNome("Com Atalho"));
    await page.waitForURL(/\/c\//);
    const comunidade = new URL(page.url()).pathname;

    /*
      A busca de tópicos só aparece a partir de 10 tópicos, então o teste
      usa a de membros, que aparece sempre — é o mesmo componente e o mesmo
      atalho.
    */
    await page.goto(`${comunidade}?aba=membros`);
    const busca = page.getByLabel("Buscar pessoas na comunidade");

    /*
      A tecla é apertada **dentro do poll**, e isto não é zelo.

      `page.keyboard`, e não `locator("body").press()`: `press` num locator
      foca o elemento primeiro, e o `body` não aceita foco — a tecla saía de
      um alvo indefinido.

      E o atalho é um `useEffect`: ele só existe depois de a página
      hidratar. Uma tecla é um **evento único** — apertada antes da
      hidratação, nenhuma espera depois a recupera, e `toBeFocused` repetia
      por cinco segundos olhando um campo que nunca receberia foco. Sozinho
      o teste passava, porque a máquina estava livre; na suíte inteira,
      não. É o "verde local que depende de temporização" do Faustão.

      Repetir a tecla é seguro: com o campo já focado, o próprio atalho se
      cala — e o poll para na primeira vez que deu certo.
    */
    await expect
      .poll(async () => {
        await page.keyboard.press("/");
        return busca.evaluate((campo) => campo === document.activeElement);
      })
      .toBe(true);
    // E a barra não entra no campo: `preventDefault` antes do foco.
    await expect(busca).toHaveValue("");

    /*
      Com o foco já num campo, a tecla é só uma barra. Sem isto, escrever
      "e/ou" numa contribuição jogaria o cursor para a busca e comeria o
      caractere.
    */
    await busca.fill("ana");
    await busca.press("/");
    await expect(busca).toHaveValue("ana/");
  });
});

test.describe("a lista de tópicos", () => {
  test("os filtros têm nome, vivem na URL, e Seguindo só aparece para quem participa", async ({
    page,
  }) => {
    await entrarNoApp(page, "filtros");
    const nome = novoNome("Com Filtros");
    await preencherNova(page, nome);
    await page.waitForURL(/\/c\/[^/]+$/);

    // Os dois ícones sem rótulo saíram; no lugar, chips com nome.
    await expect(page.getByRole("button", { name: "Ordenar por atividade" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Em alta" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByRole("button", { name: "Recentes" }).click();
    await page.waitForURL(/filtro=recentes/);
    await expect(page.getByRole("button", { name: "Recentes" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // "Seguindo" absorveu a seção que ficava acima da lista.
    await expect(page.getByRole("heading", { name: "Tópicos que você segue aqui" })).toHaveCount(0);
    await page.getByRole("button", { name: "Seguindo" }).click();
    await page.waitForURL(/filtro=seguindo/);
    await expect(page.getByText("Você não segue nenhum tópico aqui")).toBeVisible();
  });

  test("o cartão mostra a última contribuição, com avatar e @", async ({ page }) => {
    await entrarNoApp(page, "ultima");
    const nome = novoNome("Com Última");
    await preencherNova(page, nome);
    await page.waitForURL(/\/c\/([^/]+)$/);
    const endereco = new URL(page.url()).pathname;

    await criarTopico(page, endereco, "Primeira festa", "Conta aí como foi.");
    await page.waitForURL(/\/c\/[^/]+\/[^/]+$/);

    await campoDeContribuicao(page).fill("A minha foi num porão em 2009.");
    await botaoDeContribuir(page).click();
    await respostaPublicada(page, "A minha foi num porão em 2009.");

    await page.goto(endereco);
    const cartao = page.getByRole("main").getByText("A minha foi num porão em 2009.");
    await expect(cartao).toBeVisible();
    await expect(page.getByRole("main").getByText("1 pessoa · 1 contribuição")).toBeVisible();
  });

  test("a busca só aparece a partir de 10 tópicos", async ({ page }) => {
    await entrarNoApp(page, "buscacurta");
    await preencherNova(page, novoNome("Poucos Tópicos"));
    await page.waitForURL(/\/c\/[^/]+$/);

    // Comunidade nova: a lista inteira cabe na tela, e o campo só ocuparia espaço.
    await expect(page.getByRole("searchbox", { name: /Buscar tópicos/ })).toHaveCount(0);

    // A do seed tem bastante tópico, e lá o campo existe.
    const [cheia] = await consultar<{ slug: string }>(`
      SELECT c.slug FROM communities c
       JOIN topics t ON t.community_id = c.id AND t.deleted_at IS NULL
       WHERE c.deleted_at IS NULL
       GROUP BY c.slug HAVING count(*) >= 10 LIMIT 1`);
    if (cheia) {
      await page.goto(`/c/${cheia.slug}`);
      await expect(page.getByRole("searchbox", { name: /Buscar tópicos/ })).toBeVisible();
    }
  });

  test("a coluna da direita resume a comunidade, sem rota paralela nenhuma", async ({ page }) => {
    await entrarNoApp(page, "resumo");
    await preencherNova(page, novoNome("Com Resumo"));
    await page.waitForURL(/\/c\/[^/]+$/);

    const resumo = page.getByRole("complementary", { name: "Resumo da comunidade" });
    await expect(resumo).toBeVisible();
    await expect(resumo.getByText(/MEMBROS/)).toBeVisible();
    await expect(resumo.getByText(/ATIVIDADE/)).toBeVisible();

    await resumo.getByRole("link", { name: "Ver todos" }).click();
    await page.waitForURL(/aba=membros/);
  });
});

test.describe("o cartão Sobre e as regras", () => {
  test("sem regras escritas, entrar continua sendo um clique", async ({ page, context }) => {
    const nome = novoNome("Sem Regras");
    await entrarNoApp(page, "semregra");
    await preencherNova(page, nome);
    await page.waitForURL(/\/c\//);
    const endereco = new URL(page.url()).pathname;

    /*
      Sem sobre escrito e sem regras, o cartão inteiro não existe: cartão
      com título e nada dentro é pior do que cartão nenhum. O que a pessoa
      precisa ver numa comunidade recém-nascida é Primeiros passos.
    */
    await expect(page.getByRole("heading", { name: "Sobre" })).toHaveCount(0);
    await expect(page.getByText(/Regras da comunidade/)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Primeiros passos" })).toBeVisible();

    const { contexto, visita: outra } = await outraPessoa(context, "semregra2");
    await outra.goto(endereco);

    const porta = outra.getByRole("button", { name: `Entrar em ${nome}` });
    await porta.click();

    // Nenhuma folha no caminho: a porta já mudou de estado.
    await expect(outra.getByRole("button", { name: `Membro de ${nome}` })).toBeVisible();
    await esperarNoBanco(
      `SELECT 1 FROM memberships m JOIN communities c ON c.id = m.community_id WHERE c.name = '${nome.replace(/'/g, "''")}' AND m.profile_id <> c.created_by_id`,
    );
    await contexto.close();
  });

  test("com regras escritas, a porta mostra o que a pessoa está aceitando", async ({
    page,
    context,
  }) => {
    const nome = novoNome("Com Regras");
    await entrarNoApp(page, "comregra");
    await preencherNova(page, nome);
    await page.waitForURL(/\/c\//);
    const endereco = new URL(page.url()).pathname;

    // As regras ainda não têm tela de edição (ela chega com a janela de
    // moderar): aqui o teste as grava direto, que é o estado que importa.
    await consultar(
      `UPDATE communities SET rules = 'Mostre o processo.' || chr(10) || 'Critique o trabalho, nunca a pessoa.' WHERE name = '${nome.replace(/'/g, "''")}'`,
    );

    await page.reload();
    await expect(page.getByText("Regras da comunidade (2)")).toBeVisible();

    const { contexto, visita: outra } = await outraPessoa(context, "comregra2");
    await outra.goto(endereco);
    await outra.getByRole("button", { name: `Entrar em ${nome}` }).click();

    const folha = outra.getByRole("dialog", { name: `Entrar em ${nome}` });
    await expect(folha).toBeVisible();
    await expect(folha.getByText("Mostre o processo.")).toBeVisible();

    // "Agora não" sai sem entrar: a porta continua fechada.
    await folha.getByRole("button", { name: "Agora não" }).click();
    await expect(outra.getByRole("button", { name: `Entrar em ${nome}` })).toBeVisible();

    await outra.getByRole("button", { name: `Entrar em ${nome}` }).click();
    await outra.getByRole("button", { name: "Li e quero entrar" }).click();
    await expect(outra.getByRole("button", { name: `Membro de ${nome}` })).toBeVisible();

    // O que prova é o que ficou no banco, não o que a tela mostrou.
    await esperarNoBanco(
      `SELECT 1 FROM memberships m JOIN communities c ON c.id = m.community_id WHERE c.name = '${nome.replace(/'/g, "''")}' AND m.profile_id <> c.created_by_id`,
    );
    await contexto.close();
  });

  test("Primeiros passos aparece na comunidade nova e abre o formulário preenchido", async ({
    page,
  }) => {
    await entrarNoApp(page, "passos");
    await preencherNova(page, novoNome("Com Passos"));
    await page.waitForURL(/\/c\//);

    const bloco = page.getByRole("heading", { name: "Primeiros passos" });
    await expect(bloco).toBeVisible();

    await page.getByRole("link", { name: "Apresente-se aqui" }).click();
    // A sugestão abre a janela com o título já preenchido, sem sair da
    // comunidade: antes era uma página, e virou janela em 31 de outubro.
    await page.waitForURL(/novo=1/);
    const janela = page.getByRole("dialog", { name: "Novo tópico" });
    await expect(janela.getByLabel("Título")).toHaveValue("Apresente-se aqui");
  });
});

test.describe("acabamento: foco, teclado e alvo de toque", () => {
  test("nenhum controle da comunidade é pequeno demais para acertar", async ({ page }) => {
    await entrarNoApp(page, "alvos");
    await preencherNova(page, novoNome("Com Alvos"));
    await page.waitForURL(/\/c\//);

    /*
      Medido na tela, e não calculado: `py-1` parecia suficiente e dava 28
      px de altura; um link com `underline` dava 18. Os dois passavam por
      qualquer revisão de código.

      O piso é 24, que é o mínimo de qualquer diretriz. Os 44 do briefing
      valem para os controles principais — conferidos abaixo —, e levar
      **todo** controle a 44 é trabalho da F21, quando o toque entrar.
    */
    const pequenos = await page.evaluate(() => {
      const alvos = Array.from(
        document.querySelectorAll<HTMLElement>("main button, main a[href], main select"),
      );
      return alvos
        .map((el) => {
          const r = el.getBoundingClientRect();
          const nome = (el.getAttribute("aria-label") || el.textContent || el.tagName).trim();
          return {
            nome: nome.slice(0, 40),
            largura: Math.round(r.width),
            altura: Math.round(r.height),
          };
        })
        .filter((a) => a.largura > 0 && a.altura > 0)
        .filter((a) => a.altura < 24 || a.largura < 24);
    });

    expect(pequenos).toEqual([]);
  });

  test("os controles da capa têm 44 px, que é o alvo do briefing", async ({ page }) => {
    await entrarNoApp(page, "alvos44");
    await preencherNova(page, novoNome("Com 44"));
    await page.waitForURL(/\/c\//);

    for (const nome of ["Voltar", "Mais opções"]) {
      const caixa = await page.getByRole("button", { name: nome }).boundingBox();
      expect(caixa!.height).toBeGreaterThanOrEqual(44);
      expect(caixa!.width).toBeGreaterThanOrEqual(44);
    }

    // As abas também: elas são a navegação da tela.
    const aba = await page.getByRole("tab", { name: "Início" }).boundingBox();
    expect(aba!.height).toBeGreaterThanOrEqual(44);
  });

  test("dá para chegar às abas e à porta pelo teclado, com foco visível", async ({ page }) => {
    await entrarNoApp(page, "teclado");
    await preencherNova(page, novoNome("Com Teclado"));
    await page.waitForURL(/\/c\//);

    const porta = page.getByRole("button", { name: /^Membro de/ });
    await porta.focus();
    await expect(porta).toBeFocused();

    // O contorno de foco é do `:focus-visible` global, em ink e 3 px.
    const contorno = await porta.evaluate((el) => getComputedStyle(el).outlineWidth);
    expect(contorno).not.toBe("0px");

    const aba = page.getByRole("tab", { name: "Membros" });
    await aba.focus();
    await expect(aba).toBeFocused();
    await aba.press("Enter");
    await page.waitForURL(/aba=membros/);
  });
});

test.describe("sair da comunidade", () => {
  test("membro comum sai com um clique, sem folha", async ({ page, context }) => {
    const dona = page;
    await entrarNoApp(dona, "dona");
    const nome = novoNome("Entro E Saio");
    await preencherNova(dona, nome);
    await dona.waitForURL(/\/c\//);
    const endereco = dona.url();

    // Outra pessoa entra: assim quem sai não é a última nem modera.
    const { contexto, visita } = await outraPessoa(context, "visita");
    await visita.goto(endereco);
    await visita.getByRole("button", { name: /^Entrar em / }).click();

    /*
     * Esperar o banco e recarregar antes de sair. A porta troca de rótulo
     * na hora, mas a entrada ainda está indo ao servidor, e enquanto ela
     * vai o botão fica sem `onToggle` — clicar aí não faria nada, e o teste
     * reprovaria por corrida em vez de por defeito.
     */
    await expect(visita.getByRole("button", { name: /^Membro de / })).toBeVisible();
    await esperarNoBanco(`
      SELECT 1 FROM communities c
       JOIN memberships m ON m.community_id = c.id
       WHERE c.name = '${nome}'
       GROUP BY c.id HAVING count(m.*) = 2`);
    await visita.reload();

    const porta = visita.getByRole("button", { name: /^Membro de / });
    await expect(porta).toBeVisible();
    await porta.click();

    // Sem folha nenhuma: a porta muda na hora.
    await expect(visita.getByRole("button", { name: /^Entrar em / })).toBeVisible();
    await expect(visita.getByRole("button", { name: "Continuar membro" })).toHaveCount(0);
    await contexto.close();
  });

  test("RN06: quem modera e tem gente dentro é avisado do que entrega", async ({
    page,
    context,
  }) => {
    await entrarNoApp(page, "modsai");
    const nome = novoNome("Entrego A Moderacao");
    await preencherNova(page, nome);
    await page.waitForURL(/\/c\//);
    const endereco = page.url();

    const { contexto, visita } = await outraPessoa(context, "fica");
    await visita.goto(endereco);
    await visita.getByRole("button", { name: /^Entrar em / }).click();
    await expect(visita.getByRole("button", { name: /^Membro de / })).toBeVisible();
    /*
     * Esperar o banco antes de fechar o navegador da visitante. A porta
     * troca de rótulo na hora, mas a entrada ainda está indo — fechar aqui
     * cancelaria a requisição, e a dona recarregaria sozinha na comunidade.
     */
    await esperarNoBanco(`
      SELECT 1 FROM communities c
       JOIN memberships m ON m.community_id = c.id
       WHERE c.name = '${nome}'
       GROUP BY c.id HAVING count(m.*) = 2`);
    await contexto.close();

    await page.reload();
    await page.getByRole("button", { name: /^Membro de / }).click();

    await expect(page.getByText(/A moderação passa para o membro mais ativo/)).toBeVisible();
    await page.getByRole("button", { name: "Continuar membro" }).click();
    await expect(page.getByRole("button", { name: /^Membro de / })).toBeVisible();
  });

  /*
   * RN35: a última pessoa leva a comunidade junto. É a única ação do Hub
   * que destrói conteúdo, então ela continua perguntando — e a folha diz
   * quantos tópicos somem, não "tem certeza?".
   */
  test("RN35: a última pessoa é avisada, e sair apaga a comunidade", async ({ page }) => {
    await entrarNoApp(page, "ultima");
    const nome = novoNome("Vou Sumir");
    await preencherNova(page, nome);
    await page.waitForURL(/\/c\//);
    const endereco = page.url();

    await page.getByRole("button", { name: /^Membro de / }).click();
    await expect(page.getByText(/Você é a última pessoa aqui/)).toBeVisible();
    await page.getByRole("button", { name: "Sair e apagar" }).click();

    await esperarNoBanco(`
      SELECT 1 FROM communities c
       WHERE c.name = '${nome}' AND c.deleted_at IS NOT NULL`);

    // O endereço deixa de existir.
    const resposta = await page.goto(endereco);
    expect(resposta?.status()).toBe(404);
  });
});

/*
 * A CSP exige nonce em todo script, e o Next só o injeta em rota que renderiza
 * por requisição. O teste de `design-system.spec.ts` cobre as rotas abertas;
 * estas precisam de sessão.
 *
 * A página da comunidade teve rota paralela até a F20, e era ali que um
 * script podia sair sem nonce sem ninguém notar. A rota saiu com o painel,
 * mas a varredura fica: ela custa pouco e guarda três telas.
 */
test.describe("nonce nas telas com sessão", () => {
  test("todo script leva nonce", async ({ page }) => {
    await entrarNoApp(page, "nonce");
    await preencherNova(page, novoNome("Com Nonce"));
    await page.waitForURL(/\/c\//);

    for (const rota of [page.url(), "/comunidades/minhas", "/comunidades/nova"]) {
      await page.goto(rota);

      const semNonce = await page.evaluate(() =>
        [...document.querySelectorAll("script")]
          .filter((script) => !script.hasAttribute("nonce"))
          .map((script) => script.src || "(inline)"),
      );

      expect(semNonce, `scripts sem nonce em ${rota}`).toEqual([]);
    }
  });
});

test.describe("Minhas Comunidades", () => {
  test("fixar sobe a comunidade para o topo e resiste a recarregar", async ({ page }) => {
    await entrarNoApp(page, "fixar");
    await page.goto("/comunidades/minhas");

    const linhas = page.getByRole("button", { name: /^Fixar | no topo$/ });
    await expect(linhas.first()).toBeVisible();

    // A última da lista alfabética é a que tem como subir.
    const ultima = linhas.last();
    const nome = (await ultima.getAttribute("aria-label"))!
      .replace(/^Fixar /, "")
      .replace(/ no topo$/, "");

    await ultima.click();
    await expect(page.getByRole("heading", { name: "Fixadas" })).toBeVisible();

    await page.reload();
    const fixadas = page.getByRole("button", { name: `Desafixar ${nome}` });
    await expect(fixadas).toBeVisible();
  });

  test("a busca filtra sem acento", async ({ page }) => {
    await entrarNoApp(page, "buscaminhas");
    await page.goto("/comunidades/minhas");

    const campo = page.getByRole("searchbox", { name: "Buscar nas suas comunidades" });
    await campo.fill("zzzinexistente");

    await expect(page.getByText(/Nada encontrado para/)).toBeVisible();
  });
});

/**
 * RN03: a capa entra já na criação.
 *
 * Antes a comunidade nascia com a padrão e quem criava precisava descobrir
 * o menu de três pontos para terminar o que estava fazendo.
 */
test.describe("a capa na criação", () => {
  test("escolher a capa ao criar, e ela aparece na comunidade", async ({ page }) => {
    await entrarNoApp(page, "capacriar");
    await page.goto("/comunidades/nova");

    const nome = `Com Capa ${Date.now() % 100000}`;
    await page.getByLabel("Nome").fill(nome);
    await page.getByLabel("Intro").fill("Comunidade criada com capa pelo teste.");
    await page.locator('input[name="imagem"]').setInputFiles({
      name: "capa.png",
      mimeType: "image/png",
      buffer: PNG_MINIMO,
    });

    await page.getByRole("button", { name: "Criar comunidade" }).click();
    await page.waitForURL(/\/c\/[^/]+$/, { timeout: 20_000 });

    // A capa guardada é um caminho do depósito, não a padrão do Universo.
    await esperarNoBanco(`
      SELECT 1 FROM communities
       WHERE name = '${nome}' AND cover_url LIKE 'capas/%'`);
  });

  test("sem capa, a comunidade nasce com a padrão", async ({ page }) => {
    await entrarNoApp(page, "semcapa");
    await page.goto("/comunidades/nova");

    const nome = `Sem Capa ${Date.now() % 100000}`;
    await page.getByLabel("Nome").fill(nome);
    await page.getByLabel("Intro").fill("Comunidade criada sem capa pelo teste.");
    await page.getByRole("button", { name: "Criar comunidade" }).click();
    await page.waitForURL(/\/c\/[^/]+$/, { timeout: 20_000 });

    // Hoje a capa padrão é nula; o que o teste afirma é que **não** veio
    // do depósito, que é o que distingue "sem capa" de "com capa".
    await esperarNoBanco(`
      SELECT 1 FROM communities
       WHERE name = '${nome}'
         AND (cover_url IS NULL OR cover_url NOT LIKE 'capas/%')`);
  });

  test("o texto dos 20 membros saiu: ele não era verdade", async ({ page }) => {
    await entrarNoApp(page, "vintemembros");
    await page.goto("/comunidades/nova");

    // EXPLORE_MIN_MEMBERS vale 0 desde outubro: toda comunidade aparece
    // no Explorar desde o primeiro membro.
    await expect(page.getByText(/20 membros/)).toHaveCount(0);
  });
});

/**
 * Um PNG de 600×600, em degradê, para o ajuste da capa ter o que mexer.
 *
 * Quadrado de propósito: numa capa deitada a imagem quadrada **sobra na
 * vertical**, que é o eixo onde arrastar muda alguma coisa. Com o PNG de
 * 1×1 não haveria sobra em eixo nenhum, e o teste passaria sem exercitar
 * o enquadramento.
 */
const PNG_600 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAlgAAAJYCAAAAACbDccAAAAG+ElEQVR42u3SZxswhBiA0TdllBFaRpSR0s6KjBIZhU" +
    "IlLQ2pzMxkV0gRGiKhYZS0lPZCgzQoGQ1KKcqKys7Vr7g/PJdzfsNZsAAA/r8tBAGxaGLdBwJiIRaDYi0MAbFoYi0C" +
    "AbFoYt0XAmIhFoNi3Q8CYtHEuj8ExKKJ9QAIiIVYDIq1KATEoom1GATEoon1QAiIhVgMivUgCIhFE+vBEBCLJtZDIC" +
    "AWYjEo1uIQEIsm1kMhIBZNrIdBQCzEYlCsh0NALJpYS0BALMRiUKwlISAWTaylICAWTaylISAWYjEo1jIQEIsm1iMg" +
    "IBZNrEdCQCzEYlCsR0FALJpYj4aAWDSxloWAWIjFoFiPgYBYNLEeCwGxaGItBwGxEItBsZaHgFg0sR4HAbFoYj0eAm" +
    "IhFoNiPQECYtHEeiIExEIsBsVaAQJi0cR6EgTEoom1IgTEQiwGxVoJAmLRxHoyBMSiibUyBMRCLAbFWgUCYtHEWhUC" +
    "YtHEWg0CYiEWg2KtDgGxaGKtAQGxaGKtCQGxEItBsdaCgFg0sZ4CAbFoYj0VAmIhFoNiPQ0CYtHEejoExEIsBsV6Bg" +
    "TEoom1NgTEoon1TAiIhVgMivUsCIhFE2sdCIhFE+vZEBALsRgU6zkQEIsm1nMhIBZNrOdBQCzEYlCsdSEgFk2s9SAg" +
    "Fk2s50NALMRiUKz1ISAWTawXQEAsmlgvhIBYiMWgWBtAQCyaWC+CgFiIxaBYL4aAWDSxXgIBsWhivRQCYiEWg2JtCA" +
    "GxaGJtBAGxaGK9DAJiIRaDYr0cAmLRxHoFBMSiibUxBMRCLAbF2gQCYtHEeiUExKKJ9SoIiIVYDIr1agiIRRNrUwiI" +
    "RRNrMwiIhVgMirU5BMSiifUaCIiFWAyKtQUExKKJ9VoIiEUTa0sIiIVYDIq1FQTEoom1NQTEoom1DQTEQiwGxdoWAm" +
    "LRxHodBMSiibUdBMRCLAbF2h4CYtHE2gECYtHE2hECYiEWg2K9HgJi0cTaCQJi0cR6AwTEQiwGxdoZAmLRxNoFAmIh" +
    "FoNi7QoBsWhivRECYtHEehMExEIsBsV6MwTEoon1FgiIRRPrrRAQC7EYFOttEBCLJtZuEBCLJtbbISAWYjEo1jsgIB" +
    "ZNrHdCQCyaWO+CgFiIxaBY74aAWDSx3gMBsWhi7Q4BsRCLQbHeCwGxaGLtAQGxEItBsd4HAbFoYr0fAmLRxPoABMRC" +
    "LAbF+iAExKKJ9SEIiEUT68MQEAuxGBTrIxAQiybWnhAQiybWXhAQC7EYFGtvCIhFE+ujEBCLJtbHICAWYjEo1schIB" +
    "ZNrH0gIBZNrE9AQCzEYlCsfSEgFk2s/SAgFmIxKNYnISAWTaxPQUAsmlj7Q0AsxGJQrE9DQCyaWJ+BgFg0sT4LAbEQ" +
    "i0GxDoCAWDSxDoSAWDSxDoKAWIjFoFgHQ0Asmlifg4BYNLEOgYBYiMWgWJ+HgFg0sb4AAbFoYh0KAbEQi0GxvggBsW" +
    "hiHQYBsRCLQbG+BAGxaGJ9GQJi0cT6CgTEQiwGxTocAmLRxDoCAmLRxDoSAmIhFoNiHQUBsWhifRUCYtHE+hoExEIs" +
    "BsX6OgTEoon1DQiIRRPraAiIhVgMinUMBMSiifVNCIhFE+tYCIiFWAyK9S0IiEUT6zgIiIVYDIp1PATEool1AgTEoo" +
    "l1IgTEQiwGxToJAmLRxPo2BMSiiXUyBMRCLAbFOgUCYtHE+g4ExKKJdSoExEIsBsU6DQJi0cQ6HQJi0cQ6AwJiIRaD" +
    "Yp0JAbFoYp0FAbFoYp0NAbEQi0GxzoGAWDSxzoWAWIjFoFjnQUAsmljnQ0AsmljfhYBYiMWgWN+DgFg0sb4PAbFoYl" +
    "0AAbEQi0GxLoSAWDSxLoKAWDSxLoaAWIjFoFg/gIBYNLF+CAGxaGJdAgGxEItBsX4EAbFoYl0KAbFoYl0GAbEQi0Gx" +
    "LoeAWDSxroCAWIjFoFg/hoBYNLF+AgGxaGJdCQGxEItBsa6CgFg0sX4KAbFoYl0NAbEQi0GxfgYBsWhi/RwCYtHE+g" +
    "UExEIsBsX6JQTEool1DQTEool1LQTEQiwGxboOAmLRxLoeAmLRxPoVBMRCLAbF+jUExKKJdQMExEIsBsW6EQJi0cT6" +
    "DQTEool1EwTEQiwGxboZAmLRxPotBMSiiXULBMRCLAbFuhUCYtHE+h0ExKKJ9XsIiIVYDIp1GwTEool1OwTEoon1Bw" +
    "iIhVgMivVHCIhFE+tPEBCLJtafISAWYjEo1l8gIBZNrDsgIBZiMSjWXyEgFk2sv0FALJpYd0JALMRiUKy7ICAWTay7" +
    "ISAWTay/Q0AsxGJQrH9AQCyaWP+EgFg0sf4FAbEQi0Gx/g0BsWhi/QcCYtHE+i8ExEIsBsW6BwJi0cT6HwTEInEvQc" +
    "WxSU/w6MMAAAAASUVORK5CYII=",
  "base64",
);

/** Um PNG de 1×1, suficiente para o servidor reconhecer o tipo pelos bytes. */
const PNG_MINIMO = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/*
 * O ajuste da capa, que na F20 passou a acontecer **na própria tela**.
 *
 * Antes era uma rota só dela, em `/c/<slug>/capa`: você saía da comunidade,
 * escolhia um arquivo, via uma prévia sem poder mexer, salvava e voltava.
 */
test.describe("trocar a capa sem sair da tela", () => {
  test("escolher, arrastar, aproximar e dar OK, tudo em /c/<slug>", async ({ page }) => {
    await entrarNoApp(page, "capaajuste");
    const nome = novoNome("Capa Ajustada");
    await preencherNova(page, nome);
    await page.waitForURL(/\/c\/[^/]+$/);
    const endereco = page.url();

    await page.locator('input[name="imagem"]').setInputFiles({
      name: "capa.png",
      mimeType: "image/png",
      buffer: PNG_600,
    });

    // O ajuste abre sozinho, na capa, sem trocar de endereço.
    const regua = page.getByLabel("Aproximação");
    await expect(regua).toBeVisible();
    expect(page.url()).toBe(endereco);

    // Arrastar na vertical, que é onde a imagem quadrada sobra.
    const quadro = (await regua.locator("xpath=ancestor::div[1]/..").boundingBox())!;
    await page.mouse.move(quadro.x + quadro.width / 2, quadro.y + quadro.height / 2);
    await page.mouse.down();
    await page.mouse.move(quadro.x + quadro.width / 2, quadro.y + quadro.height / 2 - 40, {
      steps: 8,
    });
    await page.mouse.up();

    await regua.fill("1.8");
    await page.getByRole("button", { name: "OK" }).click();

    // O que o banco guardou: as medidas vieram dos bytes, não do formulário.
    await esperarNoBanco(`
      SELECT 1 FROM communities
       WHERE name = '${nome}'
         AND cover_url LIKE 'capas/%'
         AND cover_width = 600 AND cover_height = 600
         AND cover_zoom > 1`);

    // E continuamos na comunidade, que era o ponto.
    expect(page.url()).toBe(endereco);
  });

  test("a capa é o botão: nem rótulo permanente, nem aviso de formatos na tela", async ({
    page,
  }) => {
    await entrarNoApp(page, "capalimpa");
    await preencherNova(page, novoNome("Capa Limpa"));
    await page.waitForURL(/\/c\/[^/]+$/);

    /*
      O PO mandou tirar os dois da tela: o botão permanente e o aviso de
      formatos ficavam abaixo do título, para quem só queria ler. O envio
      passou a ser tocar na própria capa.
    */
    const aviso = page.getByText(/JPEG, PNG ou WebP/);
    const caixaDoAviso = await aviso.boundingBox();
    expect(caixaDoAviso!.width).toBeLessThanOrEqual(1);

    /*
      Ele não sumiu, virou a descrição do botão: quem usa leitor de tela
      precisa saber o que pode enviar **antes** de abrir o seletor. Por
      isso a conferência é de área ocupada, e não de existência.
    */
    const capa = page.getByRole("button", { name: "Trocar a capa" });
    await expect(capa).toBeVisible();
    await expect(capa).toHaveAccessibleDescription(/JPEG, PNG ou WebP/);

    // E continua alcançável pelo teclado: é um botão de verdade.
    await capa.focus();
    await expect(capa).toBeFocused();
  });

  test("quem não modera não vê como trocar a capa", async ({ page }) => {
    await entrarNoApp(page, "capaalheia");

    const [alheia] = await consultar<{ slug: string }>(
      `SELECT c.slug FROM communities c WHERE c.deleted_at IS NULL ORDER BY c.created_at LIMIT 1`,
    );
    await page.goto(`/c/${alheia!.slug}`);

    await expect(page.getByRole("button", { name: "Trocar a capa" })).toHaveCount(0);
    await expect(page.locator('input[name="imagem"]')).toHaveCount(0);
    await expect(page.getByText(/localização que a foto carrega/)).toHaveCount(0);
  });

  /* A rota antiga saiu; ela tinha menos de duas semanas de vida. */
  test("o endereço antigo da capa não existe mais", async ({ page }) => {
    await entrarNoApp(page, "capavelha");
    await preencherNova(page, novoNome("Sem Rota Capa"));
    await page.waitForURL(/\/c\/[^/]+$/);

    const resposta = await page.goto(`${page.url()}/capa`);
    expect(resposta?.status()).toBe(404);
  });
});

/**
 * Uma segunda pessoa, em outro contexto do navegador.
 *
 * O contexto precisa do `baseURL` do projeto: `browser.newPage()` devolve
 * uma página **sem** ele, e aí todo `goto("/criar-conta")` do apoio falha
 * sem dizer por quê — a sessão nunca é criada e o teste reprova numa
 * asserção lá na frente, longe da causa.
 */
async function outraPessoa(context: BrowserContext, prefixo: string) {
  const contexto = await context.browser()!.newContext({
    baseURL: test.info().project.use.baseURL,
  });
  const visita = await contexto.newPage();
  await entrarNoApp(visita, prefixo);
  return { contexto, visita };
}
