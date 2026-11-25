import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import {
  abrirConvites,
  botaoDeContribuir,
  campoDeContribuicao,
  campoDeImagemDaContribuicao,
  criarConta,
  criarTopico,
  esperarTopicoNoPainel,
  preencherNovaComunidade,
  seguirNoPerfil,
  type ContaCriada,
} from "../e2e/apoio-tela";
import { esperarNoBanco } from "../e2e/apoio-banco";
import { criarPost, elegerHotTopic, slugDoPost, slugDoTopico } from "./semente-sql";

/**
 * **O conteúdo das páginas de referência, construído pelas telas.**
 *
 * Nada aqui escreve no banco (menos o que `semente-sql.ts` justifica): cada
 * comunidade, tópico, contribuição, enquete, evento e mensagem nasce
 * clicando, pelos mesmos helpers que as jornadas usam. É o que garante que
 * nenhum estado capturado seja um estado que o produto não permitiria — e
 * tela desenhando dado impossível é o pior material possível para redesenhar.
 *
 * **A ordem é lei, por causa dos vazios.** O Início sem comunidade nenhuma, a
 * Cabine sem conversa e as notificações sem aviso só existem **antes** de
 * criar conteúdo. Capturados depois, seriam telas cheias com nome de vazio.
 * Por isso a persona C existe: ela nasce, tem os vazios retratados, e nunca
 * mais é usada.
 *
 * Três personas, três contextos de navegador:
 *
 * - **A** é a dona: cria a comunidade (e por isso modera), o tópico, o post,
 *   a enquete, o evento;
 * - **B** é a outra ponta: entra na comunidade, contribui, dá estrela, vota,
 *   confirma presença, aceita a Cabine, segue A, denuncia;
 * - **C** só serve aos vazios.
 *
 * Mais um contexto **sem cookie nenhum**, para a tela de convite.
 */

export type Personas = {
  a: { contexto: BrowserContext; page: Page; conta: ContaCriada };
  b: { contexto: BrowserContext; page: Page; conta: ContaCriada };
  c: { contexto: BrowserContext; page: Page; conta: ContaCriada };
  semConta: { contexto: BrowserContext; page: Page };
};

export type Cenario = {
  /** O endereço da Cabine, para a captura abrir a conversa. */
  cabine: string;
  comunidade: string;
  slugDaComunidade: string;
  topico: string;
  slugDoTopico: string;
  slugDoPost: string;
  nomeDoTopicoDeB: string;
};

/**
 * Uma imagem de verdade para a contribuição com mídia.
 *
 * **Gerada com o `sharp`, e não um PNG de 1×1 embutido.** O de 1×1 deixava o
 * botão "Contribuir" desabilitado para sempre, e num retrato ele não mostra
 * nada: a mídia da contribuição é desenhada em 213 × 213, e o que se quer ver
 * na página de referência é como ela ocupa esse espaço. 600 × 400 também
 * exercita o recorte, que 1 × 1 não exercita.
 *
 * `e2e/respostas.spec.ts` já gerava imagem assim, pelo mesmo motivo.
 */
async function imagemDeVerdade(): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp({
    create: { width: 600, height: 400, channels: 3, background: "#6B5BC7" },
  })
    .jpeg()
    .toBuffer();
}

export async function abrirPersonas(browser: Browser): Promise<Personas> {
  const nova = async () => {
    const contexto = await browser.newContext();
    return { contexto, page: await contexto.newPage() };
  };

  const semConta = await nova();

  /*
   * **Nomes que o seed não usa.**
   *
   * As personas chamavam Lia Souza, Jo Ramos e Rafa Lima — exatamente três
   * das seis pessoas do `prisma/seed.ts`. O banco ficava com duas "Jo
   * Ramos", e a busca do convite da Cabine achava as duas: o clique reprovou
   * por ambiguidade, e **os retratos teriam saído com nomes repetidos**, que
   * é pior, porque ninguém olha um retrato desconfiando disso.
   */
  /*
   * **@ fixos e legíveis, e não gerados.**
   *
   * O gerador de @ junta prefixo e relógio: saía `@refd9403114`, e esse é o
   * texto que aparece em cada cartão dos quarenta retratos. Uma página feita
   * para ser lida não pode ter ruído no lugar do nome.
   *
   * Fixos dá certo porque o `globalSetup` roda o seed a cada execução, e o
   * seed trunca tudo: não há conta velha para colidir. Os nomes também não
   * colidem com as seis pessoas do seed — isso já custou uma rodada.
   */
  const umA = await nova();
  const contaA = await criarConta(umA.page, {
    nome: "Dora Vilela",
    prefixo: "dora",
    handle: "dora",
  });

  const umB = await nova();
  const contaB = await criarConta(umB.page, {
    nome: "Nuno Prado",
    prefixo: "nuno",
    handle: "nuno",
  });

  const umC = await nova();
  const contaC = await criarConta(umC.page, {
    nome: "Alice Bueno",
    prefixo: "alice",
    handle: "alice",
  });

  return {
    a: { ...umA, conta: contaA },
    b: { ...umB, conta: contaB },
    c: { ...umC, conta: contaC },
    semConta,
  };
}

/**
 * Cria tudo que as telas cheias precisam, na ordem em que o produto permite.
 *
 * Cada passo termina com uma **âncora positiva** — `expect` de algo que
 * apareceu. É a regra do `toHaveCount(0)` do Faustão aplicada à captura: sem
 * isso, uma cena que falhou pela metade seria retratada como se estivesse
 * completa, e o retrato de uma tela vazia passa por tela vazia de verdade.
 */
export async function montarCenario(personas: Personas): Promise<Cenario> {
  const { a, b } = personas;

  // ----------------------------------------------- a comunidade, por A
  // Nome fixo, pelo mesmo motivo dos @: o seed trunca a cada execução.
  const comunidade = "Cinema de Quintal";
  await preencherNovaComunidade(
    a.page,
    comunidade,
    // Intro de verdade: o padrão do helper é "criada pelo teste de jornada", e
    // numa página de referência isso aparece como se fosse o Hub falando.
    "Filme visto em casa, com gente por perto. Toda sexta tem sessão, e todo mundo escolhe.",
  );
  await a.page.waitForURL(/\/c\/[^/]+$/);
  const slugDaComunidade = new URL(a.page.url()).pathname.replace("/c/", "");
  await expect(a.page.getByRole("heading", { name: comunidade })).toBeVisible();

  // ------------------------------------------------------- B entra nela
  await b.page.goto(`/c/${slugDaComunidade}`);
  await b.page.getByRole("button", { name: /^Entrar em / }).click();
  await expect(
    b.page.getByRole("button", { name: /^Membro de/ }),
    "B não entrou na comunidade: sem isso ela não contribui, não vota e não denuncia",
  ).toBeVisible({ timeout: 20_000 });

  // -------------------------------------- dois tópicos, um de cada (RN07)
  const topico = "Qual filme você viu sozinho e nunca esqueceu";
  await criarTopico(a.page, `/c/${slugDaComunidade}`, topico);
  await esperarTopicoNoPainel(a.page);

  const nomeDoTopicoDeB = "Sessão da tarde: o que te criou";
  await criarTopico(b.page, `/c/${slugDaComunidade}`, nomeDoTopicoDeB);
  await esperarTopicoNoPainel(b.page);

  const endereco = await slugDoTopico(topico);

  // ----------------------------------- contribuições, com imagem e texto
  const noPainel = `/c/${slugDaComunidade}?t=${endereco}`;

  await contribuir(
    a.page,
    noPainel,
    "Cinema Paradiso, numa tarde de domingo em que eu devia estar estudando.",
  );
  await contribuir(
    b.page,
    noPainel,
    "O Fabuloso Destino de Amélie Poulain. Saí do cinema andando diferente.",
  );
  await contribuir(b.page, noPainel, "E tem esse, que eu guardo até hoje:", { imagem: true });
  await contribuir(a.page, noPainel, "Era uma vez em Anatólia. Três horas, e eu não vi passar.");

  /*
   * ------------------------------------------------- estrelas, por B
   *
   * **Pelo cartão, e não pela ordem na tela.** A primeira versão pegava
   * `getByRole("button", { name: /estrela/ })` solto e clicava no primeiro e
   * no segundo: `nth(1)` apontava para um cartão que a lista ainda estava
   * trocando de lugar, e o clique esperou por um elemento que nunca ficou
   * parado — quinze minutos, e o erro dizia só "tempo esgotado".
   *
   * `estrelas.spec.ts` já tinha a forma certa: achar o **cartão** pelo texto
   * e pedir a estrela dele. Alvo que não depende de posição não depende de
   * nada se mover.
   */
  for (const texto of ["Amélie", "Anatólia"]) {
    await b.page.goto(`/c/${slugDaComunidade}?t=${endereco}`);
    const cartao = b.page.locator("article").filter({ hasText: texto }).first();
    const estrela = cartao.getByRole("button", { name: /estrela/ });

    await expect(estrela, `nenhum cartão com "${texto}": a contribuição não entrou`).toBeVisible();
    await estrela.click();
    await expect(estrela).toHaveAttribute("aria-pressed", "true");
  }

  // ------------------------------------------------- enquete e evento
  await criarEnquete(a.page, slugDaComunidade);
  await votarNaEnquete(b.page, slugDaComunidade);
  await criarEvento(a.page, slugDaComunidade);
  await confirmarPresenca(b.page, slugDaComunidade);

  // -------------------------------------------------------- a Cabine
  await convidarParaCabine(a.page, personas.b.conta);
  const cabine = await aceitarCabine(b.page);
  await trocarMensagens(a.page, b.page, cabine);

  // ------------------------------------ seguir, para o perfil ter laço
  await seguirNoPerfil(b.page, personas.a.conta.handle);

  // ------------------- posts de blog (sem editor até a F7) e o status
  await criarPost(personas.a.conta.handle, "O que eu aprendi vendo filme sozinho", {
    fixado: true,
    dias: 5,
  });
  await criarPost(personas.a.conta.handle, "Três cenas que eu reveria hoje", { dias: 2 });
  const post = await slugDoPost(personas.a.conta.handle);

  // ------------------------- notificação para B: A marca o @ dele
  await contribuir(a.page, noPainel, `@${personas.b.conta.handle} você ia gostar desse.`);
  await esperarNoBanco(
    `SELECT 1 FROM notifications n JOIN profiles p ON p.id = n.profile_id
      WHERE p.handle = '${personas.b.conta.handle}'`,
  );

  // ---------------------------- a denúncia, para a fila de moderação
  await denunciar(b.page, slugDaComunidade, endereco);

  // ------------------------------------------- e o ciclo das 00h vira
  await elegerHotTopic(endereco);
  /*
   * **O rótulo na tela é "DESTAQUE DO DIA".** "Hot Topic" é o nome interno —
   * da regra, da tabela e do componente — e desde 31 de outubro de 2026 ele
   * não aparece em tela nenhuma. Procurar por ele dava um tempo esgotado com
   * o ciclo funcionando: a linha estava no banco, com as quatro pessoas.
   */
  await a.page.goto(`/c/${slugDaComunidade}`);
  await expect(
    a.page.locator("article", { hasText: "DESTAQUE DO DIA" }),
    "o ciclo não elegeu: sem isso a tela da comunidade sai sem o destaque, e o retrato mente",
  ).toBeVisible({ timeout: 15_000 });

  return {
    cabine,
    comunidade,
    slugDaComunidade,
    topico,
    slugDoTopico: endereco,
    slugDoPost: post,
    nomeDoTopicoDeB,
  };
}

/**
 * Uma contribuição, pelo caminho da tela.
 *
 * **Recarrega a página antes de cada uma, de propósito.** Duas contribuições
 * seguidas na mesma página deixavam a segunda sair **com imagem e sem
 * texto**: ao publicar a primeira, o servidor revalida e a caixa é
 * redesenhada — e o redesenho caía entre o meu `fill` e o clique, levando o
 * texto embora.
 *
 * O defeito não é do produto: `e2e/respostas.spec.ts` confere o texto depois
 * da imagem e passa, porque lá cada contribuição tem a sua página. Era a
 * minha sequência. E ele não dava erro nenhum: a contribuição é válida sem
 * texto quando tem mídia (RN13), então o Hub aceitou calado e eu só vi
 * olhando o banco.
 */
async function contribuir(
  page: Page,
  endereco: string,
  texto: string,
  extras: { imagem?: boolean } = {},
) {
  await page.goto(endereco);
  await expect(campoDeContribuicao(page)).toBeVisible();
  await campoDeContribuicao(page).fill(texto);

  if (extras.imagem) {
    await campoDeImagemDaContribuicao(page).setInputFiles({
      name: "lembranca.jpg",
      mimeType: "image/jpeg",
      buffer: await imagemDeVerdade(),
    });
  }

  await botaoDeContribuir(page).click();
  await expect(page.getByText(texto, { exact: false }).first()).toBeVisible({ timeout: 20_000 });
}

async function criarEnquete(page: Page, slug: string) {
  await page.goto(`/c/${slug}?aba=enquetes`);
  await page.getByRole("button", { name: "Criar enquete" }).click();
  await page.getByLabel("Pergunta").fill("Qual sessão a gente marca?");
  await page.getByLabel("Opção 1").fill("Sexta à noite");
  await page.getByLabel("Opção 2").fill("Domingo de tarde");
  await page.getByRole("button", { name: "Publicar enquete" }).click();
  await expect(page.getByText("Qual sessão a gente marca?")).toBeVisible({ timeout: 15_000 });
}

async function votarNaEnquete(page: Page, slug: string) {
  await page.goto(`/c/${slug}?aba=enquetes`);
  await page.getByRole("button", { name: "Domingo de tarde" }).click();
  // RN37: o resultado só aparece depois do voto — e é justamente o estado
  // que a tela de enquetes precisa mostrar nos dois lados.
  await expect(page.getByText(/%/).first()).toBeVisible({ timeout: 15_000 });
}

async function criarEvento(page: Page, slug: string) {
  await page.goto(`/c/${slug}?aba=eventos`);
  await page.getByRole("button", { name: "Criar evento" }).click();

  // A janela tem nome, e o botão de confirmar mora dentro dela — fora, o
  // mesmo nome casa o botão que abriu a janela.
  const janela = page.getByRole("dialog", { name: "Novo evento" });
  await janela.getByLabel("Nome do evento").fill("Sessão dupla: Kurosawa");
  await janela
    .getByLabel("Data")
    .fill(new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10));
  await janela.getByLabel("Hora").fill("19:30");
  await janela.getByLabel("Link do evento").fill("https://meet.exemplo/kurosawa");
  await janela.getByRole("button", { name: "Criar evento" }).click();
  await expect(page.getByText("Sessão dupla: Kurosawa")).toBeVisible({ timeout: 15_000 });
}

async function confirmarPresenca(page: Page, slug: string) {
  await page.goto(`/c/${slug}?aba=eventos`);
  await page.getByRole("button", { name: "Confirmar presença" }).click();
  // "Você vai" é o rótulo depois de confirmar, e "1 confirmado" é o número na
  // tela. Os dois vêm de `e2e/eventos.spec.ts`, que já exercita este caminho.
  await expect(page.getByRole("button", { name: "Você vai" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("1 confirmado")).toBeVisible();
}

async function convidarParaCabine(page: Page, para: ContaCriada) {
  await page.goto("/cabines/nova");
  // Pela busca, e não pela lista: com o Hub cheio a pessoa não está entre
  // os primeiros nomes.
  await page.getByLabel("Buscar pessoas").fill(para.nome);
  await page
    .getByRole("group", { name: "Pessoas" })
    .getByRole("button", { name: para.nome })
    .click();
  await page.getByLabel("Mensagem do convite").fill("Bora marcar essa sessão?");
  await page.getByRole("button", { name: "Enviar convites" }).click();
  await page.waitForURL(/\/cabines$/, { timeout: 20_000 });
}

/** Aceita o convite e devolve o endereço da Cabine, que é um só para o par. */
async function aceitarCabine(page: Page): Promise<string> {
  await page.goto("/cabines");
  await abrirConvites(page);
  await page
    .getByRole("link", { name: /^Ver o convite de/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Aceitar" }).click();
  await page.waitForURL(/\/cabines\/[0-9a-f-]+$/, { timeout: 20_000 });

  return new URL(page.url()).pathname;
}

/**
 * Seis mensagens, alternando os lados.
 *
 * `endereco` vem de quem aceitou o convite — **a Cabine tem um endereço
 * só**, e as duas pessoas falam nele. A primeira versão disto navegava pelo
 * `url()` da aba de B para as duas abas: funcionava por acidente enquanto B
 * estava na Cabine, e levaria A para o lugar errado no instante em que B
 * saísse dela.
 */
async function trocarMensagens(deA: Page, deB: Page, endereco: string) {
  const falas: [Page, string][] = [
    [deB, "Bora! Sexta eu consigo."],
    [deA, "Fechado. Levo o projetor."],
    [deB, "E eu levo a pipoca salgada, que é a certa."],
    [deA, "Discordo, mas aceito."],
    [deB, "Começa 19h30?"],
    [deA, "19h30. Anotado."],
  ];

  for (const [page, texto] of falas) {
    await page.goto(endereco);
    const campo = page.getByRole("textbox", { name: "Mensagem" });
    await expect(campo).toBeVisible({ timeout: 15_000 });
    await campo.fill(texto);
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(
      page.getByRole("region", { name: "Conversa" }).getByText(texto),
      "a mensagem não apareceu: retrato de conversa vazia não serve para nada",
    ).toBeVisible({ timeout: 15_000 });
  }
}

async function denunciar(page: Page, slug: string, topico: string) {
  await page.goto(`/c/${slug}?t=${topico}`);
  await page
    .getByRole("button", { name: /^Opções da contribuição de/ })
    .first()
    .click();
  await page.getByRole("link", { name: "Denunciar" }).click();
  await expect(page).toHaveURL(/\/denuncia/, { timeout: 15_000 });
}
