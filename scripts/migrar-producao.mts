/**
 * Aplica as migrations num banco remoto (produção ou homologação).
 *
 * Existe por dois motivos:
 *
 * 1. **A senha quase sempre quebra a URL.** Caracteres como `@`, `/`, `:`, `#`
 *    e `?` têm significado dentro de um endereço, então uma senha que os tenha
 *    corta a URL no lugar errado. Aqui ela é codificada antes de entrar.
 *
 * 2. **A senha não deve passar pela linha de comando.** Digitada num comando,
 *    ela fica no histórico do terminal e aparece na lista de processos. Aqui é
 *    pedida com a digitação oculta e nunca é impressa.
 *
 * Uso: npm run db:deploy:remoto
 */
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline";

const PLACEHOLDER = /\[YOUR-PASSWORD\]|\[SUA-SENHA\]/i;

type ReadlineInterno = { _writeToOutput: (texto: string) => void };

const interativo = Boolean(process.stdin.isTTY);

/*
 * Fora do terminal (entrada vinda de um cano, como no teste), o readline
 * consome o fluxo inteiro de uma vez: a segunda pergunta nunca receberia nada
 * e o script ficaria esperando para sempre. Por isso aqui a entrada é lida de
 * uma vez e servida linha a linha.
 */
const linhasPendentes: string[] = interativo
  ? []
  : (
      await new Promise<string>((resolve) => {
        let texto = "";
        process.stdin.setEncoding("utf8");
        process.stdin.on("data", (pedaco) => (texto += pedaco));
        process.stdin.on("end", () => resolve(texto));
      })
    )
      .split("\n")
      .map((linha) => linha.trim());

const rl = interativo
  ? createInterface({ input: process.stdin, output: process.stdout, terminal: true })
  : null;

function perguntar(pergunta: string, oculto = false): Promise<string> {
  if (!rl) {
    process.stdout.write(pergunta + "\n");
    return Promise.resolve(linhasPendentes.shift() ?? "");
  }

  return new Promise((resolve) => {
    rl.question(pergunta, (resposta) => {
      if (oculto) {
        // Devolve o eco, para a próxima pergunta aparecer normalmente.
        delete (rl as unknown as Partial<ReadlineInterno>)._writeToOutput;
        process.stdout.write("\n");
      }
      resolve(resposta.trim());
    });

    /*
     * Silencia o eco **depois** que a pergunta já foi escrita: daqui em diante
     * o readline continua lendo, mas o que for digitado não aparece na tela.
     */
    if (oculto) {
      (rl as unknown as ReadlineInterno)._writeToOutput = () => {};
    }
  });
}

function sair(codigo: number): never {
  rl?.close();
  process.exit(codigo);
}

console.log(`
Aplicar as migrations num banco remoto.

No Supabase: botão Connect no topo, aba "Direct connection" (ou "Session
pooler"), e copie a linha que termina em :5432/postgres — com o
[YOUR-PASSWORD] ainda no meio, sem trocar nada.
`);

const modelo = await perguntar("Cole a conexão: ");

if (!modelo.startsWith("postgres")) {
  console.error("\nIsso não parece uma conexão de banco. Ela começa com postgresql://");
  sair(1);
}

if (!PLACEHOLDER.test(modelo)) {
  console.error(
    "\nNão encontrei [YOUR-PASSWORD] na conexão.\n" +
      "Cole a linha como o Supabase mostra, sem substituir a senha —\n" +
      "este script faz a substituição com a codificação certa.",
  );
  sair(1);
}

const senha = await perguntar("Senha do banco (não aparece na tela): ", true);

if (!senha) {
  console.error("\nSenha vazia.");
  sair(1);
}

// encodeURIComponent transforma @ / : # ? e companhia em %40, %2F, %3A…
const url = modelo.replace(PLACEHOLDER, encodeURIComponent(senha));

// O host aparece para confirmar o destino; a senha, nunca.
const destino = (() => {
  try {
    return new URL(url).host;
  } catch {
    return "(não consegui ler o endereço)";
  }
})();

console.log(`\nAplicando as migrations em ${destino}…\n`);

const resultado = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  // A senha vai pelo ambiente do processo filho, não pela linha de comando:
  // assim não entra no histórico nem na lista de processos.
  env: { ...process.env, DIRECT_URL: url, DATABASE_URL: url },
});

if (resultado.status !== 0) {
  // O erro de verdade já apareceu acima, vindo do Prisma. Aqui só as pistas
  // mais comuns — sem afirmar qual é, porque adivinhar manda procurar no
  // lugar errado.
  console.error(
    "\nNão deu certo. A mensagem acima diz o motivo. Se não estiver claro:\n" +
      "  - fala em autenticação ou senha? a senha está errada\n" +
      "  - fala em permissão? o usuário da conexão não tem acesso ao banco\n" +
      "  - não conseguiu conectar? confira se copiou a aba que termina em :5432\n",
  );
  sair(resultado.status ?? 1);
}

console.log(`\nPronto. O banco em ${destino} está com todas as migrations.`);
rl?.close();
