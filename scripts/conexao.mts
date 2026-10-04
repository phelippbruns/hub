/**
 * Pergunta a conexão de um banco remoto, sem deixar a senha vazar.
 *
 * Compartilhado pelos scripts que falam com um banco que não é o local.
 * Existe por dois motivos aprendidos na prática:
 *
 * 1. **A senha quebra a URL.** Caracteres como `@`, `/`, `:`, `#` e `?` têm
 *    significado dentro de um endereço. Aqui ela é codificada antes de entrar.
 *
 * 2. **Senha em comando vaza.** Digitada na linha de comando, fica no
 *    histórico do terminal e aparece na lista de processos. Aqui é pedida com
 *    a digitação oculta e nunca é impressa.
 */
import { createInterface } from "node:readline";

const PLACEHOLDER = /\[YOUR-PASSWORD\]|\[SUA-SENHA\]/i;

type ReadlineInterno = { _writeToOutput: (texto: string) => void };

const interativo = Boolean(process.stdin.isTTY);

/*
 * Fora do terminal (entrada vinda de um cano, como nos testes), o readline
 * consome o fluxo inteiro de uma vez: a segunda pergunta nunca receberia nada.
 * Por isso a entrada é lida de uma vez e servida linha a linha.
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

export function perguntar(pergunta: string, oculto = false): Promise<string> {
  if (!rl) {
    process.stdout.write(pergunta + "\n");
    return Promise.resolve(linhasPendentes.shift() ?? "");
  }

  return new Promise((resolve) => {
    rl.question(pergunta, (resposta) => {
      if (oculto) {
        delete (rl as unknown as Partial<ReadlineInterno>)._writeToOutput;
        process.stdout.write("\n");
      }
      resolve(resposta.trim());
    });

    // Silencia o eco depois que a pergunta já foi escrita.
    if (oculto) {
      (rl as unknown as ReadlineInterno)._writeToOutput = () => {};
    }
  });
}

export function encerrar(codigo = 0): never {
  rl?.close();
  process.exit(codigo);
}

export const INSTRUCOES = `
No Supabase: botão Connect no topo, aba "Session pooler", e copie a linha que
termina em :5432/postgres — com o [YOUR-PASSWORD] ainda no meio, sem trocar
nada.

Use o pooler de sessão, não a conexão direta \`db.PROJETO.supabase.co\`: a
direta só responde em IPv6, e vários ambientes são IPv4.
`;

/** Monta a URL de conexão perguntando o que falta. */
export async function pedirConexao(): Promise<{ url: string; host: string }> {
  console.log(INSTRUCOES);

  const modelo = await perguntar("Cole a conexão: ");

  if (!modelo.startsWith("postgres")) {
    console.error("\nIsso não parece uma conexão de banco. Ela começa com postgresql://");
    encerrar(1);
  }
  if (!PLACEHOLDER.test(modelo)) {
    console.error(
      "\nNão encontrei [YOUR-PASSWORD] na conexão.\n" +
        "Cole a linha como o Supabase mostra, sem substituir a senha —\n" +
        "o script faz a substituição com a codificação certa.",
    );
    encerrar(1);
  }

  const senha = await perguntar("Senha do banco (não aparece na tela): ", true);
  if (!senha) {
    console.error("\nSenha vazia.");
    encerrar(1);
  }

  const url = modelo.replace(PLACEHOLDER, encodeURIComponent(senha));

  let host = "(não consegui ler o endereço)";
  try {
    host = new URL(url).host;
  } catch {
    // O host é só para confirmar o destino; não vale abortar por causa dele.
  }

  return { url, host };
}
