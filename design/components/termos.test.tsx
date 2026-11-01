import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnswerCard, HotTopicCard, TopicCard, TopicOpening, TopicRow } from "./index";

/**
 * "Contribuição" tem um sentido só, e a tela não diz "resposta".
 *
 * RN28: contribuição é resposta **ou** tópico criado. A rodada de acabamento
 * (PR 7 do protótipo v6) trocou a palavra na tela inteira — e deixou três
 * lugares atrás: o cartão do Hot Topic, a abertura do tópico e a contagem do
 * Início. Os dois primeiros são os cartões escuros, os mais visíveis da tela
 * da comunidade. O PO achou olhando; eu não achei varrendo.
 *
 * **Por que varrendo não achei:** a varredura foi por busca de texto nos
 * arquivos que eu julguei serem de tela, e eu olhei `features/` com mais
 * atenção que `design/components/`. Busca de texto depende de eu acertar
 * onde buscar.
 *
 * Este teste não busca: ele **desenha** cada componente de conteúdo e lê a
 * saída. Componente novo que diga "resposta" reprova aqui sem ninguém
 * precisar lembrar de buscar.
 *
 * O verbo foi junto: o botão diz "Contribuir", não "Responder". O campo se
 * chama "Sua contribuição" e o menu dele "Apagar contribuição" — um verbo
 * diferente do substantivo faria a pessoa procurar duas ações.
 */
describe("a tela não diz resposta", () => {
  const casos: [string, React.ReactElement][] = [
    [
      "cartão do Hot Topic",
      <HotTopicCard
        topic="Tópico em alta"
        opening="Qual foi a primeira foto que te orgulhou?"
        people={12}
        answers={34}
        href="/c/x/y"
      />,
    ],
    [
      "cartão do Hot Topic com uma só",
      <HotTopicCard topic="t" opening="o" people={1} answers={1} href="/c/x/y" />,
    ],
    [
      "abertura do tópico",
      <TopicOpening autor="Lia" abertura="Como foi?" pessoas={86} respostas={112} />,
    ],
    ["abertura com uma só", <TopicOpening abertura="Como foi?" pessoas={1} respostas={1} />],
    ["linha de tópico", <TopicRow name="Primeira festa" people={4} answers={9} when="há 2 h" />],
    ["linha de tópico com uma só", <TopicRow name="Primeira festa" people={1} answers={1} />],
    ["cartão de tópico", <TopicCard name="Primeira festa" people={4} answers={9} />],
    [
      "cartão de tópico com a última contribuição",
      <TopicCard
        name="Primeira festa"
        people={4}
        answers={9}
        when="há 2 h"
        novas={2}
        ultima={{
          autorNome: "Lia",
          autorHandle: "lia",
          texto: "Foi inesquecível.",
          avatarUrl: null,
        }}
      />,
    ],
    [
      "contribuição",
      <AnswerCard author="Lia" handle="lia" when="há 2 h">
        Texto da contribuição.
      </AnswerCard>,
    ],
  ];

  it.each(casos)("%s", (_nome, elemento) => {
    const html = renderToStaticMarkup(elemento);

    /*
     * Procura a palavra isolada, e não o trecho: "respostas" dentro de
     * "corresponde" não é o erro, e um dia alguém escreve isso.
     */
    expect(html, `desenhou: ${html}`).not.toMatch(/\bresposta(s)?\b/i);
    expect(html, `desenhou: ${html}`).not.toMatch(/\bresponder\b/i);
  });
});
