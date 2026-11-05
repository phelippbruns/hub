import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  /*
   * Em série, de propósito.
   *
   * As jornadas compartilham um banco, um servidor Next e um Supabase com
   * limite de autenticação de verdade. Em paralelo elas disputam esses três e
   * falham por 429 ou por tempo esgotado — nunca pelo que queriam verificar,
   * e nunca as mesmas duas vezes.
   *
   * Em série a suíte roda em menos de um minuto e passa sempre. Determinismo
   * vale mais do que os segundos economizados.
   */
  fullyParallel: false,
  workers: 1,
  /*
   * 60 s por teste, e não os 30 s padrão.
   *
   * **Toda** jornada aqui começa criando uma conta: cadastro, verificação
   * de idade, sete cards de apresentação, três comunidades e o fim do
   * onboarding. São uns 20 segundos antes de o teste chegar ao que ele
   * veio medir, e vários ficavam a poucos segundos do limite — passavam
   * sozinhos e reprovavam no minuto 20 da suíte, com a máquina ocupada.
   *
   * Isso é falha de relógio, não de produto, e ela custa caro: cada uma
   * manda alguém investigar um defeito que não existe. 60 s continua
   * curto o bastante para um travamento de verdade reprovar.
   *
   * Quem precisa de mais usa `test.slow()`, que triplica — é o caso das
   * jornadas com três sessões abertas ao mesmo tempo.
   */
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "on-first-retry" },

  // Até a F21 o Hub só tem layout de computador (acima de 768 px).
  // Nenhum projeto de celular aqui, de propósito.
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } },
    },
  ],

  webServer: {
    command: "npm run build && npm run start",
    /*
     * O servidor recebe a chave do GIPHY **daqui**, e não do `.env.local`
     * que ele leria sozinho.
     *
     * Sem isto, o processo de teste e o servidor discordavam: na máquina de
     * quem desenvolve o servidor tinha a chave e o teste não, então a
     * decisão de pular saía errada nos dois sentidos. Vazio conta como
     * ausente (`lib/env.ts`), e é assim que a CI roda.
     */
    env: { GIPHY_API_KEY: process.env.GIPHY_API_KEY ?? "" },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
