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
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
