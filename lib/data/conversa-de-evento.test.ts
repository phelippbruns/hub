import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * **A varredura que importa mais que todas as outras deste PR.**
 *
 * A conversa de um evento é um tópico com `event_id` preenchido, e ela
 * **não aparece** na lista da comunidade, na busca, em alta, no perfil nem
 * na contagem de tópicos. Esconder é um predicado — `eventId: null` no
 * Prisma, `event_id IS NULL` no SQL — e predicado é coisa que se esquece.
 *
 * Jornada pega o que já existe. Esta varredura pega **a consulta que nasce
 * na feature seguinte**: quem escrever uma leitura nova de `topics` sem
 * filtro e sem motivo escrito reprova aqui, com arquivo e linha.
 *
 * ---
 *
 * **A exceção mora no ponto da consulta, e não numa lista central.**
 *
 * Lista central com número de linha envelhece a cada edição, e lista central
 * com nome de função obriga a inventar nome para consulta anônima. O marcador
 * `conversa-de-evento: <motivo>` fica **dentro** da própria consulta, como
 * comentário — em JavaScript nas do Prisma, em `--` nas de SQL. Quem lê a
 * consulta lê o motivo, e quem move a consulta move o motivo com ela.
 *
 * As exceções são três, e todas deliberadas:
 *
 * - **o ciclo do Hot Topic não filtra.** Decisão do PO: encontro que gera
 *   conversa é movimento, que é o que o ciclo mede. A conversa do evento
 *   concorre ao destaque como qualquer tópico;
 * - **a moderação não filtra.** Denúncia feita num comentário de evento tem
 *   de chegar na fila, senão a área de comentários é um lugar sem lei;
 * - **a contagem de contribuições não filtra.** Comentário de evento é
 *   contribuição de verdade, e tirá-lo da conta faria o perfil de quem só
 *   comenta em encontros dizer zero.
 */

const RAIZ = resolve(process.cwd(), "lib/data");

/** Os métodos que **leem**. `create`, `update` e `delete` escrevem. */
const LEITURAS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "groupBy",
  "aggregate",
]);

const MARCADOR = /conversa-de-evento:\s*\S+/;
const FILTRO_PRISMA = /\beventId\b/;
const FILTRO_SQL = /\bevent_id\s+IS\s+NULL\b/i;
const SQL_EM_TOPICS = /\b(FROM|JOIN)\s+topics\b/i;

type Ponto = {
  arquivo: string;
  linha: number;
  tipo: "prisma" | "sql";
  texto: string;
};

function arquivosDeDados(): string[] {
  return readdirSync(RAIZ, { recursive: true, encoding: "utf8" })
    .filter((nome) => nome.endsWith(".ts"))
    .filter((nome) => !nome.includes(".test.") && !nome.includes("/testing/"))
    .map((nome) => join(RAIZ, nome));
}

/**
 * Cada leitura de `topics` do arquivo, achada pelo parser do TypeScript.
 *
 * Parser, e não expressão regular sobre o texto: o que delimita uma consulta
 * é a chamada ou o literal de template, e achar o fim de qualquer dos dois
 * contando parênteses à mão erra no primeiro `)` dentro de uma string.
 */
function leiturasDe(arquivo: string): Ponto[] {
  const codigo = readFileSync(arquivo, "utf8");
  const fonte = ts.createSourceFile(arquivo, codigo, ts.ScriptTarget.Latest, true);
  const achados: Ponto[] = [];

  function linhaDe(no: ts.Node) {
    return fonte.getLineAndCharacterOfPosition(no.getStart()).line + 1;
  }

  function visitar(no: ts.Node) {
    // `prisma.topic.findMany({ ... })`
    if (ts.isCallExpression(no) && ts.isPropertyAccessExpression(no.expression)) {
      const alvo = no.expression.expression;
      const metodo = no.expression.name.text;
      if (
        ts.isPropertyAccessExpression(alvo) &&
        alvo.name.text === "topic" &&
        LEITURAS.has(metodo)
      ) {
        achados.push({
          arquivo,
          linha: linhaDe(no),
          tipo: "prisma",
          texto: no.getFullText(fonte),
        });
      }
    }

    // SQL cru: o literal de template inteiro é a unidade.
    if (ts.isTemplateLiteral(no) || ts.isNoSubstitutionTemplateLiteral(no)) {
      const texto = no.getFullText(fonte);
      if (SQL_EM_TOPICS.test(texto)) {
        achados.push({ arquivo, linha: linhaDe(no), tipo: "sql", texto });
      }
    }

    ts.forEachChild(no, visitar);
  }

  visitar(fonte);
  return achados;
}

const pontos = arquivosDeDados().flatMap(leiturasDe);

function relativo(arquivo: string) {
  return arquivo.slice(resolve(process.cwd()).length + 1);
}

function semProteção(ponto: Ponto) {
  const filtro = ponto.tipo === "prisma" ? FILTRO_PRISMA : FILTRO_SQL;
  return !filtro.test(ponto.texto) && !MARCADOR.test(ponto.texto);
}

describe("RN38: a conversa do evento não vaza para as telas de tópico", () => {
  it("há leitura de topics para varrer — senão a varredura mede o nada", () => {
    // A barreira positiva. Sem ela, um erro no parser deixaria tudo verde.
    expect(pontos.filter((p) => p.tipo === "prisma").length).toBeGreaterThan(10);
    expect(pontos.filter((p) => p.tipo === "sql").length).toBeGreaterThan(5);
  });

  it("toda leitura de topics filtra a conversa, ou diz por escrito por que não", () => {
    const faltando = pontos.filter(semProteção);

    expect(
      faltando.map((p) => `${relativo(p.arquivo)}:${p.linha} (${p.tipo})`),
      [
        "Leitura de `topics` sem `eventId: null` / `event_id IS NULL` e sem motivo escrito.",
        "Ou acrescente o filtro, ou escreva no ponto da consulta:",
        "  // conversa-de-evento: <por que esta consulta inclui a conversa>",
        "  -- conversa-de-evento: <idem, dentro do SQL>",
      ].join("\n"),
    ).toEqual([]);
  });
});
