import { expect, test, type Page } from "@playwright/test";

/**
 * Jornadas da entrada (F03).
 *
 * A recuperação de senha é testada **de ponta a ponta de verdade**: o código
 * é lido da caixa de entrada do Supabase local (Mailpit), como a pessoa faria.
 * Testar com um código inventado provaria só que o formulário aceita dígitos.
 */

const MAILPIT = "http://127.0.0.1:54324";

/**
 * O Next mantém um anunciador de rota com `role="alert"`, invisível e sempre
 * presente. Buscar por papel pegaria os dois, então a busca é restrita ao
 * conteúdo da página.
 */
function alerta(page: Page) {
  return page.locator("main").getByRole("alert");
}

/** Email único por execução, para um teste não herdar a conta do outro. */
function novoEmail(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@teste.hub`;
}

/** Data de nascimento de quem tem a idade indicada. */
function nascimentoComIdade(anos: number) {
  const hoje = new Date();
  return new Date(Date.UTC(hoje.getUTCFullYear() - anos, 0, 15)).toISOString().slice(0, 10);
}

const nascimentoAdulto = () => nascimentoComIdade(25);

async function preencherCadastro(
  page: Page,
  dados: { nome: string; email: string; senha: string; nascimento: string },
) {
  await page.getByLabel("Nome completo").fill(dados.nome);
  await page.getByLabel("Email").fill(dados.email);
  await page.getByLabel("Senha", { exact: true }).fill(dados.senha);
  await page.getByLabel("Data de nascimento").fill(dados.nascimento);
}

/** Último código de 6 dígitos enviado para o endereço. */
async function codigoNoEmail(page: Page, email: string): Promise<string> {
  const busca = await page.request.get(
    `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
  );
  const { messages } = (await busca.json()) as { messages: { ID: string }[] };
  expect(messages.length, `nenhum email chegou para ${email}`).toBeGreaterThan(0);

  const corpo = await page.request.get(`${MAILPIT}/api/v1/message/${messages[0]!.ID}`);
  const { Text, HTML } = (await corpo.json()) as { Text: string; HTML: string };

  const codigo = `${Text}\n${HTML}`.match(/\b(\d{6})\b/);
  expect(codigo, "o email não trouxe um código de 6 dígitos").not.toBeNull();
  return codigo![1]!;
}

/**
 * Cria uma conta e sai, deixando a pessoa pronta para entrar.
 *
 * Espera o cadastro **terminar** antes de navegar: ir direto para /inicio
 * corria com a Server Action, que ainda não tinha gravado o cookie de sessão.
 */
async function criarContaESair(page: Page, dados: { nome: string; email: string; senha: string }) {
  await page.goto("/criar-conta");
  await preencherCadastro(page, { ...dados, nascimento: nascimentoAdulto() });
  await aceitarTermos(page);
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/boas-vindas/);

  // RN31: sem concluir o onboarding a pessoa não chega ao Início, então o
  // caminho para sair passa por ele.
  await page.getByRole("link", { name: "Começar" }).click();
  for (let i = 0; i < 3; i += 1) {
    await page
      .getByRole("group", { name: /^Comunidades de / })
      .getByRole("button", { pressed: false })
      .first()
      .click();
  }
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Agora não" }).click();
  await expect(page).toHaveURL(/\/inicio/);
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/$/);
}

/**
 * Marca o aceite dos Termos e **confirma** que marcou.
 *
 * Clicar logo depois de abrir a página às vezes acontece antes da hidratação:
 * o clique não vira estado, o campo escondido do aceite não é enviado e o
 * cadastro falha por um motivo que não tem nada a ver com o que o teste quer
 * verificar. Conferir o estado antes de enviar remove essa corrida.
 */
async function aceitarTermos(page: Page) {
  const caixa = page.getByRole("checkbox");
  await expect(caixa).toHaveAttribute("aria-checked", "false");
  await caixa.click();
  await expect(caixa).toHaveAttribute("aria-checked", "true");
}

test.describe("tela inicial", () => {
  test("mostra a marca, a frase e os dois caminhos", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(0);
    await expect(page.getByText("Conecte-se pelo que realmente importa.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Criar conta" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Termos e privacidade" })).toBeVisible();
  });

  test("as telas de entrada não têm a navegação do app", async ({ page }) => {
    await page.goto("/entrar");
    // A navegação do Hub tem Início, Explorar, Comunidades, Cabine, Perfil.
    await expect(page.getByRole("navigation")).toHaveCount(0);
  });
});

test.describe("RN29: criar conta", () => {
  test("não cria conta sem aceitar os Termos", async ({ page }) => {
    const email = novoEmail("sem-aceite");
    await page.goto("/criar-conta");
    await preencherCadastro(page, {
      nome: "Ana Lima",
      email,
      senha: "senhaboa123",
      nascimento: nascimentoAdulto(),
    });

    // Sem marcar a caixa.
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(alerta(page)).toContainText("aceitar os Termos");
    await expect(page).toHaveURL(/\/criar-conta/);
  });

  // 17 é o caso que importa: quem tem 12 qualquer regra barra. A fronteira é
  // onde o erro mora, e ela mudou de 16 para 18.
  for (const idade of [12, 17]) {
    test(`não cria conta para quem tem ${idade} anos`, async ({ page }) => {
      await page.goto("/criar-conta");
      await preencherCadastro(page, {
        nome: "Pessoa Jovem",
        email: novoEmail("menor"),
        senha: "senhaboa123",
        nascimento: nascimentoComIdade(idade),
      });
      await aceitarTermos(page);
      await page.getByRole("button", { name: "Continuar" }).click();

      await expect(alerta(page)).toContainText("18 anos");
      await expect(page).toHaveURL(/\/criar-conta/);
    });
  }

  test("cria conta para quem acabou de fazer 18", async ({ page }) => {
    await page.goto("/criar-conta");
    await preencherCadastro(page, {
      nome: "Pessoa de 18",
      email: novoEmail("dezoito"),
      senha: "senhaboa123",
      nascimento: nascimentoComIdade(18),
    });
    await aceitarTermos(page);
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL(/\/boas-vindas/);
  });

  test("dá para escolher o @ no cadastro", async ({ page }) => {
    const escolhido = `eu${Date.now()}`.slice(0, 20);

    await page.goto("/criar-conta");
    await preencherCadastro(page, {
      nome: "Pessoa Com Arroba",
      email: novoEmail("arroba"),
      senha: "senhaboa123",
      nascimento: nascimentoAdulto(),
    });
    await page.getByLabel("@ (opcional)").fill(escolhido);
    await aceitarTermos(page);
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL(/\/boas-vindas/);
  });

  test("avisa quando o @ já está em uso, antes de enviar", async ({ page }) => {
    // @liasouza vem do seed.
    await page.goto("/criar-conta");
    await page.getByLabel("@ (opcional)").fill("liasouza");

    await expect(page.locator("main").getByText("Esse @ já está em uso")).toBeVisible();
  });

  test("avisa quando o @ tem formato inválido", async ({ page }) => {
    await page.goto("/criar-conta");
    await page.getByLabel("@ (opcional)").fill("Phe Bruns!");

    await expect(page.locator("main").getByText(/de 2 a 20 letras minúsculas/)).toBeVisible();
  });

  test("cria conta com tudo preenchido", async ({ page }) => {
    await page.goto("/criar-conta");
    await preencherCadastro(page, {
      nome: "Ana Lima",
      email: novoEmail("ana"),
      senha: "senhaboa123",
      nascimento: nascimentoAdulto(),
    });
    await aceitarTermos(page);
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL(/\/boas-vindas/);
  });
});

test.describe("entrar", () => {
  test("mensagem igual para senha errada e email inexistente", async ({ page }) => {
    // Email que não existe.
    await page.goto("/entrar");
    await page.getByLabel("Email").fill(novoEmail("fantasma"));
    await page.getByLabel("Senha").fill("qualquer-senha");
    await page.getByRole("button", { name: "Entrar" }).click();
    const semConta = await alerta(page).textContent();

    // Conta real, senha errada.
    const email = novoEmail("existe");
    await criarContaESair(page, { nome: "Pessoa Real", email, senha: "senhaboa123" });

    await page.goto("/entrar");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Senha").fill("senha-errada-mesmo");
    await page.getByRole("button", { name: "Entrar" }).click();
    const senhaErrada = await alerta(page).textContent();

    // Se as mensagens diferissem, o formulário viraria ferramenta de descobrir
    // quem tem conta no Hub.
    expect(senhaErrada).toBe(semConta);
  });

  test("destino de retorno fora do Hub é descartado", async ({ page }) => {
    const email = novoEmail("retorno");
    await criarContaESair(page, { nome: "Pessoa Retorno", email, senha: "senhaboa123" });

    await page.goto("/entrar?next=https://site-falso.example");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Senha").fill("senhaboa123");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/inicio/);
    expect(page.url()).not.toContain("site-falso");
  });
});

test.describe("recuperar senha, de ponta a ponta", () => {
  test("pede código, lê do email, troca a senha e entra", async ({ page }) => {
    const email = novoEmail("recupera");
    const senhaNova = "senha-nova-456";

    // Conta primeiro.
    await criarContaESair(page, {
      nome: "Pessoa Esquecida",
      email,
      senha: "senha-antiga-123",
    });

    // Pede o código.
    await page.goto("/senha");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Enviar código" }).click();
    await expect(page).toHaveURL(/\/senha\/codigo/);

    // Lê o código na caixa de entrada, como a pessoa faria.
    const codigo = await codigoNoEmail(page, email);

    for (const [index, digito] of [...codigo].entries()) {
      await page.getByLabel(`Dígito ${index + 1} de 6`).fill(digito);
    }
    await page.getByLabel("Nova senha").fill(senhaNova);
    await page.getByRole("button", { name: "Salvar e entrar" }).click();

    await expect(page).toHaveURL(/\/inicio/);

    // E a senha nova funciona de verdade.
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/entrar");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Senha").fill(senhaNova);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/inicio/);
  });

  test("email sem conta responde igual a email com conta", async ({ page }) => {
    await page.goto("/senha");
    await page.getByLabel("Email").fill(novoEmail("nao-existe"));
    await page.getByRole("button", { name: "Enviar código" }).click();

    // Mesma tela: quem perguntou não descobre se a conta existe.
    await expect(page).toHaveURL(/\/senha\/codigo/);
  });
});
