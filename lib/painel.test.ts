import { describe, expect, it } from "vitest";
import { LARGURA_MAXIMA_DO_PAINEL, larguraDoPainel } from "./painel";
import { COOKIE_DA_LARGURA, LARGURA_MINIMA } from "@/features/topicos/shared";
import { COOKIE_DO_POST, LARGURA_MINIMA_DO_POST } from "@/features/perfil/blog/shared";

/**
 * A largura que vem do cookie.
 *
 * Cookie é coisa que a pessoa edita no navegador, então **nada que vem
 * dele é confiável**. Estes testes são a lista do que já tentaram, e do que
 * é previsível tentarem.
 */

describe("o cookie da largura não é confiável", () => {
  it.each([
    ["vazio", undefined],
    ["texto", "larguinha"],
    ["vazio em branco", "   "],
    ["negativo", "-900"],
    ["nada", ""],
  ])("%s cai no mínimo", (_nome, valor) => {
    expect(larguraDoPainel(valor, 520)).toBe(520);
  });

  it("gigante cai no teto de sanidade", () => {
    expect(larguraDoPainel("999999", 520)).toBe(LARGURA_MAXIMA_DO_PAINEL);
  });

  it("número com vírgula decimal é arredondado", () => {
    expect(larguraDoPainel("640.7", 520)).toBe(641);
  });

  it("um valor legítimo passa inteiro", () => {
    expect(larguraDoPainel("780", 520)).toBe(780);
  });
});

describe("cada painel tem o mínimo e o cookie dele", () => {
  /**
   * **Dois cookies, de propósito.** O painel do tópico e o do post são
   * conversas diferentes: uma largura escolhida lendo um tópico não é uma
   * escolha sobre ler um post. Um cookie só faria a última escolha mandar
   * nos dois.
   */
  it("o tópico e o post não dividem cookie", () => {
    expect(COOKIE_DA_LARGURA).not.toBe(COOKIE_DO_POST);
  });

  it("o mínimo de cada um é respeitado", () => {
    expect(larguraDoPainel("10", LARGURA_MINIMA)).toBe(LARGURA_MINIMA);
    expect(larguraDoPainel("10", LARGURA_MINIMA_DO_POST)).toBe(LARGURA_MINIMA_DO_POST);
  });

  /**
   * O cookie do tópico **não pode** mudar de nome: quem já escolheu uma
   * largura perderia a escolha, em silêncio, na primeira visita depois do
   * deploy. Ele atravessou a mudança de 12 de novembro de 2026 intacto.
   */
  it("o cookie do tópico mantém o nome de sempre", () => {
    expect(COOKIE_DA_LARGURA).toBe("hub_largura_do_topico");
  });
});
