import { describe, expect, it } from "vitest";
import { quemEnviou } from "./conversa";

/**
 * Quem enviou a mensagem que chegou pelo tempo real.
 *
 * O Realtime entrega a linha crua de `messages`: id, texto, `author_id` e o
 * tipo de mídia. **Nome não existe nessa tabela.** Sem resolver o id, toda
 * mensagem que chega ao vivo aparecia como "Pessoa que saiu do Hub", até o
 * servidor mandar a lista resolvida — um piscar numa rede local, um nome
 * parado na tela com o servidor em São Paulo.
 */

const lia = { id: "lia-1", nome: "Lia", handle: "lia", avatarUrl: "assinado/lia.webp" };
const jo = { id: "jo-2", nome: "Jo", handle: "jo", avatarUrl: null };

describe("quemEnviou", () => {
  it("acha quem está na conversa, com nome, @ e foto", () => {
    expect(quemEnviou([lia, jo], "lia-1")).toEqual({
      nome: "Lia",
      handle: "lia",
      avatarUrl: "assinado/lia.webp",
    });
  });

  it("quem não tem foto vem com foto nula, não com a de outra pessoa", () => {
    expect(quemEnviou([lia, jo], "jo-2")?.avatarUrl).toBe(null);
  });

  /**
   * O caso de borda que **não pode virar nome errado**: alguém acrescentado
   * ao grupo depois de a tela abrir não está nesta lista. A tela devolve
   * `null` e pede a revalidação ao servidor, em vez de escolher um nome.
   */
  it("não inventa nome para quem não está na lista", () => {
    expect(quemEnviou([lia, jo], "alguem-novo")).toBe(null);
  });

  it("mensagem de conta apagada continua sem autor", () => {
    expect(quemEnviou([lia, jo], null)).toBe(null);
  });

  /**
   * Casar por id, nunca por posição: a ordem da lista de participantes não é
   * promessa de ninguém, e trocar os dois mostraria uma conversa em que cada
   * pessoa fala pela boca da outra.
   */
  it("casa pelo id, e a ordem da lista não importa", () => {
    expect(quemEnviou([jo, lia], "lia-1")?.nome).toBe("Lia");
    expect(quemEnviou([lia, jo], "jo-2")?.nome).toBe("Jo");
  });
});
