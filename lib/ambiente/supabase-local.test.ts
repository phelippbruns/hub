import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * **A lista do que o Supabase local não sobe mora em dois lugares, e eles têm
 * de concordar.**
 *
 * `package.json` e `.github/workflows/ci.yml` carregam a mesma lista de
 * exclusões, e até 25 de novembro de 2026 a igualdade era mantida **por
 * disciplina**. Duas listas mantidas à mão divergem: no dia em que a sua
 * máquina subir um serviço a mais que a CI, um teste passa aqui e reprova lá
 * — ou pior, passa nos dois e esconde que o serviço nem era necessário.
 *
 * **E a segunda asserção é a que custou caro para alguém descobrir.** O CLI do
 * Supabase, diante de um nome de serviço que não conhece, **não falha**: ele
 * imprime `WARNING: The following container names are not valid to exclude` e
 * sobe o serviço normalmente. Quem escrevesse `-x rest` achando que estava
 * cortando o PostgREST (o contêiner se chama `supabase_rest_Hub`, mas a chave
 * é `postgrest`) teria uma rodada inteira dizendo "funcionou" com o serviço de
 * pé — e qualquer medição em cima disso seria mentira.
 *
 * Este teste mora em `lib/` de propósito: assim ele entra em `npm run test`,
 * que a CI roda **antes** de subir o Supabase. A divergência reprova em
 * segundos, não depois de vinte minutos de jornada.
 */

/**
 * Os nomes que o `-x` aceita, exatamente como o `supabase start --help` os
 * imprime.
 *
 * Copiados à mão de propósito: ler do CLI em tempo de teste exigiria baixá-lo,
 * e um teste que depende de rede deixa de ser barato — que é a única razão de
 * este viver entre os testes de unidade.
 *
 * Para atualizar: `npx supabase start --help` e copiar o colchete do
 * `--exclude`.
 */
const NOMES_VALIDOS = [
  "gotrue",
  "realtime",
  "storage-api",
  "imgproxy",
  "kong",
  "mailpit",
  "postgrest",
  "postgres-meta",
  "studio",
  "edge-runtime",
  "logflare",
  "vector",
  "supavisor",
];

/** A lista depois do `-x` num comando `supabase start`, ordenada. */
function exclusoesDe(texto: string, ondeVim: string): string[] {
  const achado = /supabase start\s+-x\s+([a-z0-9,-]+)/.exec(texto);

  expect(
    achado,
    `não achei um \`supabase start -x …\` em ${ondeVim}. ` +
      "Se o comando mudou de forma, este teste parou de guardar qualquer coisa — conserte-o antes de seguir.",
  ).not.toBeNull();

  return achado![1]!.split(",").filter(Boolean).sort();
}

describe("as duas listas de exclusão do Supabase local", () => {
  const pacote = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts: Record<string, string>;
  };
  const ci = readFileSync(".github/workflows/ci.yml", "utf8");

  const daMaquina = exclusoesDe(pacote.scripts["supabase:start"] ?? "", "package.json");
  const daCi = exclusoesDe(ci, ".github/workflows/ci.yml");

  it("acha as duas listas", () => {
    /*
     * Varredura que não acha nada passa vazia e não guarda coisa nenhuma. É a
     * mesma sanidade de `lib/idade.test.ts` e `lib/rotas.test.ts`.
     */
    expect(daMaquina.length).toBeGreaterThan(3);
    expect(daCi.length).toBeGreaterThan(3);
  });

  it("a sua máquina e a CI excluem exatamente os mesmos serviços", () => {
    expect(
      daMaquina,
      "a lista de `-x` do package.json e a do .github/workflows/ci.yml divergiram. " +
        "Duas listas mantidas à mão divergem: o que subir só num dos dois lugares " +
        "faz um teste passar aqui e reprovar lá, ou passar nos dois escondendo que " +
        "o serviço nem era necessário. Mude as duas, no mesmo commit.",
    ).toEqual(daCi);
  });

  it.each(
    NOMES_VALIDOS.length > 0
      ? [
          ["package.json", daMaquina],
          ["ci.yml", daCi],
        ]
      : [],
  )("%s só exclui nomes que o CLI conhece", (_onde, lista) => {
    const desconhecidos = (lista as string[]).filter((n) => !NOMES_VALIDOS.includes(n));

    expect(
      desconhecidos,
      `nome de serviço que o CLI do Supabase não conhece: ${desconhecidos.join(", ")}. ` +
        "Ele **não reprova** nisso — só imprime um aviso e sobe o serviço assim mesmo. " +
        "O caso clássico é `rest`: o contêiner se chama `supabase_rest_…`, mas a chave " +
        "do `-x` é `postgrest`. Veja `npx supabase start --help`.",
    ).toEqual([]);
  });

  it("o comando de fuga continua subindo tudo", () => {
    /*
     * `supabase:start:tudo` existe para quando alguém precisa do Studio ou de
     * um serviço excluído. Ele ganhar um `-x` em silêncio o tornaria idêntico
     * ao outro, e a saída de emergência deixaria de existir sem ninguém notar.
     */
    expect(pacote.scripts["supabase:start:tudo"]).toBeDefined();
    expect(pacote.scripts["supabase:start:tudo"]).not.toContain("-x");
  });
});
