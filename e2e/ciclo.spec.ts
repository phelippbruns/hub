import { expect, test, type Page } from "@playwright/test";
import { consultar } from "./apoio-banco";
import {
  cadastroConcluido,
  campoDeContribuicao,
  concluirOnboarding,
  preencherNovaComunidade,
  respostaPublicada,
  criarTopico,
  botaoDeContribuir,
  esperarTopicoNoPainel,
  enderecoAtual,
} from "./apoio-tela";

/**
 * O ciclo do Hot Topic (F10), na tela.
 *
 * As regras da eleição — RN09, RN10, o desempate — têm 18 testes contra o
 * banco em `lib/data/ciclo.db.test.ts`. Aqui é o que a pessoa vê depois da
 * virada.
 */

function unico(p: string) {
  return `${p}${Date.now() % 100000}${Math.floor(Math.random() * 100)}`;
}

async function entrarNoApp(page: Page, prefixo: string) {
  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill("Pessoa do Ciclo");
  await page.getByLabel("Email").fill(`${unico(prefixo)}@teste.hub`);
  await page.getByLabel("@").fill(unico("cic").slice(0, 20));
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

/** Uma comunidade minha, com um tópico, e o endereço da comunidade. */
async function minhaComunidadeComTopico(page: Page, prefixo: string) {
  await preencherNovaComunidade(page, `${prefixo} ${Date.now()}`, "Comunidade do teste do ciclo.");
  await page.waitForURL(/\/c\/[^/]+$/);
  const comunidade = new URL(page.url()).pathname;

  await criarTopico(page, comunidade, "assunto da virada", "A pergunta que vai virar destaque.");
  await esperarTopicoNoPainel(page, "assunto-da-virada");

  return { comunidade, topico: enderecoAtual(page) };
}

/**
 * Meio-dia de ontem **no fuso do ciclo**, como instante.
 *
 * Nada de "now() menos 20 horas". Era o que estava aqui, e falhava todo dia
 * das 20h à meia-noite: depois das 20h, vinte horas atrás ainda é hoje, o
 * ciclo elegia o dia errado e a comunidade não mostrava destaque nenhum. A
 * CI pegou às 20h01 de Brasília, num PR que só mexia em documento.
 *
 * Ancorar no dia do ciclo em vez de numa diferença de horas é o que torna o
 * teste igual às três da tarde e às onze da noite.
 */
const ONTEM_AO_MEIO_DIA = `((hub_cycle_date(now()) - 1) + time '12:00') AT TIME ZONE hub_cycle_timezone()`;

/**
 * Põe respostas de ontem no tópico e vira o ciclo.
 *
 * Direto no banco porque nenhum caminho do produto deixa escolher quando uma
 * resposta aconteceu — e sem respostas de ontem não há o que eleger.
 *
 * `hub_virar_ciclo(dia)` conta as respostas de `dia` e grava o vencedor em
 * `dia + 1`: o movimento de ontem é o destaque de hoje. Por isso o dia que
 * entra aqui é **ontem**, e a tela procura hoje.
 */
async function houveMovimentoOntemEOCicloVirou(slugDoTopico: string, pessoas: number) {
  await consultar(`
    WITH alvo AS (
      -- Ordenado pelo mais recente, e não só LIMIT 1: depois do primeiro
      -- teste do arquivo existem dois tópicos com este endereço, em
      -- comunidades diferentes, e o LIMIT 1 sem ordem pegava o da rodada
      -- anterior. As respostas de ontem iam para o tópico errado e a
      -- eleição não achava nada -- sintoma: "o destaque não aparece".
      -- (Sem acento grave aqui: ele fecharia este template.)
      SELECT id FROM topics WHERE slug = '${slugDoTopico}' AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 1
    ), gente AS (
      SELECT id FROM profiles WHERE deleted_at IS NULL LIMIT ${pessoas}
    )
    INSERT INTO answers (id, topic_id, author_id, text, created_at)
    SELECT gen_random_uuid(), alvo.id, gente.id, 'resposta de ontem', ${ONTEM_AO_MEIO_DIA}
      FROM alvo, gente
  `);

  await consultar(`SELECT hub_virar_ciclo(hub_cycle_date(now()) - 1)`);
}

test.describe("depois da virada", () => {
  test("o Hot Topic aparece no topo da comunidade", async ({ page }) => {
    await entrarNoApp(page, "virada");
    const { comunidade } = await minhaComunidadeComTopico(page, "Com Virada");

    await houveMovimentoOntemEOCicloVirou("assunto-da-virada", 3);

    await page.goto(comunidade);

    /*
      O rótulo mora **dentro** do cartão desde 31 de outubro: era um título
      de seção acima dele, e título de seção promete uma lista.
    */
    await expect(page.getByRole("heading", { name: "Hot Topic", exact: true })).toHaveCount(0);

    const cartao = page.locator("article", { hasText: "DESTAQUE DO DIA" });
    await expect(cartao).toBeVisible();
    await expect(cartao.getByText("assunto da virada")).toBeVisible();
    await expect(cartao.getByText("A pergunta que vai virar destaque.")).toBeVisible();

    /*
      **E ele é a primeira linha da lista**, não uma seção acima dela
      (pedido do PO, 7/11). Medir a ordem no DOM, e não só "está
      visível": seção própria acima também fica visível, e era
      exatamente o estado anterior.
    */
    /*
      Com um tópico só, "é o primeiro" é verdade sem ninguém fixar nada —
      e a barreira passava verde com a fixação arrancada; medi. Então
      entra um tópico **mais novo**, e a conferência vai em
      `?filtro=recentes`, onde a ordem é a data de criação: sem a
      fixação, quem abre a lista é o novo.
    */
    const slugDaComunidade = comunidade.replace("/c/", "");
    /*
      Direto no banco, e sem autor: pela tela não dá, porque a RN07 só
      deixa **um tópico por pessoa por dia** em cada comunidade — o campo
      chega desativado. `cycle_date` é do gatilho, e `author_id` nulo
      também foge do índice único da regra.
    */
    await consultar(`
      INSERT INTO topics (id, community_id, author_id, name, description, created_at)
      SELECT gen_random_uuid(), c.id, NULL, 'assunto recem-nascido',
             'Aberto depois do destaque.', now()
        FROM communities c WHERE c.slug = '${slugDaComunidade}'`);

    await page.goto(`${comunidade}?filtro=recentes`);
    await expect(page.locator("article", { hasText: "DESTAQUE DO DIA" })).toBeVisible();

    const posicao = await page.evaluate(() => {
      const destaque = Array.from(document.querySelectorAll("main article")).find((a) =>
        a.textContent?.includes("DESTAQUE DO DIA"),
      );
      if (!destaque) return "sem destaque";
      const lista = destaque.parentElement;
      if (!lista) return "sem lista";
      // Irmão de cartão de tópico: é isto que diz "mesma lista".
      const irmaos = lista.children.length;
      return lista.firstElementChild === destaque ? `primeiro de ${irmaos}` : "não é o primeiro";
    });
    expect(posicao).toBe("primeiro de 2");

    // E o cartão leva ao tópico. O botão diz "Contribuir", não "Responder".
    await cartao.getByRole("link", { name: "Contribuir" }).click();
    await esperarTopicoNoPainel(page, "assunto-da-virada");
  });

  test('o filtro "Seguindo" não injeta o destaque que ele excluiu', async ({ page }) => {
    await entrarNoApp(page, "seguindohot");
    const { comunidade } = await minhaComunidadeComTopico(page, "Com Filtro");

    await houveMovimentoOntemEOCicloVirou("assunto-da-virada", 3);

    // Sem filtro ele está lá: sem esta linha, o teste abaixo passaria
    // verde com o Hot Topic quebrado em toda a tela.
    await page.goto(comunidade);
    await expect(page.locator("article", { hasText: "DESTAQUE DO DIA" })).toBeVisible();

    /*
      Eu criei o tópico mas não o sigo — criar não segue. Fixar o
      destaque no topo de um filtro que o excluiu seria o filtro
      mentindo, e é o motivo de ele ser **fixado**, nunca injetado.
    */
    await page.goto(`${comunidade}?filtro=seguindo`);
    await expect(page.getByText("Você não segue nenhum tópico aqui")).toBeVisible();
    await expect(page.locator("article", { hasText: "DESTAQUE DO DIA" })).toHaveCount(0);
  });

  test("o cartão mostra a última contribuição, que é o que faz entrar", async ({ page }) => {
    await entrarNoApp(page, "ultimahot");
    const { comunidade, topico } = await minhaComunidadeComTopico(page, "Com Última");

    /*
      O cartão era título, abertura e dois números — o que diz que há
      movimento, mas não diz qual. O protótipo v6 põe ali a última
      contribuição, com a cara e o @ de quem escreveu.
    */
    await page.goto(topico);
    await campoDeContribuicao(page).fill("o galpão lotou e ninguém saiu");
    await page.getByRole("button", { name: "Contribuir" }).click();
    await expect(respostaPublicada(page, "o galpão lotou e ninguém saiu")).toBeVisible();

    await houveMovimentoOntemEOCicloVirou("assunto-da-virada", 3);
    await page.goto(comunidade);

    const cartao = page.locator("article", { hasText: "DESTAQUE DO DIA" });
    await expect(cartao.getByText("o galpão lotou e ninguém saiu")).toBeVisible();
    // E a contagem usa a palavra certa (RN28).
    await expect(cartao.getByText(/contribuiç(ão|ões)/)).toBeVisible();
    await expect(cartao.getByText(/respostas?\b/)).toHaveCount(0);
  });

  test("comunidade sem movimento não inventa destaque", async ({ page }) => {
    await entrarNoApp(page, "semvirada");
    const { comunidade } = await minhaComunidadeComTopico(page, "Sem Virada");

    await consultar(`SELECT hub_virar_ciclo(hub_cycle_date(now()) - 1)`);
    await page.goto(comunidade);

    await expect(page.locator("article", { hasText: "DESTAQUE DO DIA" })).toHaveCount(0);
    // A lista normal continua lá.
    await expect(page.getByRole("heading", { name: "Tópicos" })).toBeVisible();
  });

  test("buscando, o destaque só aparece quando está no resultado", async ({ page }) => {
    await entrarNoApp(page, "buscavirada");
    const { comunidade } = await minhaComunidadeComTopico(page, "Busca Virada");

    await houveMovimentoOntemEOCicloVirou("assunto-da-virada", 2);

    /*
      **Esta regra mudou em 7/11, junto com o destaque virar linha da
      lista.** Enquanto ele era uma seção acima da lista, buscar o
      escondia — seção que ignora a busca confunde o resultado.

      Agora ele é a primeira linha da própria lista, então a regra é a da
      lista: aparece quando a busca o acha, e só então.
    */
    await page.goto(`${comunidade}?q=assunto`);
    const destaque = page.locator("article", { hasText: "DESTAQUE DO DIA" });
    await expect(destaque).toBeVisible();

    // E some quando o resultado não o inclui. O positivo vem antes: o
    // nada satisfaz `toHaveCount(0)` sozinho.
    await page.goto(`${comunidade}?q=cerveja`);
    await expect(page.getByText(/Nada encontrado para/)).toBeVisible();
    await expect(destaque).toHaveCount(0);
  });
});

test.describe("a disputa em andamento", () => {
  test('"Seu tópico está em 1º" aparece em Minhas Comunidades', async ({ page }) => {
    await entrarNoApp(page, "posicao");
    await minhaComunidadeComTopico(page, "Com Posicao");

    // Uma resposta de hoje põe o tópico na disputa que fecha à meia-noite.
    await campoDeContribuicao(page).fill("respondendo o meu");
    await botaoDeContribuir(page).click();
    await expect(page.locator("article").filter({ hasText: "respondendo o meu" })).toBeVisible();

    await page.goto("/comunidades/minhas");
    await expect(page.getByText("Seu tópico está em 1º no ciclo")).toBeVisible();
  });

  test("sem tópico na disputa, a linha não aparece", async ({ page }) => {
    await entrarNoApp(page, "semposicao");
    await minhaComunidadeComTopico(page, "Sem Posicao");

    await page.goto("/comunidades/minhas");
    await expect(page.getByText(/no ciclo$/)).toHaveCount(0);
  });
});

test.describe("o agendamento", () => {
  test("existe, e chama a virada de hora em hora", async () => {
    const [tarefa] = await consultar<{ schedule: string; command: string }>(
      `SELECT schedule, command FROM cron.job WHERE jobname = 'hub-virar-ciclo'`,
    );

    /*
     * De hora em hora, e não só à meia-noite: o pg_cron agenda no fuso do
     * servidor (UTC) e o fuso do ciclo é configuração, e um agendamento
     * único que não roda pula o dia inteiro em silêncio.
     */
    expect(tarefa?.schedule, "o ciclo não está agendado").toBe("0 * * * *");
    expect(tarefa?.command).toContain("hub_ciclo_pendente");
  });
});
