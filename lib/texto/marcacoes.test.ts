import { describe, expect, it } from "vitest";
import {
  acharMarcacoes,
  alvosMarcados,
  handlesMencionados,
  pedacosMarcados,
  type MarcacoesExistentes,
} from "./marcacoes";

/**
 * A detecção de `@`, `#` e `*`, nos mesmos casos difíceis que a detecção de
 * links tem para a RN16.
 *
 * A diferença entre acertar e errar aqui é alguém ser avisado sem motivo, ou
 * não ser avisado quando devia — e, nos sinais novos, um link que leva para
 * o lugar errado. Os três corroem a confiança no que está escrito.
 */

/** Atalho: ninguém existe, a não ser quem o teste disser. */
function existem(partes: Partial<MarcacoesExistentes> = {}): MarcacoesExistentes {
  return {
    pessoas: partes.pessoas ?? new Set(),
    comunidades: partes.comunidades ?? new Set(),
    topicos: partes.topicos ?? new Set(),
  };
}

describe("@: acha a pessoa no meio do texto", () => {
  it.each([
    ["@lia", "lia"],
    ["oi @lia", "lia"],
    ["@lia, tudo bem?", "lia"],
    ["(@lia)", "lia"],
    ["olha isso @lia!", "lia"],
    ["@lia_souza manda ver", "lia_souza"],
    ["@lia2 chegou", "lia2"],
    ["acho que é com a @lia mesmo.", "lia"],
    ["café com @lia amanhã", "lia"],
    ["@LIA grita", "lia"],
  ])("%s → @%s", (texto, esperado) => {
    expect(handlesMencionados(texto)).toEqual([esperado]);
  });

  it("acento colado não atrapalha", () => {
    expect(handlesMencionados("você viu, @lia? é ótimo")).toEqual(["lia"]);
  });

  it("várias marcações vêm na ordem", () => {
    expect(handlesMencionados("@lia e @jo e @rafa")).toEqual(["lia", "jo", "rafa"]);
  });

  it("a mesma pessoa duas vezes é um aviso só", () => {
    // Escrever duas vezes é ênfase, não dois avisos. E quem recebe dois
    // avisos iguais aprende a ignorar os dois.
    expect(handlesMencionados("@lia, olha @lia")).toEqual(["lia"]);
  });
});

describe("#: acha a comunidade", () => {
  it.each([
    ["#musica-eletronica", "musica-eletronica"],
    ["vem para a #ceramica", "ceramica"],
    ["#ceramica, lá tem disso", "ceramica"],
    ["(#ceramica)", "ceramica"],
    ["#CERAMICA grita", "ceramica"],
  ])("%s → #%s", (texto, esperado) => {
    expect(alvosMarcados(texto).comunidades).toEqual([esperado]);
  });

  it("o hífen faz parte do endereço da comunidade", () => {
    // Diferente do @: `#musica-eletronica` é um endereço só, e cortar no
    // hífen levaria para uma comunidade que não existe.
    expect(alvosMarcados("olha a #musica-eletronica").comunidades).toEqual(["musica-eletronica"]);
  });

  it("hífen no fim não entra", () => {
    expect(alvosMarcados("#ceramica- e tal").comunidades).toEqual(["ceramica"]);
  });
});

describe("*: acha o tópico", () => {
  it.each([
    ["*primeira-festa", "primeira-festa"],
    ["isso é tipo *primeira-festa", "primeira-festa"],
    ["*primeira-festa!", "primeira-festa"],
  ])("%s → *%s", (texto, esperado) => {
    expect(alvosMarcados(texto).topicos).toEqual([esperado]);
  });

  it("asterisco de ênfase não vira tópico se o tópico não existir", () => {
    // `*importante*` é escrita comum. Ele é **achado** aqui, e some na hora
    // de desenhar, porque nenhum tópico tem esse endereço.
    const pedacos = pedacosMarcados("isso é *importante* mesmo", existem());
    expect(pedacos).toEqual([{ tipo: "texto", valor: "isso é *importante* mesmo" }]);
  });

  it("lista com asterisco e espaço não é marcação", () => {
    expect(alvosMarcados("* comprar pão\n* ir na aula").topicos).toEqual([]);
  });
});

describe("o que parece e não é", () => {
  it.each([
    ["fulano@exemplo.com", "email"],
    ["escreva para contato@hub.app", "email com domínio"],
    ["@a", "curto demais para ser @ válido"],
    ["@", "arroba sozinha"],
    ["@ lia", "arroba solta"],
    ["email: a@b.co", "email curto"],
  ])("%s não é marcação de pessoa (%s)", (texto) => {
    expect(handlesMencionados(texto)).toEqual([]);
  });

  it.each([
    ["nota#1", "sinal colado em palavra"],
    ["#a", "curto demais"],
    ["# ceramica", "sinal solto"],
  ])("%s não é marcação de comunidade (%s)", (texto) => {
    expect(alvosMarcados(texto).comunidades).toEqual([]);
  });

  it("o hífen corta o @ onde ele termina de verdade", () => {
    // "@lia-souza" marca a Lia: o hífen não faz parte do formato do @.
    expect(handlesMencionados("@lia-souza")).toEqual(["lia"]);
  });

  it("passa de 20 caracteres: o @ não pode existir assim", () => {
    expect(handlesMencionados(`@${"a".repeat(21)}`)).toEqual([]);
  });

  it("devolve onde está, para a tela poder pintar", () => {
    const [mencao] = acharMarcacoes("oi @lia tudo bem");
    expect(mencao?.inicio).toBe(3);
    expect(mencao?.fim).toBe(7);
    expect(mencao?.trecho).toBe("@lia");
  });

  it("os três sinais na mesma frase vêm na ordem do texto", () => {
    const achadas = acharMarcacoes("@lia vem pra #ceramica ver *forno-a-lenha");
    expect(achadas.map((m) => m.tipo)).toEqual(["pessoa", "comunidade", "topico"]);
    expect(achadas.map((m) => m.alvo)).toEqual(["lia", "ceramica", "forno-a-lenha"]);
  });
});

describe("quebrar o texto para desenhar", () => {
  it("só vira link quem existe", () => {
    const pedacos = pedacosMarcados("oi @lia e @ninguem", existem({ pessoas: new Set(["lia"]) }));

    expect(pedacos).toEqual([
      { tipo: "texto", valor: "oi " },
      { tipo: "marcacao", marcacao: "pessoa", alvo: "lia", trecho: "@lia" },
      // "@ninguem" fica como texto: link quebrado é pior que texto comum.
      { tipo: "texto", valor: " e @ninguem" },
    ]);
  });

  it("comunidade que não existe fica texto", () => {
    const pedacos = pedacosMarcados("vem pra #inexistente", existem());
    expect(pedacos).toEqual([{ tipo: "texto", valor: "vem pra #inexistente" }]);
  });

  it("tópico de outra comunidade fica texto", () => {
    // O `*` alcança só a comunidade desta resposta. Quem resolve a lista de
    // existentes é o servidor, e o tópico de fora simplesmente não entra.
    const pedacos = pedacosMarcados("olha *topico-de-fora", existem({ topicos: new Set() }));
    expect(pedacos).toEqual([{ tipo: "texto", valor: "olha *topico-de-fora" }]);
  });

  it("os três tipos juntos viram três links", () => {
    const pedacos = pedacosMarcados(
      "@lia na #ceramica no *forno-a-lenha",
      existem({
        pessoas: new Set(["lia"]),
        comunidades: new Set(["ceramica"]),
        topicos: new Set(["forno-a-lenha"]),
      }),
    );

    expect(pedacos.filter((p) => p.tipo === "marcacao")).toHaveLength(3);
  });

  it("texto sem marcação volta inteiro", () => {
    expect(pedacosMarcados("nada aqui", existem())).toEqual([
      { tipo: "texto", valor: "nada aqui" },
    ]);
  });

  it("marcação no fim não deixa pedaço vazio", () => {
    expect(pedacosMarcados("oi @lia", existem({ pessoas: new Set(["lia"]) }))).toEqual([
      { tipo: "texto", valor: "oi " },
      { tipo: "marcacao", marcacao: "pessoa", alvo: "lia", trecho: "@lia" },
    ]);
  });

  it("o texto original é preservado, letra por letra", () => {
    const original = "@LIA, olha isso aqui — @jo também, na #CERAMICA";
    const pedacos = pedacosMarcados(
      original,
      existem({ pessoas: new Set(["lia", "jo"]), comunidades: new Set(["ceramica"]) }),
    );
    const remontado = pedacos.map((p) => (p.tipo === "texto" ? p.valor : p.trecho)).join("");

    // Desenhar não pode mudar o que a pessoa escreveu, nem a caixa do sinal.
    expect(remontado).toBe(original);
  });
});
