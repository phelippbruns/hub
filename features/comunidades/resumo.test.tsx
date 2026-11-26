import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResumoDaComunidade } from "./resumo";
import type { PaginaDaComunidade } from "@/lib/data/comunidades";
import type { EventoNaTela } from "@/lib/data/eventos";

/**
 * **O espaço reservado da coluna não afirma nada.**
 *
 * A coluna da direita pede o próximo evento e a enquete aberta, e essas duas
 * consultas ficam num `<Suspense>` para não atrasar o conteúdo da aba. O que
 * o `<Suspense>` desenha enquanto espera é **este mesmo componente**, sem os
 * dois dados — e o padrão dos dois era `null`, que quer dizer "já perguntei e
 * não há".
 *
 * O resultado: quem modera via "PRÓXIMO EVENTO · Nenhum evento marcado" e, um
 * instante depois, o encontro de verdade no lugar. Um texto errado piscando
 * na tela, e dois blocos "PRÓXIMO EVENTO" no HTML ao mesmo tempo.
 *
 * **Isso não dá jornada confiável** — a janela é a latência da consulta, e
 * contá-la passa ou reprova por sorte de temporização (o Faustão tem o caso
 * do piscar medido na Cabine). O que dá teste é a **distinção**: `undefined`
 * é "não sei ainda", `null` é "não há". Se alguém devolver o `= null` ao
 * parâmetro, estes dois testes reprovam.
 */

const COMUNIDADE: PaginaDaComunidade = {
  id: "c1",
  slug: "animacao",
  name: "Animação",
  intro: "Quem desenha quadro a quadro.",
  about: "",
  regras: [],
  coverUrl: null,
  medidasDaCapa: null,
  zoomDaCapa: 1,
  ancoraDaCapa: { x: 0.5, y: 0.5 },
  membersCount: 12,
  topicosCount: 3,
  contribuicoesCount: 40,
  contribuicoesHoje: 0,
  primeirosMembros: [],
  criadaEm: new Date("2026-01-10T12:00:00Z"),
  criadaPor: null,
  universo: { id: "u1", name: "Hubverso", slug: "hubverso" },
  souMembro: true,
  souModerador: true,
  estouBanida: false,
  moderadores: [],
};

const ENCONTRO: EventoNaTela = {
  id: "e1",
  titulo: "Crítica de portfólio",
  descricao: "Cada pessoa mostra até 2 minutos.",
  formato: "online",
  comeca: new Date("2026-12-01T19:00:00Z"),
  local: "",
  anfitriao: { name: "Lia", handle: "lia" },
  confirmados: 2,
  vagas: null,
  passou: false,
  euVou: false,
  lotado: false,
  linkDoEncontro: null,
  primeiros: [],
  comentarios: 0,
};

describe("a coluna da comunidade enquanto a consulta não volta", () => {
  it("sem saber ainda, o bloco do evento não existe", () => {
    // É o que o `<Suspense>` desenha: nenhum dos dois dados foi passado.
    const html = renderToStaticMarkup(<ResumoDaComunidade comunidade={COMUNIDADE} />);

    expect(html, "o espaço reservado afirmou que não há evento").not.toContain("PRÓXIMO EVENTO");
    expect(html).not.toContain("Nenhum evento marcado");
    // A barreira positiva: a coluna existe, só não fala do que não sabe.
    expect(html, "a coluna inteira desapareceu").toContain("MEMBROS");
  });

  it("sabendo que não há, quem modera vê o vazio com o atalho de criar", () => {
    const html = renderToStaticMarkup(
      <ResumoDaComunidade comunidade={COMUNIDADE} proximoEvento={null} />,
    );

    expect(html).toContain("PRÓXIMO EVENTO");
    expect(html).toContain("Nenhum evento marcado");
  });

  it("e com encontro marcado, o encontro", () => {
    const html = renderToStaticMarkup(
      <ResumoDaComunidade comunidade={COMUNIDADE} proximoEvento={ENCONTRO} />,
    );

    expect(html).toContain("PRÓXIMO EVENTO");
    expect(html).toContain("Crítica de portfólio");
    expect(html).not.toContain("Nenhum evento marcado");
  });

  it("quem não modera não vê o bloco vazio: anunciar o vazio a quem não pode preenchê-lo é moldura", () => {
    const html = renderToStaticMarkup(
      <ResumoDaComunidade
        comunidade={{ ...COMUNIDADE, souModerador: false }}
        proximoEvento={null}
      />,
    );

    expect(html).not.toContain("PRÓXIMO EVENTO");
  });
});
