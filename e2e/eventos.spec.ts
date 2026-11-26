import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { consultar, esperarNoBanco } from "./apoio-banco";
import {
  alerta,
  botaoDeContribuir,
  cadastroConcluido,
  campoDeContribuicao,
  concluirOnboarding,
  criarTopico,
  esperarTopicoNoPainel,
  preencherNovaComunidade,
} from "./apoio-tela";

/**
 * Eventos (RN38).
 *
 * As regras do banco — presencial com local, uma presença por pessoa, o
 * teto de vagas — têm teste em `lib/data/eventos.db.test.ts`. Aqui é a
 * tela, e sobretudo a promessa que ela faz: **o link da sala não está na
 * página antes de confirmar presença**. Conferir só o que se vê não
 * bastaria; o endereço poderia estar no HTML, invisível.
 */

const SALA = "https://meet.exemplo.com/sala-do-teste";

function novoEmail(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@teste.hub`;
}
function novoHandle(prefixo: string) {
  return `${prefixo}${Date.now() % 100000}${Math.floor(Math.random() * 100)}`.slice(0, 20);
}
function novoNome(prefixo: string) {
  return `${prefixo} ${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

/** Uma data no futuro, em `AAAA-MM-DD`. */
function daquiASemanas(semanas: number) {
  return new Date(Date.now() + semanas * 7 * 864e5).toISOString().slice(0, 10);
}

/** Cria a conta e devolve o `@`, que a jornada da marcação precisa. */
async function entrarNoApp(page: Page, prefixo: string): Promise<string> {
  const handle = novoHandle("ev");

  await page.goto("/criar-conta");
  await page.getByLabel("Nome completo").fill("Pessoa dos Eventos");
  await page.getByLabel("Email").fill(novoEmail(prefixo));
  await page.getByLabel("@").fill(handle);
  await page.getByLabel("Senha", { exact: true }).fill("senhaboa123");
  await page.getByLabel("Data de nascimento").fill(`${new Date().getUTCFullYear() - 25}-03-10`);

  const caixa = page.getByRole("checkbox");
  await caixa.click();
  await expect(caixa).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Continuar" }).click();

  await cadastroConcluido(page);
  await concluirOnboarding(page);

  return handle;
}

async function minhaComunidade(page: Page, prefixo: string): Promise<string> {
  await preencherNovaComunidade(page, novoNome(prefixo));
  await page.waitForURL(/\/c\/[^/]+$/);
  return new URL(page.url()).pathname;
}

/**
 * A janela de criar evento.
 *
 * O botão da aba e o de enviar **se chamam igual** — "Criar evento", como o
 * protótipo pede —, então o de enviar só pode ser procurado dentro da
 * janela. Sem escopo, `getByRole` acha dois e reprova com "strict mode
 * violation", que não diz nada sobre a causa.
 */
function janelaDeEvento(page: Page) {
  return page.getByRole("dialog", { name: "Novo evento" });
}

/** Cria um evento online com sala, e espera o banco confirmar. */
async function criarEncontroOnline(page: Page, comunidade: string, titulo: string) {
  await page.goto(`${comunidade}?aba=eventos`);
  await page.getByRole("button", { name: "Criar evento" }).click();

  const janela = janelaDeEvento(page);
  await janela.getByLabel("Nome do evento").fill(titulo);
  await janela.getByLabel("Data").fill(daquiASemanas(1));
  await janela.getByLabel("Hora").fill("16:00");
  await janela.getByLabel("Link do evento").fill(SALA);
  await janela.getByRole("button", { name: "Criar evento" }).click();
  await esperarNoBanco(
    `SELECT 1 FROM events WHERE title = '${titulo.replace(/'/g, "''")}' AND deleted_at IS NULL`,
  );
}

async function outraPessoa(context: BrowserContext, prefixo: string) {
  const contexto = await context.browser()!.newContext({
    baseURL: test.info().project.use.baseURL,
  });
  const visita = await contexto.newPage();
  await entrarNoApp(visita, prefixo);
  return { contexto, visita };
}

test.describe("RN38: o link da sala só vai para quem confirmou", () => {
  test("antes de confirmar, o endereço não está nem no HTML da página", async ({ page }) => {
    await entrarNoApp(page, "sala");
    const comunidade = await minhaComunidade(page, "Com Sala");
    await criarEncontroOnline(page, comunidade, "Crítica de portfólio");

    await page.goto(`${comunidade}?aba=eventos`);
    await expect(page.getByText("Crítica de portfólio")).toBeVisible();

    /*
      O ponto inteiro da feature. Esconder com CSS deixaria o endereço no
      código-fonte, e um link de sala aberta numa comunidade pública é um
      convite para quem a comunidade não chamou.
    */
    const html = await page.content();
    expect(html).not.toContain(SALA);
    await expect(page.getByText(/aparece aqui para quem confirmar/)).toBeVisible();
  });

  test("depois de confirmar o link chega, e cancelar o tira de volta", async ({ page }) => {
    await entrarNoApp(page, "confirma");
    const comunidade = await minhaComunidade(page, "Com Confirma");
    await criarEncontroOnline(page, comunidade, "Crítica de portfólio");

    await page.goto(`${comunidade}?aba=eventos`);
    await page.getByRole("button", { name: "Confirmar presença" }).click();

    await expect(page.getByRole("link", { name: SALA })).toBeVisible();
    await expect(page.getByText("1 confirmado")).toBeVisible();
    await esperarNoBanco(`SELECT 1 FROM event_attendances`);

    await page.getByRole("button", { name: "Você vai" }).click();
    await expect(page.getByRole("link", { name: SALA })).toHaveCount(0);
    await esperarNoBanco(`SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM event_attendances)`);
  });
});

test.describe("vagas", () => {
  test("lotado: o botão desaparece e o servidor recusa a vaga que não existe", async ({
    page,
    context,
  }) => {
    await entrarNoApp(page, "lotado");
    const comunidade = await minhaComunidade(page, "Com Lotado");

    // Um encontro presencial com uma vaga só — o mínimo do formulário é 2,
    // então o teste usa 2 e preenche as duas.
    await page.goto(`${comunidade}?aba=eventos`);
    await page.getByRole("button", { name: "Criar evento" }).click();
    const janela = janelaDeEvento(page);
    await janela.getByLabel("Nome do evento").fill("Oficina de massinha");
    await janela.getByLabel("Data").fill(daquiASemanas(1));
    await janela.getByLabel("Hora").fill("14:00");
    await janela.getByRole("button", { name: "Presencial" }).click();
    await janela.getByLabel("Local").fill("Vila Madalena, São Paulo");
    await janela.getByLabel("Vagas (opcional)").fill("2");
    await janela.getByRole("button", { name: "Criar evento" }).click();
    await esperarNoBanco(`SELECT 1 FROM events WHERE title = 'Oficina de massinha'`);

    await page.goto(`${comunidade}?aba=eventos`);
    await page.getByRole("button", { name: "Confirmar presença" }).click();
    await expect(page.getByText("1 vaga")).toBeVisible();

    // Duas outras pessoas: a primeira pega a última vaga, a segunda vê "Lotado".
    const primeira = await outraPessoa(context, "lotado2");
    await primeira.visita.goto(comunidade);
    await primeira.visita.getByRole("button", { name: /^Entrar em/ }).click();
    await esperarNoBanco(`SELECT 1 FROM memberships m JOIN communities c ON c.id = m.community_id
      WHERE c.slug = '${comunidade.replace("/c/", "")}' AND m.profile_id <> c.created_by_id`);
    await primeira.visita.goto(`${comunidade}?aba=eventos`);
    await primeira.visita.getByRole("button", { name: "Confirmar presença" }).click();
    await expect(primeira.visita.getByText("2 confirmados")).toBeVisible();

    const segunda = await outraPessoa(context, "lotado3");
    await segunda.visita.goto(comunidade);
    await segunda.visita.getByRole("button", { name: /^Entrar em/ }).click();
    /*
      Esperar a entrada firmar antes de abrir a aba, como a primeira pessoa
      já fazia. Sem isto a aba podia carregar com a pessoa ainda de fora, e
      quem está de fora vê "Confirmar presença" — o botão que abre a janela
      de entrar — em vez de "Lotado". Antes da correção de 1º de novembro
      visitante não via botão nenhum, e a corrida ficava escondida.
    */
    await expect(segunda.visita.getByRole("button", { name: /^Membro de/ })).toBeVisible();
    await segunda.visita.goto(`${comunidade}?aba=eventos`);
    const cartao = segunda.visita.locator("article");
    await expect(cartao.getByRole("button", { name: "Lotado" })).toBeVisible();
    await expect(cartao.getByRole("button", { name: "Confirmar presença" })).toHaveCount(0);

    // E o banco não ganhou uma terceira linha.
    const linhas = await consultar<{ n: string }>(`SELECT count(*) AS n FROM event_attendances`);
    expect(linhas[0]?.n).toBe("2");

    await primeira.contexto.close();
    await segunda.contexto.close();
  });
});

test.describe("criar o evento", () => {
  test("presencial pede local; online oferece a sala no lugar dele", async ({ page }) => {
    await entrarNoApp(page, "formato");
    const comunidade = await minhaComunidade(page, "Com Formato");

    await page.goto(`${comunidade}?aba=eventos`);
    await page.getByRole("button", { name: "Criar evento" }).click();
    const janela = janelaDeEvento(page);

    // Online, de saída: o campo é o da sala.
    await expect(janela.getByLabel("Link do evento")).toBeVisible();
    await expect(janela.getByLabel("Local")).toHaveCount(0);

    await janela.getByRole("button", { name: "Presencial" }).click();
    await expect(janela.getByLabel("Local")).toBeVisible();
    await expect(janela.getByLabel("Link do evento")).toHaveCount(0);
  });

  test("data no passado é recusada, com a mensagem à vista", async ({ page }) => {
    await entrarNoApp(page, "passado");
    const comunidade = await minhaComunidade(page, "Com Passado");

    await page.goto(`${comunidade}?aba=eventos`);
    await page.getByRole("button", { name: "Criar evento" }).click();
    const janela = janelaDeEvento(page);
    await janela.getByLabel("Nome do evento").fill("Ontem");
    /*
      O campo tem `min` com o dia de hoje, então o navegador já barraria —
      por isso o teste preenche pelo DOM, que é o caminho de quem manda o
      formulário por fora. O servidor é quem precisa recusar.
    */
    await janela.getByLabel("Data").evaluate((campo: HTMLInputElement) => {
      // Sem tirar o `min`, o próprio navegador barra o envio e o servidor
      // nunca é chamado — e é o servidor que precisa recusar.
      campo.removeAttribute("min");
      campo.value = "2020-01-01";
      campo.dispatchEvent(new Event("input", { bubbles: true }));
      campo.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await janela.getByLabel("Hora").fill("10:00");
    await janela.getByRole("button", { name: "Criar evento" }).click();

    await expect(alerta(page)).toContainText(/futuro/i);
  });

  test("a aba conta os eventos que ainda vão acontecer", async ({ page }) => {
    await entrarNoApp(page, "contaev");
    const comunidade = await minhaComunidade(page, "Com Conta");
    await criarEncontroOnline(page, comunidade, "Crítica de portfólio");

    await page.goto(comunidade);
    await expect(page.getByRole("tab", { name: /Eventos/ })).toContainText("1");
  });
});

/**
 * **O evento aberto no centro da comunidade** (pedido do PO, 25 de novembro
 * de 2026).
 *
 * O que ele reclamou: clicar em "Ver evento" na coluna da direita abria a aba
 * Eventos inteira, a coluna desaparecia e a pessoa tinha de procurar de novo,
 * na lista, o encontro que ela acabou de escolher.
 *
 * Agora o evento ocupa o centro por `?evento=<id>`, e a coluna fica ao lado —
 * o que só é possível porque o painel do tópico **não monta** junto. A
 * precedência entre aba, tópico e evento é função pura, com teste de unidade
 * próprio (`features/comunidades/shared.test.ts`); aqui se mede a tela.
 */
test.describe("o evento abre no centro", () => {
  /** A coluna da direita, que é o ponto: ela não pode desaparecer. */
  function coluna(page: Page) {
    return page.locator("[data-resumo]");
  }

  /** O id da linha, que é o que o endereço carrega. */
  async function idDoEvento(titulo: string) {
    const linhas = await consultar<{ id: string }>(
      `SELECT id FROM events WHERE title = '${titulo.replace(/'/g, "''")}' AND deleted_at IS NULL`,
    );
    expect(linhas, "o evento não chegou ao banco").toHaveLength(1);
    return linhas[0]!.id;
  }

  test("'Ver evento' abre o detalhe no centro, com a coluna ao lado", async ({ page }) => {
    await entrarNoApp(page, "centro");
    const comunidade = await minhaComunidade(page, "Com Centro");
    await criarEncontroOnline(page, comunidade, "Leitura coletiva");

    /*
      O Início, onde o bloco do próximo evento aparece na coluna.

      O filtro é pelo **nome do encontro**, e não por "PRÓXIMO EVENTO": o
      espaço reservado da coluna carrega esse mesmo rótulo, e durante o fluxo
      da resposta os dois coexistem no HTML por um instante. O teste reprovava
      por ambiguidade — duas vezes em três — dizendo "strict mode violation",
      que não aponta para nada. O espaço reservado parou de afirmar que não há
      evento (`features/comunidades/resumo.tsx`), e aqui o seletor ficou
      preciso de qualquer forma: o nome do encontro só existe no bloco
      resolvido.
    */
    await page.goto(comunidade);
    const bloco = coluna(page).filter({ hasText: "Leitura coletiva" });
    await expect(bloco).toBeVisible();

    /*
      O link, e não o botão de confirmar presença do cartão: os dois se
      chamam igual, e sem escopo `getByRole` acha dois e reprova com "strict
      mode violation", que não diz nada sobre a causa.
    */
    await bloco.getByRole("link", { name: "Confirmar presença" }).click();

    await page.waitForURL(/[?&]evento=/);

    /*
      **A barreira positiva antes de qualquer contagem zero.** O detalhe
      chega num `<Suspense>`: medir primeiro a ausência do painel passaria
      verde com a página ainda vazia.
    */
    await expect(page.getByRole("link", { name: "Todos os eventos" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Evento", exact: true })).toBeVisible();
    await expect(page.getByText("Leitura coletiva")).toBeVisible();

    // O pedido inteiro: o detalhe no centro **sem perder** a coluna.
    await expect(coluna(page)).toBeVisible();

    // E a volta é um clique, para a lista.
    await page.getByRole("link", { name: "Todos os eventos" }).click();
    await expect(page.getByRole("heading", { name: "Eventos" })).toBeVisible();
    await expect(page).toHaveURL(/aba=eventos/);
    await expect(page).not.toHaveURL(/evento=/);
  });

  test("com `?t=` junto, aparece o evento e nenhum painel de tópico", async ({ page }) => {
    await entrarNoApp(page, "disputa");
    const comunidade = await minhaComunidade(page, "Com Disputa");
    await criarEncontroOnline(page, comunidade, "Mesa de abertura");

    await criarTopico(page, comunidade, "Tópico que não deve abrir");
    await esperarTopicoNoPainel(page);
    const topico = new URL(page.url()).searchParams.get("t")!;

    const evento = await idDoEvento("Mesa de abertura");
    await page.goto(`${comunidade}?aba=eventos&t=${topico}&evento=${evento}`);

    // Positivo primeiro: o evento está na tela.
    await expect(page.getByRole("heading", { name: "Evento", exact: true })).toBeVisible();
    await expect(page.getByText("Mesa de abertura")).toBeVisible();

    /*
      Só então o zero. Duas conversas na tela ao mesmo tempo é o "conteúdo
      espremido em três faixas estreitas" que já foi tentado e revertido — e
      é o painel não montar que deixa a coluna ao lado do evento.
    */
    await expect(page.getByRole("complementary", { name: /^Tópico / })).toHaveCount(0);
    await expect(coluna(page)).toBeVisible();
  });

  test("trocar de aba derruba o detalhe", async ({ page }) => {
    await entrarNoApp(page, "troca");
    const comunidade = await minhaComunidade(page, "Com Troca");
    await criarEncontroOnline(page, comunidade, "Encontro que sai da tela");

    const evento = await idDoEvento("Encontro que sai da tela");
    await page.goto(`${comunidade}?aba=eventos&evento=${evento}`);
    await expect(page.getByRole("heading", { name: "Evento", exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "Membros" }).click();

    /*
      Positivo primeiro, de novo: a aba Membros carregada é o sinal de que a
      navegação terminou. Sem ele, o `toHaveCount(0)` abaixo seria satisfeito
      pela página no meio da troca.
    */
    await expect(page.getByRole("heading", { name: "Membros" })).toBeVisible();
    await expect(page).not.toHaveURL(/evento=/);
    await expect(page.getByRole("heading", { name: "Evento", exact: true })).toHaveCount(0);
  });

  test("evento que não existe mostra a lista, não 404", async ({ page }) => {
    await entrarNoApp(page, "fantasma");
    const comunidade = await minhaComunidade(page, "Com Fantasma");
    await criarEncontroOnline(page, comunidade, "Encontro de verdade");

    const resposta = await page.goto(
      `${comunidade}?aba=eventos&evento=ffffffff-ffff-4fff-8fff-ffffffffffff`,
    );

    /*
      **O código importa tanto quanto a tela.** Um 404 aqui diria que a
      comunidade não existe, por causa de um id velho num link colado — e o
      404 desta rota pertence à comunidade, não ao evento.
    */
    expect(resposta?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Eventos" })).toBeVisible();
    await expect(page.getByText("Encontro de verdade")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Evento", exact: true })).toHaveCount(0);
  });
});

/**
 * **A área de comentários do encontro** (PR 4 do plano da comunidade).
 *
 * O pedido do PO foi "eventos funcionando como tópicos, com comentários
 * dentro". A decisão foi dar ao evento um tópico por baixo, invisível na
 * lista — e o que estas jornadas medem é que a decisão pagou: o compositor,
 * a estrela (RN15) e a marcação `@` são os **mesmos** do tópico, porque é a
 * mesma tabela e o mesmo componente.
 *
 * O que as regras garantem está em `lib/data/conversa-do-evento.db.test.ts`,
 * que mede 25 casos sem tela. Aqui é a tela — e o endereço, que é a parte
 * que erraria calada.
 */
test.describe("a área de comentários do encontro", () => {
  /** O id da linha, que é o que o endereço carrega. */
  async function idDoEvento(titulo: string) {
    const linhas = await consultar<{ id: string }>(
      `SELECT id FROM events WHERE title = '${titulo.replace(/'/g, "''")}' AND deleted_at IS NULL`,
    );
    expect(linhas, "o evento não chegou ao banco").toHaveLength(1);
    return linhas[0]!.id;
  }

  const cartaoDe = (page: Page, texto: string) =>
    page.locator("article").filter({ hasText: texto }).first();

  test("da lista, o cartão abre os comentários — e o número cresce", async ({ page }) => {
    /*
      **A porta, medida pelo caminho de quem usa.**

      Esta jornada existe porque a porta **não existia**: a área de
      comentários ficou pronta e o único caminho até ela era o bloco "PRÓXIMO
      EVENTO" da coluna, que mostra só o próximo encontro. Todos os outros
      tinham conversa e nenhuma porta — e nenhum teste pegava, porque as
      jornadas montavam o endereço à mão, como eu montei nas de baixo.

      A lição: jornada que navega por `page.goto` prova que a tela funciona,
      nunca que alguém chega nela.
    */
    await entrarNoApp(page, "porta");
    const comunidade = await minhaComunidade(page, "Com Porta");
    await criarEncontroOnline(page, comunidade, "Rodada de leitura");

    await page.goto(`${comunidade}?aba=eventos`);
    await expect(page.getByText("Rodada de leitura")).toBeVisible();

    // Sem comentário nenhum o link convida a escrever o primeiro.
    const porta = page.getByRole("link", { name: "Comentar" });
    await expect(porta, "o cartão do encontro não tem porta para a conversa").toBeVisible();
    await porta.click();

    await page.waitForURL(/[?&]evento=/);
    await expect(page.getByRole("heading", { name: "Comentários" })).toBeVisible();

    await campoDeContribuicao(page).fill("Eu levo o café");
    await botaoDeContribuir(page).click();
    await esperarNoBanco(
      `SELECT 1 FROM answers WHERE text = 'Eu levo o café' AND deleted_at IS NULL`,
    );
    await expect(cartaoDe(page, "Eu levo o café")).toBeVisible();

    // E de volta na lista, o número: é ele que faz o link valer o clique.
    await page.getByRole("link", { name: "Todos os eventos" }).click();
    await expect(page.getByRole("link", { name: "1 comentário" })).toBeVisible();
  });

  test("comentar funciona, com estrela e com `@`", async ({ page }) => {
    const handle = await entrarNoApp(page, "coment");
    const comunidade = await minhaComunidade(page, "Com Coment");
    await criarEncontroOnline(page, comunidade, "Oficina de roteiro");
    const evento = await idDoEvento("Oficina de roteiro");

    await page.goto(`${comunidade}?aba=eventos&evento=${evento}`);

    /*
      **O positivo antes de tudo**, e aqui ele é o próprio pedido: o cartão
      do encontro e, embaixo dele, onde se escreve. A área chega num
      `<Suspense>`, então medir o campo direto passaria pela página vazia.
    */
    await expect(page.getByRole("heading", { name: "Evento", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Comentários" })).toBeVisible();

    const texto = `Levo o primeiro ato @${handle}`;
    await campoDeContribuicao(page).fill(texto);
    await botaoDeContribuir(page).click();
    await esperarNoBanco(
      `SELECT 1 FROM answers WHERE text LIKE 'Levo o primeiro ato%' AND deleted_at IS NULL`,
    );

    const cartao = cartaoDe(page, "Levo o primeiro ato");
    await expect(cartao).toBeVisible();

    /*
      **A marcação é o que prova que não há regra nova aqui.** O `@` virou
      link porque o comentário passou pelo mesmo analisador de marcações de
      qualquer contribuição — ninguém escreveu uma linha para isso valer no
      encontro.

      O `@` é procurado **dentro do parágrafo escrito**, e não no cartão: o
      cartão também traz o `@` de quem assina, com o mesmo texto, e um
      `getByRole` no cartão inteiro acha os dois e reprova com "strict mode
      violation" — que não diz nada sobre a causa.
    */
    const escrito = cartao.locator("p").filter({ hasText: "Levo o primeiro ato" });
    await expect(escrito.getByRole("link", { name: `@${handle}` })).toBeVisible();

    // E a estrela (RN15), pelo mesmo motivo.
    const estrela = cartao.getByRole("button", { name: /estrela/ });
    await estrela.click();
    await expect(estrela).toHaveText("1");
    await esperarNoBanco(`
      SELECT 1 FROM answer_stars s JOIN answers a ON a.id = s.answer_id
       WHERE a.text LIKE 'Levo o primeiro ato%'`);

    // Recarregar mantém: não foi só a tela sendo otimista.
    await page.reload();
    await expect(cartaoDe(page, "Levo o primeiro ato")).toBeVisible();
  });

  test("Enter não publica o comentário; Ctrl+Enter publica", async ({ page }) => {
    // A mesma regra do tópico (protótipo v6), e ela vale aqui **porque é o
    // mesmo compositor**. Mede-se para o dia em que alguém trocar um dos dois.
    await entrarNoApp(page, "atalho");
    const comunidade = await minhaComunidade(page, "Com Atalho");
    await criarEncontroOnline(page, comunidade, "Ensaio geral");
    const evento = await idDoEvento("Ensaio geral");

    await page.goto(`${comunidade}?aba=eventos&evento=${evento}`);
    await expect(page.getByRole("heading", { name: "Comentários" })).toBeVisible();

    const campo = campoDeContribuicao(page);
    await campo.fill("Primeira linha");
    await campo.press("Enter");

    // O campo continua com o texto, e ganhou a quebra: nada foi publicado.
    await expect(campo).toHaveValue("Primeira linha\n");

    await campo.fill("Fica combinado então");
    await campo.press("ControlOrMeta+Enter");
    await esperarNoBanco(
      `SELECT 1 FROM answers WHERE text = 'Fica combinado então' AND deleted_at IS NULL`,
    );
    await expect(cartaoDe(page, "Fica combinado então")).toBeVisible();
  });

  /**
   * Movimento de ontem **na conversa do encontro**, e o ciclo vira.
   *
   * Direto no banco porque nenhum caminho do produto deixa escolher quando
   * uma contribuição aconteceu. O dia que entra em `hub_virar_ciclo` é
   * ontem, e a tela procura hoje: o movimento de ontem é o destaque de hoje.
   *
   * Sem acento grave nos comentários do SQL — ele fecharia este template, e
   * já fechou três vezes neste projeto.
   */
  async function aConversaVenceuOCiclo(eventoId: string) {
    await consultar(`
      WITH alvo AS (
        SELECT id, author_id FROM topics
         WHERE event_id = '${eventoId}' AND deleted_at IS NULL
      )
      INSERT INTO answers (id, topic_id, author_id, text, created_at)
      SELECT gen_random_uuid(), alvo.id, alvo.author_id, 'comentario de ontem',
             ((hub_cycle_date(now()) - 1) + time '12:00') AT TIME ZONE hub_cycle_timezone()
        FROM alvo
    `);
    await consultar(`SELECT hub_virar_ciclo(hub_cycle_date(now()) - 1)`);
  }

  test("o Hot Topic do encontro leva ao encontro, não a um painel vazio", async ({ page }) => {
    await entrarNoApp(page, "destaque");
    const comunidade = await minhaComunidade(page, "Com Destaque");
    await criarEncontroOnline(page, comunidade, "Mutirão de capa");
    const evento = await idDoEvento("Mutirão de capa");

    await aConversaVenceuOCiclo(evento);

    await page.goto(comunidade);

    const destaque = page.getByRole("link").filter({ hasText: "Mutirão de capa" }).first();
    await expect(destaque, "o destaque do dia não apareceu na comunidade").toBeVisible();

    /*
      **O endereço é medido, e não só clicado.** Um destaque apontando para
      `?t=evento:<id>` abriria a comunidade sem painel nenhum — sem erro, sem
      404, e com a jornada passando se ela só conferisse que algo aparece. É
      por isso que o PR 3 deixou a exibição filtrada: para não existir
      nenhum commit em que o Hub mostra um link que não abre.
    */
    await expect(destaque).toHaveAttribute("href", /[?&]evento=/);
    await expect(destaque).not.toHaveAttribute("href", /[?&]t=/);
    // E é **este** encontro, não um qualquer: a forma acima já esperou o
    // atributo, então ler o valor agora é seguro.
    expect(await destaque.getAttribute("href")).toContain(`evento=${evento}`);

    await destaque.click();
    await page.waitForURL(/[?&]evento=/);
    await expect(page.getByRole("heading", { name: "Evento", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Comentários" })).toBeVisible();
    await expect(page.getByText("comentario de ontem")).toBeVisible();
  });

  test("e o destaque do encontro também leva ao encontro a partir do Início", async ({ page }) => {
    await entrarNoApp(page, "ini");
    const comunidade = await minhaComunidade(page, "Com Ini");
    await criarEncontroOnline(page, comunidade, "Leitura de madrugada");
    const evento = await idDoEvento("Leitura de madrugada");

    await aConversaVenceuOCiclo(evento);

    await page.goto("/inicio");
    await expect(page.getByRole("heading", { name: "Hot Topics" })).toBeVisible();

    const destaque = page.getByRole("link").filter({ hasText: "Com Ini" }).first();
    await expect(destaque).toHaveAttribute("href", /[?&]evento=/);
    expect(await destaque.getAttribute("href")).toContain(`evento=${evento}`);

    await destaque.click();
    await expect(page.getByRole("heading", { name: "Evento", exact: true })).toBeVisible();
  });
});
