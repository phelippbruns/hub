import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

/**
 * **O capturador das páginas de referência. Não é a suíte de jornadas.**
 *
 * Config separada de propósito, e não um projeto dentro de
 * `playwright.config.ts`: lá o `testDir` é `./e2e`, e um projeto a mais faria
 * `npm run test:e2e` e a CI passarem a **capturar** — dez minutos de escrita
 * em disco no meio de uma suíte que só deveria medir. Separado, a CI continua
 * exatamente como era.
 *
 * O que ela reaproveita, e é o motivo de ser um projeto do Playwright em vez
 * de um script solto:
 *
 * - o `webServer`, que sobe o build e espera a porta;
 * - o `globalSetup`, que semeia o banco e reinicia o Realtime;
 * - o `expect` com repetição automática, contra o qual os helpers de
 *   `e2e/apoio-tela.ts` são escritos — e reaproveitar esses helpers é o que
 *   garante que nenhum estado capturado seja um estado que o produto não
 *   permitiria.
 *
 * **Rodar isto apaga o banco local**: o `globalSetup` chama `npm run db:seed`,
 * que trunca tudo. Está dito no LEIA-ME da pasta e no console antes de
 * começar.
 */
export default defineConfig({
  testDir: "./capturas",
  testMatch: "**/*.captura.ts",
  globalSetup: "./e2e/global-setup.ts",

  /*
   * Uma cena por vez, e nunca em paralelo: as cenas **dependem umas das
   * outras**. O Início vazio só existe antes de a comunidade ser criada, e o
   * Hot Topic só depois de o ciclo virar. Em paralelo a pasta sairia com
   * telas de estados que nunca coexistiram.
   */
  fullyParallel: false,
  workers: 1,

  /*
   * Cinco minutos por cena. Cadastro no Supabase local custa segundos só no
   * hash da senha, e cada persona ainda atravessa sete cards de onboarding —
   * são três contas antes da primeira captura.
   */
  timeout: 300_000,

  /*
   * Zero repetições. Numa suíte de testes repetir esconde instabilidade;
   * aqui ela **corromperia a pasta**: a segunda tentativa começaria com o
   * conteúdo que a primeira criou, e capturaria um vazio que já não é vazio.
   */
  retries: 0,
  reporter: "list",

  /*
   * **Limite por ação e por navegação, que o padrão não tem.**
   *
   * O padrão do Playwright é zero: sem limite, uma ação que não completa
   * espera até o fim do teste. Numa suíte de testes curtos isso não aparece,
   * porque quem estoura primeiro é algum `expect` de cinco segundos. Aqui
   * custou caro: um clique numa estrela ficou preso, e o erro foi "Test
   * timeout of 900000ms exceeded" — quinze minutos para aprender nada. Com
   * limite, o mesmo clique diz qual elemento e por quê.
   */
  expect: { timeout: 15_000 },

  use: {
    /*
     * **O espalhamento vem primeiro.** Escrito depois, ele sobrescreveria o
     * `viewport` e o `deviceScaleFactor` abaixo pelos do perfil do
     * dispositivo — e os retratos sairiam em 1280×720 com fator 2, ou seja,
     * com o dobro dos bytes e o `srcset` errado, sem nada reclamar.
     */
    ...devices["Desktop Chrome"],
    baseURL,
    actionTimeout: 20_000,
    navigationTimeout: 40_000,
    /*
     * 1280 px é a largura das jornadas, e o Hub só tem layout de computador
     * até a F21. `deviceScaleFactor: 1` porque 2 faria o navegador escolher o
     * `srcset` de 2x e dobrar os bytes baixados por imagem.
     */
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    /*
     * Sem animação: o retrato pegaria um cartão no meio de uma transição, e
     * duas execuções dariam imagens diferentes da mesma tela — comparação
     * antes e depois de um redesenho é metade do valor da pasta.
     */
    reducedMotion: "reduce",
  },

  webServer: {
    command: "npm run build && npm run start",
    env: { GIPHY_API_KEY: process.env.GIPHY_API_KEY ?? "" },
    url: baseURL,
    reuseExistingServer: true,
    timeout: 300_000,
  },
});
