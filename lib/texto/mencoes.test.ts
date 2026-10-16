import { describe, expect, it } from "vitest";
import { acharMencoes, handlesMencionados, pedacosComMencoes } from "./mencoes";

/**
 * A detecção do @ (F15), nos mesmos casos difíceis que a detecção de links
 * tem para a RN16.
 *
 * A diferença entre acertar e errar aqui é alguém ser avisado sem motivo, ou
 * não ser avisado quando devia. Os dois corroem a confiança no aviso.
 */

describe("acha a marcação no meio do texto", () => {
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

describe("o que parece e não é", () => {
  it.each([
    ["fulano@exemplo.com", "email"],
    ["escreva para contato@hub.app", "email com domínio"],
    ["@a", "curto demais para ser @ válido"],
    ["@", "arroba sozinha"],
    ["@ lia", "arroba solta"],
    ["email: a@b.co", "email curto"],
  ])("%s não é marcação (%s)", (texto) => {
    expect(handlesMencionados(texto)).toEqual([]);
  });

  it("o hífen corta o @ onde ele termina de verdade", () => {
    // "@lia-souza" marca a Lia: o hífen não faz parte do formato do @.
    expect(handlesMencionados("@lia-souza")).toEqual(["lia"]);
  });

  it("passa de 20 caracteres: o @ não pode existir assim", () => {
    expect(handlesMencionados(`@${"a".repeat(21)}`)).toEqual([]);
  });

  it("devolve onde está, para a tela poder pintar", () => {
    const [mencao] = acharMencoes("oi @lia tudo bem");
    expect(mencao?.inicio).toBe(3);
    expect(mencao?.fim).toBe(7);
    expect(mencao?.trecho).toBe("@lia");
  });
});

describe("quebrar o texto para desenhar", () => {
  it("só vira link quem existe", () => {
    const pedacos = pedacosComMencoes("oi @lia e @ninguem", new Set(["lia"]));

    expect(pedacos).toEqual([
      { tipo: "texto", valor: "oi " },
      { tipo: "mencao", handle: "lia", trecho: "@lia" },
      // "@ninguem" fica como texto: link quebrado é pior que texto comum.
      { tipo: "texto", valor: " e @ninguem" },
    ]);
  });

  it("texto sem marcação volta inteiro", () => {
    expect(pedacosComMencoes("nada aqui", new Set())).toEqual([
      { tipo: "texto", valor: "nada aqui" },
    ]);
  });

  it("marcação no fim não deixa pedaço vazio", () => {
    expect(pedacosComMencoes("oi @lia", new Set(["lia"]))).toEqual([
      { tipo: "texto", valor: "oi " },
      { tipo: "mencao", handle: "lia", trecho: "@lia" },
    ]);
  });

  it("o texto original é preservado, letra por letra", () => {
    const original = "@LIA, olha isso aqui — @jo também";
    const pedacos = pedacosComMencoes(original, new Set(["lia", "jo"]));
    const remontado = pedacos.map((p) => (p.tipo === "texto" ? p.valor : p.trecho)).join("");

    // Desenhar não pode mudar o que a pessoa escreveu, nem a caixa do @.
    expect(remontado).toBe(original);
  });
});
