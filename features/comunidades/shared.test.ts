import { describe, expect, it } from "vitest";
import { abaDaComunidade, filtroDeTopicos, telaDaComunidade } from "./shared";

const UM_EVENTO = "3f2a9c1e-7b4d-4e8a-9f12-5c6d7e8f9a0b";

/**
 * **A precedência entre aba, tópico e evento.**
 *
 * É a parte que erraria calada: uma ordem trocada não quebra nada — não dá
 * erro, não dá 404, não deixa teste vermelho. Ela só mostra a tela errada, e
 * quem abriu acha que clicou no lugar errado.
 *
 * Por isso a decisão é função pura e tem teste próprio, em vez de viver
 * espalhada em ternários dentro do JSX da página.
 */
describe("o que a comunidade mostra no centro", () => {
  it("sem nada na busca, é o Início", () => {
    expect(telaDaComunidade({})).toEqual({ centro: "aba", aba: "inicio", topico: null });
  });

  it("a aba manda, quando não há evento", () => {
    expect(telaDaComunidade({ aba: "eventos" })).toEqual({
      centro: "aba",
      aba: "eventos",
      topico: null,
    });
  });

  it("o tópico abre no painel, com a aba Início por baixo", () => {
    expect(telaDaComunidade({ t: "primeiro-disco" })).toEqual({
      centro: "aba",
      aba: "inicio",
      topico: "primeiro-disco",
    });
  });

  it("o evento ocupa o centro", () => {
    expect(telaDaComunidade({ aba: "eventos", evento: UM_EVENTO })).toEqual({
      centro: "evento",
      aba: "eventos",
      evento: UM_EVENTO,
      topico: null,
    });
  });

  it("**o evento ganha do tópico**, e o painel não monta", () => {
    /*
     * Os dois juntos dariam duas conversas na tela — o "conteúdo espremido em
     * três faixas estreitas" que já foi tentado e revertido. E é porque o
     * painel não monta que a coluna da direita permanece ao lado do evento,
     * que é o ponto de o evento abrir no centro.
     */
    const tela = telaDaComunidade({ aba: "eventos", t: "primeiro-disco", evento: UM_EVENTO });

    expect(tela.centro).toBe("evento");
    expect(tela.topico, "o tópico sobreviveu: o painel vai montar junto do evento").toBeNull();
  });

  it("a aba continua acesa com o evento aberto", () => {
    // Senão a pílula certa apaga e voltar à lista deixa de ser um clique.
    expect(telaDaComunidade({ aba: "eventos", evento: UM_EVENTO }).aba).toBe("eventos");
  });

  it.each(["", "   ", "nao-e-uuid", "1", "3f2a9c1e-7b4d-4e8a-9f12", `${UM_EVENTO}x`])(
    "evento inválido (%s) cai na aba, sem derrubar a página",
    (lixo) => {
      const tela = telaDaComunidade({ aba: "eventos", evento: lixo });
      expect(tela.centro).toBe("aba");
    },
  );

  it("aba lixo cai no Início, inclusive com evento aberto", () => {
    expect(telaDaComunidade({ aba: "voando" }).aba).toBe("inicio");
    expect(telaDaComunidade({ aba: "voando", evento: UM_EVENTO }).aba).toBe("inicio");
  });

  it("tópico vazio é nenhum tópico", () => {
    // `?t=` sem valor viria como string vazia e abriria um painel de nada.
    expect(
      telaDaComunidade({ t: "" }).centro === "aba" && telaDaComunidade({ t: "" }),
    ).toMatchObject({ topico: null });
  });
});

describe("as outras leituras da URL continuam valendo", () => {
  it("abaDaComunidade aceita as quatro e recusa o resto", () => {
    expect(abaDaComunidade("membros")).toBe("membros");
    expect(abaDaComunidade("enquetes")).toBe("enquetes");
    expect(abaDaComunidade("eventos")).toBe("eventos");
    expect(abaDaComunidade("inicio")).toBe("inicio");
    expect(abaDaComunidade("qualquer")).toBe("inicio");
    expect(abaDaComunidade(undefined)).toBe("inicio");
  });

  it("filtroDeTopicos tem Em alta como padrão", () => {
    expect(filtroDeTopicos(undefined)).toBe("alta");
    expect(filtroDeTopicos("seguindo")).toBe("seguindo");
  });
});
