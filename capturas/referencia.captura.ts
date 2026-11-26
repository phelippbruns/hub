import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  NORMALIZAR,
  congelarHtml,
  problemasDoHtml,
  procedencia,
} from "../design/referencia/congelar";
import { montarIndice } from "../design/referencia/indice";
import { montarMapa, mapaEmMarkdown } from "../design/referencia/mapa";
import { PAGINAS } from "../design/referencia/paginas";
import {
  avancarApresentacao,
  escolherComunidades,
  preencherNovaComunidade,
} from "../e2e/apoio-tela";
import { abrirPersonas, montarCenario, type Cenario, type Personas } from "./cenas";
import { esvaziarComunidades } from "./semente-sql";

/**
 * **O capturador das páginas de referência.**
 *
 * Uma execução, três contas, 40 retratos e 6 páginas congeladas. Leva uns
 * dez minutos e **apaga o banco local** — o `globalSetup` semeia, e o seed
 * trunca tudo.
 *
 * A ordem dos testes é série pura e não pode mudar: as cenas dependem umas
 * das outras, e os **vazios só existem antes** de o conteúdo ser criado.
 */

const PASTA = "design/paginas-de-referencia";
const RETRATOS = join(PASTA, "retratos");
const PAGINAS_HTML = join(PASTA, "paginas");
const ATIVOS = join(PASTA, "ativos");
const IMAGENS = join(ATIVOS, "imagens");

/** As seis telas que também saem como HTML, escolhidas por densidade. */
const CONGELAR = new Set([
  "inicio-cheio",
  "comunidade-cheia",
  "topico-no-painel",
  "perfil-dono-blog",
  "cabine-conversa",
  "design-galeria",
]);

const commit = execSync("git rev-parse --short HEAD").toString().trim();
const hoje = new Date().toISOString().slice(0, 10);

/** URL absoluta de imagem → caminho local. Compartilhado entre as páginas. */
const baixadas = new Map<string, string>();
/** Ids já retratados, para o índice e para a conferência final. */
const feitas = new Set<string>();
let cssSalvo = false;

const porId = new Map(PAGINAS.map((p) => [p.id, p]));
const mapa = montarMapa(commit);
const telaPorId = new Map(mapa.telas.map((t) => [t.id, t]));

function prepararPastas() {
  for (const pasta of [RETRATOS, PAGINAS_HTML, IMAGENS]) mkdirSync(pasta, { recursive: true });
}

/**
 * Recusa um servidor de desenvolvimento.
 *
 * `reuseExistingServer` é verdadeiro aqui de propósito — rebuildar a cada
 * execução custaria minutos —, e isso abre a porta para a captura grudar num
 * `npm run dev` deixado de pé. Em dev o CSS não é um chunk único, vem sem
 * minificar, e a CSP libera `unsafe-eval`: a pasta sairia **errada em
 * silêncio**, que é o pior resultado possível.
 *
 * É a mesma armadilha do `reuseExistingServer` que já derrubou uma rodada de
 * jornadas e está no Faustão.
 */
async function recusarServidorDeDesenvolvimento(page: Page) {
  const html = await page.content();
  const sinais = ["webpack-hmr", "app-pages-internals", "__next_devtools", "react-refresh"];
  const achado = sinais.find((s) => html.includes(s));

  expect(
    achado,
    `o servidor na porta 3000 é de desenvolvimento (sinal: ${achado}). ` +
      "Em dev o CSS não é o do build e a pasta sairia errada sem reclamar. " +
      "Pare o `npm run dev` e rode de novo.",
  ).toBeUndefined();
}

/** Guarda o CSS do build e a fonte embutida, uma vez por execução. */
async function salvarCss(page: Page) {
  if (cssSalvo) return;

  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll('link[rel="stylesheet"]')].map(
      (l) => (l as HTMLLinkElement).href,
    ),
  );

  expect(
    hrefs.length,
    "nenhuma folha de estilo na página: a captura sairia sem desenho",
  ).toBeGreaterThan(0);

  let css = "";
  for (const href of hrefs) {
    const resposta = await page.request.get(href);
    expect(resposta.ok(), `a folha ${href} não respondeu`).toBe(true);
    css += (await resposta.text()) + "\n";
  }

  /*
   * **A fonte vai embutida em base64.**
   *
   * Por `file://` o Chrome trata fonte buscada por caminho relativo como
   * origem opaca e se recusa a carregá-la — a página abriria na fonte do
   * sistema, e metade do que se vê num design é a tipografia. Custo: +103 KB
   * **uma vez**, não por página.
   */
  const fontes = [...css.matchAll(/url\((["']?)([^"')]+\.woff2)\1\)/g)];
  for (const [inteiro, , caminho] of fontes) {
    const url = new URL(caminho!, hrefs[0]!).href;
    const resposta = await page.request.get(url);
    if (!resposta.ok()) continue;
    const base64 = Buffer.from(await resposta.body()).toString("base64");
    css = css.split(inteiro).join(`url(data:font/woff2;base64,${base64})`);
  }

  writeFileSync(join(ATIVOS, "app.css"), css);
  cssSalvo = true;
}

/** Baixa as imagens que a página usa e devolve o mapa de reescrita. */
async function baixarImagens(page: Page, urls: string[]) {
  for (const url of urls) {
    if (baixadas.has(url) || url.startsWith("data:")) continue;

    const resposta = await page.request.get(url);
    if (!resposta.ok()) continue;

    const tipo = resposta.headers()["content-type"] ?? "image/png";
    const extensao = tipo.includes("svg")
      ? "svg"
      : tipo.includes("webp")
        ? "webp"
        : tipo.includes("gif")
          ? "gif"
          : tipo.includes("jpeg")
            ? "jpg"
            : "png";

    const nome = `${createHash("sha1").update(url).digest("hex").slice(0, 12)}.${extensao}`;
    writeFileSync(join(IMAGENS, nome), await resposta.body());
    baixadas.set(url, `../ativos/imagens/${nome}`);
  }
}

/**
 * Retrata a tela, e congela o HTML quando ela está na lista das seis.
 *
 * `ancora` é obrigatória: sem ela a captura sairia feliz de uma tela vazia ou
 * de uma que nem carregou, e o retrato de uma tela vazia passa por tela vazia
 * de verdade. É a regra do `toHaveCount(0)` do Faustão aplicada à captura.
 */
async function capturar(page: Page, id: string, ancora: () => Promise<void>) {
  const pagina = porId.get(id);
  expect(pagina, `"${id}" não está no catálogo em design/referencia/paginas.ts`).toBeDefined();

  /*
   * **Erro deixa imagem.**
   *
   * Uma âncora que não casa dá um tempo esgotado e nada mais: dá para saber
   * que a tela não era a esperada, e não dá para saber o que ela era. Isto
   * custou três rodadas de dois minutos adivinhando rótulo — "Hot Topic" que
   * na tela é "DESTAQUE DO DIA", "Nome da comunidade" que é só "Nome". Um
   * retrato da falha responde na primeira.
   */
  try {
    await ancora();
  } catch (erro) {
    const caminho = join("test-results", `falha-${id}.png`);
    await page.screenshot({ path: caminho, fullPage: true }).catch(() => {});
    console.error(`\n  a âncora de "${id}" falhou. A tela que estava lá: ${caminho}\n`);
    throw erro;
  }

  await page.waitForLoadState("networkidle").catch(() => {});

  const urls = (await page.evaluate(NORMALIZAR)) as string[];
  await salvarCss(page);
  await baixarImagens(page, urls);

  await page.screenshot({ path: join(RETRATOS, `${id}.png`), fullPage: true });

  if (CONGELAR.has(id)) {
    const tela = telaPorId.get(id)!;
    let html = await page.content();

    for (const url of [...baixadas.keys()].sort((a, b) => b.length - a.length)) {
      html = html.split(url).join(baixadas.get(url)!);
    }

    html = congelarHtml(html, {
      css: "../ativos/app.css",
      tema: "../ativos/tema.js",
      ficha: fichaDe(tela),
      procedencia: procedencia({
        titulo: tela.titulo,
        rota: tela.rota,
        origem: tela.origem,
        layouts: tela.layouts,
        estado: tela.estado,
        componentes: tela.componentes,
        commit,
        data: hoje,
      }),
    });

    const problemas = problemasDoHtml(html);
    expect(problemas, `"${id}" não pode viajar: ${problemas.join(" | ")}`).toEqual([]);

    writeFileSync(join(PAGINAS_HTML, `${id}.html`), html);
  }

  feitas.add(id);
}

/**
 * Os pontos que a troca de tokens **não** alcança, medidos no HTML capturado.
 *
 * Quase todo o CSS do Hub é movido por tokens — `app/globals.css` não tem um
 * único hex, e `design/tokens.test.ts` garante isso. O que escapa são os
 * lugares em que a cor vai para o HTML em vez do CSS, e quem for trocar o
 * design precisa saber de cada um **antes** de descobrir pela tela errada.
 *
 * A varredura olha o que foi capturado, e não uma lista que eu escrevi: lista
 * à mão envelhece, e esta tem de contar o que existe hoje.
 */
function foraDoTema(): string[] {
  const achados = new Set<string>();

  for (const id of CONGELAR) {
    const caminho = join(PAGINAS_HTML, `${id}.html`);
    let html = "";
    try {
      html = readFileSync(caminho, "utf8");
    } catch {
      continue;
    }

    const semFicha = html.replace(/<details data-hub-ficha[\s\S]*?<\/details>/g, "");

    const metaTema = /<meta name="theme-color" content="(#[0-9a-fA-F]{3,8})"/.exec(semFicha);
    if (metaTema) {
      achados.add(
        `<meta name="theme-color"> sai com o hex literal (${metaTema[1]}), de app/layout.tsx. ` +
          "Ele pinta a barra do navegador na PWA, e não acompanha o token.",
      );
    }

    const estilosComCor = semFicha.match(/style="[^"]*(#[0-9a-fA-F]{3,8}|rgba?\(|oklch\()[^"]*"/g);
    if (estilosComCor) {
      achados.add(
        `${estilosComCor.length} atributo(s) style com cor escrita no HTML em ${id}.html. ` +
          "Cor em atributo não vem de token e não muda com o tema.",
      );
    }

    if (/background-image:\s*url\(/.test(semFicha)) {
      achados.add(
        `${id}.html tem imagem de fundo em style inline — a capa, que é conteúdo, não token.`,
      );
    }
  }

  achados.add(
    "design/gallery.tsx desenha as amostras com style={{ backgroundColor: value }} e imprime " +
      "os hex como texto. É documentação da paleta, e por isso não escurece junto.",
  );

  return [...achados];
}

/** A ficha visível, que a página carrega sobre si mesma. */
function fichaDe(tela: NonNullable<ReturnType<typeof telaPorId.get>>): string {
  const linha = (rotulo: string, valor: string) =>
    `<div style="margin:4px 0"><b>${rotulo}:</b> ${valor}</div>`;

  return `<details data-hub-ficha style="position:fixed;bottom:12px;right:12px;z-index:99999;max-width:420px;font:12px/1.5 system-ui;background:#fff;color:#111;border:1px solid #ccc;border-radius:6px;padding:8px 10px;box-shadow:0 2px 12px rgba(0,0,0,.18)">
<summary style="cursor:pointer;font-weight:700">${tela.titulo} — ficha</summary>
${linha("rota", `<code>${tela.rota}</code>`)}
${linha("desenha em", `<code>${tela.origem}</code>`)}
${linha("estado", tela.estado)}
${linha("componentes", `${tela.componentes.length} — ver <code>MAPA.md</code>`)}
${linha("capturado", `${hoje}, commit <code>${commit}</code>`)}
<div style="margin-top:6px;opacity:.75">Retrato: nada aqui é interativo. Esta ficha é da ferramenta, não do Hub.</div>
</details>`;
}

// ===========================================================================

test.describe.serial("páginas de referência", () => {
  let personas: Personas;
  let cenario: Cenario;

  test("prepara e retrata a entrada", async ({ browser }) => {
    prepararPastas();
    console.log(`\n  ATENÇÃO: isto apaga o banco local (o seed trunca tudo).\n`);

    const contexto = await browser.newContext();
    const page = await contexto.newPage();

    await page.goto("/");
    await recusarServidorDeDesenvolvimento(page);

    await capturar(page, "abertura", async () => {
      await expect(page.getByRole("link", { name: /Criar conta/ })).toBeVisible();
    });

    await capturar(page, "entrar", async () => {
      await page.goto("/entrar");
      await expect(page.getByLabel("Email ou @")).toBeVisible();
    });

    await capturar(page, "criar-conta", async () => {
      await page.goto("/criar-conta");
      await expect(page.getByLabel("Nome completo")).toBeVisible();
    });

    await capturar(page, "senha", async () => {
      await page.goto("/senha");
      await expect(page.getByRole("button", { name: "Enviar código" })).toBeVisible();
    });

    await capturar(page, "senha-codigo", async () => {
      await page.goto("/senha/codigo?email=alguem%40teste.hub");
      await expect(page.getByLabel("Dígito 1 de 6")).toBeVisible();
    });

    await capturar(page, "termos", async () => {
      await page.goto("/termos");
      await expect(page.getByRole("heading", { name: /Termos/ })).toBeVisible();
    });

    await contexto.close();
  });

  test("abre as personas e retrata os vazios", async ({ browser }) => {
    personas = await abrirPersonas(browser);

    /*
     * **Os vazios primeiro, e é por isto que a persona C existe.**
     *
     * O Início sem comunidade, a Cabine sem conversa e as notificações sem
     * aviso só existem antes de criar conteúdo. Capturados depois, seriam
     * telas cheias com nome de vazio — e um retrato que mente sobre o estado
     * é pior do que um retrato que falta.
     */
    const c = personas.c.page;

    // A RN31 obriga a escolher três comunidades no onboarding, então o Início
    // vazio não é o primeiro estado de ninguém: ele existe quando alguém sai
    // de todas. Tirar pelo banco é o caminho que `e2e/inicio.spec.ts` já usa.
    await esvaziarComunidades(personas.c.conta.handle);

    await capturar(c, "inicio-vazio", async () => {
      await c.goto("/inicio");
      // Texto exato, e nao alternancia: `Explorar comunidades` casa o titulo
      // **e** o botao, e o modo estrito do Playwright reprova em dois.
      await expect(c.getByText("Suas comunidades aparecem aqui")).toBeVisible();
    });

    await capturar(c, "notificacoes-vazia", async () => {
      await c.goto("/notificacoes");
      await expect(c.getByText(/Nada por aqui/)).toBeVisible();
    });

    await capturar(c, "cabines-vazia", async () => {
      await c.goto("/cabines");
      await expect(c.getByText(/Escolha uma conversa/)).toBeVisible();
    });
  });

  test("retrata o onboarding", async ({ browser }) => {
    /*
     * Uma quarta conta, só para o onboarding: as três personas já o
     * concluíram, e `onboardedAt` não volta atrás. É a mesma razão dos
     * vazios — estado que só existe uma vez precisa ser retratado quando
     * existe.
     */
    const contexto = await browser.newContext();
    const page = await contexto.newPage();

    await page.goto("/criar-conta");
    await page.getByLabel("Nome completo").fill("Teo Marques");
    /*
     * **Email único, @ fixo.** Os dois não podem seguir a mesma regra.
     *
     * O seed trunca `profiles`, então o @ volta a ficar livre a cada
     * execução — fixo, ele deixa os retratos legíveis. Mas em `auth.users`
     * ele só apaga quem termina em `@hub.test`, e as contas da captura usam
     * `@teste.hub`: um email fixo sobrevive, e a segunda execução parava no
     * cadastro com a conta já existente.
     */
    await page.getByLabel("Email").fill(`teo-${Date.now()}@teste.hub`);
    await page.getByLabel("@").fill("teo");
    await page.getByLabel("Senha", { exact: true }).fill("senhaboa123");
    await page.getByLabel("Data de nascimento").fill(`${new Date().getUTCFullYear() - 25}-03-10`);

    await capturar(page, "criar-conta-preenchida", async () => {
      const caixa = page.getByRole("checkbox");
      await caixa.click();
      await expect(caixa).toHaveAttribute("aria-checked", "true");
    });

    await page.getByRole("button", { name: "Continuar" }).click();
    await page.waitForURL(/\/boas-vindas/, { timeout: 60_000 });

    /*
     * **Os helpers, e não os meus palpites.**
     *
     * Eu havia escrito `/Avançar|Começar/` para o botão de andar os cards. O
     * rótulo é "Próximo card", e os chips não têm `#` no nome acessível: eles
     * vivem num grupo chamado "Comunidades". Os dois nomes já mudaram uma vez
     * (a F12.1 trocou o rótulo do grupo), e é por isso que `apoio-tela.ts`
     * existe — adivinhar aqui seria criar a décima sexta cópia do seletor.
     */
    await capturar(page, "boas-vindas-primeiro-card", async () => {
      await expect(page.getByRole("button", { name: "Próximo card" })).toBeVisible();
    });

    await avancarApresentacao(page);

    await capturar(page, "boas-vindas-comunidades", async () => {
      await escolherComunidades(page, 3);
      await expect(page.getByRole("button", { name: "Iniciar Jornada" })).toBeEnabled();
    });

    await page.getByRole("button", { name: "Iniciar Jornada" }).click();

    await capturar(page, "boas-vindas-notificacoes", async () => {
      await expect(page.getByRole("button", { name: "Agora não" })).toBeVisible({
        timeout: 30_000,
      });
    });

    await contexto.close();
  });

  test("monta o cenário e retrata o resto", async () => {
    test.slow();
    cenario = await montarCenario(personas);

    const a = personas.a.page;
    const b = personas.b.page;
    const { slugDaComunidade: slug, slugDoTopico: topico } = cenario;

    // ------------------------------------------------------------- início
    await capturar(a, "inicio-cheio", async () => {
      await a.goto("/inicio");
      // "DESTAQUE DO DIA" é o rótulo na tela; "Hot Topic" é só nome interno.
      await expect(a.locator("article", { hasText: "DESTAQUE DO DIA" }).first()).toBeVisible({
        timeout: 20_000,
      });
    });

    // --------------------------------------------------------- descoberta
    await capturar(a, "explorar", async () => {
      await a.goto("/comunidades");
      await expect(a.getByRole("heading", { name: /Explorar/ })).toBeVisible();
    });

    await capturar(a, "busca", async () => {
      await a.goto(`/busca?q=${encodeURIComponent("Cinema")}`);
      await expect(a.getByText(/Cinema/).first()).toBeVisible();
    });

    await capturar(a, "minhas-comunidades", async () => {
      await a.goto("/comunidades/minhas");
      await expect(a.getByText(cenario.comunidade).first()).toBeVisible();
    });

    await capturar(a, "comunidade-nova", async () => {
      await a.goto("/comunidades/nova");
      await expect(a.getByRole("button", { name: "Criar comunidade" })).toBeVisible();
    });

    /*
     * **Uma segunda comunidade, só para o vazio.**
     *
     * A primeira nasceu e ganhou tópicos no mesmo minuto — é o que o cenário
     * precisa —, então "comunidade recém-criada, nenhum tópico" não existia
     * em lugar nenhum. A barreira de integridade pegou: ela reprovou dizendo
     * que `comunidade-vazia` não tinha retrato.
     *
     * Criar uma segunda é o caminho honesto: é o estado de verdade de quem
     * acabou de criar, com um membro e a lista vazia. Não há limite diário de
     * comunidades (o limite da RN07 é de tópicos).
     */
    await preencherNovaComunidade(
      a,
      "Sala Vazia",
      "Uma comunidade que acabou de nascer. Nenhum tópico ainda.",
    );
    await a.waitForURL(/\/c\/[^/]+$/, { timeout: 30_000 });

    await capturar(a, "comunidade-vazia", async () => {
      /*
        `exact` não é zelo: a intro desta comunidade **termina com a mesma
        frase** ("Uma comunidade que acabou de nascer. Nenhum tópico ainda."),
        e `getByText` casa por trecho. Sem ele são dois elementos e a captura
        reprova com "strict mode violation" — que fala do seletor e não diz
        nada sobre a causa.
      */
      await expect(a.getByText("Nenhum tópico ainda", { exact: true })).toBeVisible({
        timeout: 20_000,
      });
    });

    // -------------------------------------------------------- comunidade
    await capturar(a, "comunidade-cheia", async () => {
      await a.goto(`/c/${slug}`);
      await expect(a.locator("article", { hasText: "DESTAQUE DO DIA" })).toBeVisible({
        timeout: 20_000,
      });
    });

    await capturar(a, "comunidade-enquetes", async () => {
      await a.goto(`/c/${slug}?aba=enquetes`);
      await expect(a.getByText("Qual sessão a gente marca?")).toBeVisible();
    });

    await capturar(a, "comunidade-eventos", async () => {
      await a.goto(`/c/${slug}?aba=eventos`);
      await expect(a.getByText("Sessão dupla: Kurosawa")).toBeVisible();
    });

    /*
     * **O encontro aberto, com a conversa embaixo.**
     *
     * Entra pelo caminho de quem usa — o link de comentários no cartão da
     * lista —, e não por um id lido do banco: o retrato tem de provar que o
     * caminho existe. Era exatamente o que faltava quando esta tela nasceu,
     * e a falta não aparecia em teste nenhum, porque as jornadas montavam o
     * endereço à mão.
     */
    await capturar(a, "comunidade-evento-aberto", async () => {
      await a.goto(`/c/${slug}?aba=eventos`);
      await a
        .getByRole("link", { name: /coment/i })
        .first()
        .click();
      await expect(a.getByRole("heading", { name: "Comentários" })).toBeVisible({
        timeout: 20_000,
      });
    });

    await capturar(a, "comunidade-membros", async () => {
      await a.goto(`/c/${slug}?aba=membros`);
      await expect(a.getByText(personas.b.conta.nome).first()).toBeVisible();
    });

    await capturar(a, "comunidade-janela-novo-topico", async () => {
      await a.goto(`/c/${slug}?novo=1`);
      await expect(a.getByRole("dialog")).toBeVisible({ timeout: 15_000 });
    });

    // ------------------------------------------------------------ tópico
    await capturar(a, "topico-no-painel", async () => {
      await a.goto(`/c/${slug}?t=${topico}`);
      await expect(a.getByRole("textbox", { name: /Contribuir|contribuição/i })).toBeVisible({
        timeout: 20_000,
      });
    });

    // ------------------------------------------------------------ perfil
    await capturar(a, "perfil-dono-blog", async () => {
      await a.goto("/perfil");
      await expect(
        a.getByRole("heading", { level: 3, name: "O que eu aprendi vendo filme sozinho" }),
      ).toBeVisible({ timeout: 20_000 });
    });

    await capturar(a, "perfil-post-no-painel", async () => {
      await a.goto(`/perfil?post=${cenario.slugDoPost}`);
      await expect(a.getByRole("complementary").first()).toBeVisible({ timeout: 20_000 });
    });

    await capturar(a, "perfil-editar", async () => {
      await a.goto("/perfil/editar");
      await expect(a.getByLabel(/Nome/).first()).toBeVisible();
    });

    await capturar(a, "perfil-seguindo", async () => {
      await a.goto("/perfil/seguindo?aba=seguidores");
      await expect(a.getByText(personas.b.conta.nome).first()).toBeVisible({ timeout: 20_000 });
    });

    await capturar(b, "perfil-visitante", async () => {
      await b.goto(`/${personas.a.conta.handle}`);
      await expect(b.getByRole("heading", { name: personas.a.conta.handle })).toBeVisible();
    });

    // ------------------------------------------------------------ cabine
    await capturar(a, "cabine-conversa", async () => {
      await a.goto(cenario.cabine);
      await expect(
        a.getByRole("region", { name: "Conversa" }).getByText("19h30. Anotado."),
      ).toBeVisible({ timeout: 20_000 });
    });

    await capturar(a, "cabine-nova", async () => {
      await a.goto("/cabines/nova");
      await a.getByLabel("Buscar pessoas").fill(personas.c.conta.nome);
      await expect(a.getByRole("group", { name: "Pessoas" })).toBeVisible({ timeout: 20_000 });
    });

    // --------------------------------------------------------- moderação
    await capturar(b, "denuncia", async () => {
      /*
       * Pelo menu da contribuição, e não por um `?resposta=` inventado: eu
       * tinha deixado um `goto("/denuncia?resposta=x")` como aquecimento, e
       * o `x` chegava ao Prisma como uuid — o servidor cuspia
       * `invalid input syntax for type uuid` no log a cada execução. Erro de
       * servidor que o gerador provoca de propósito acaba lido como erro de
       * verdade na próxima vez que alguém olhar.
       */
      await b.goto(`/c/${slug}?t=${topico}`);
      await b
        .getByRole("button", { name: /^Opções da contribuição de/ })
        .first()
        .click();
      await b.getByRole("link", { name: "Denunciar" }).click();
      await expect(b.getByRole("heading", { name: /Denunciar/ })).toBeVisible({ timeout: 15_000 });
    });

    await capturar(a, "moderar-denuncias", async () => {
      await a.goto(`/c/${slug}/moderar`);
      await expect(a.getByRole("heading", { name: /Moderar/ })).toBeVisible({ timeout: 20_000 });
    });

    await capturar(a, "moderar-membros", async () => {
      await a.goto(`/c/${slug}/moderar?aba=membros`);
      await expect(a.getByText(personas.b.conta.nome).first()).toBeVisible({ timeout: 20_000 });
    });

    // ----------------------------------------------------------- sistema
    await capturar(b, "notificacoes-cheia", async () => {
      await b.goto("/notificacoes");
      await expect(b.getByText(/Essa semana|Só para te avisar/).first()).toBeVisible({
        timeout: 20_000,
      });
    });

    await capturar(a, "configuracoes", async () => {
      await a.goto("/configuracoes");
      await expect(a.getByRole("button", { name: "Sair" })).toBeVisible();
    });

    await capturar(a, "design-galeria", async () => {
      await a.goto("/design");
      await expect(a.getByText(/Estados do sistema/).first()).toBeVisible({ timeout: 20_000 });
    });

    // ------------------------------------------------- convite sem conta
    const semConta = personas.semConta.page;

    await capturar(semConta, "convite-comunidade", async () => {
      await semConta.goto(`/c/${slug}`);
      await expect(semConta.getByText(cenario.comunidade).first()).toBeVisible({ timeout: 20_000 });
    });

    await capturar(semConta, "convite-topico", async () => {
      await semConta.goto(`/c/${slug}/${topico}`);
      await expect(semConta.getByText(cenario.topico).first()).toBeVisible({ timeout: 20_000 });
    });
  });

  test("escreve o mapa, o índice, e confere que nada ficou pela metade", async () => {
    writeFileSync(join(PASTA, "mapa.json"), JSON.stringify(mapa, null, 2) + "\n");
    writeFileSync(join(PASTA, "MAPA.md"), mapaEmMarkdown(mapa));
    writeFileSync(
      join(PASTA, "index.html"),
      montarIndice(mapa, { congeladas: [...CONGELAR], foraDoTema: foraDoTema() }),
    );

    const faltando = PAGINAS.filter((p) => !feitas.has(p.id)).map((p) => p.id);
    expect(
      faltando,
      `telas do catálogo sem retrato: ${faltando.join(", ")}. ` +
        "Uma pasta pela metade é pior do que nenhuma: quem abrir não tem como saber o que falta.",
    ).toEqual([]);

    const semHtml = [...CONGELAR].filter((id) => !feitas.has(id));
    expect(semHtml, "telas que deviam virar HTML e não viraram").toEqual([]);

    console.log(
      `\n  ${feitas.size} retratos, ${CONGELAR.size} páginas congeladas, ` +
        `${baixadas.size} imagens. Pasta: ${PASTA}\n`,
    );
  });
});
