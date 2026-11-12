import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ActivityRow,
  AnswerCard,
  Avatar,
  BottomSheet,
  Button,
  Checkbox,
  Chip,
  CommunityCover,
  CommunityDoor,
  CommunityRow,
  ConfirmSheet,
  EmptyState,
  EndOfList,
  ErrorState,
  FollowButton,
  RoundIconButton,
  ControleDeslizante,
  HomeRow,
  HotTopicCard,
  LevelMark,
  MidiaDaContribuicao,
  PinButton,
  ProfileHeader,
  SectionTitle,
  Segmented,
  Skeleton,
  SuccessMessage,
  SuggestionRow,
  Switch,
  SwitchRow,
  Tabs,
  TextField,
  TopicName,
  Select,
  StarButton,
  TopicOpening,
  PostRow,
  TopicCard,
  TopicRow,
} from "./index";

/**
 * Snapshot de cada componente base. Serve para a mudança visual aparecer na
 * revisão: se o HTML mudou sem querer, o diff mostra.
 */
const cases: Array<[string, React.ReactElement]> = [
  ["botão primário", <Button>Responder</Button>],
  ["botão secundário", <Button variant="secondary">Cancelar</Button>],
  ["botão de destaque", <Button variant="highlight">Responder</Button>],
  [
    "botão desativado com explicação",
    <Button disabled disabledHint="Escolha ao menos 3 comunidades.">
      Continuar
    </Button>,
  ],
  ["chip não selecionado", <Chip label="Cinema" />],
  ["chip selecionado", <Chip label="Música" selected />],
  ["campo de texto com contador", <TextField label="Sua resposta" maxLength={240} />],
  ["marca de Universo", <LevelMark level="universe" />],
  ["marca de comunidade", <LevelMark level="community" />],
  ["marca de tópico", <LevelMark level="topic" />],
  ["porta da comunidade, visitante", <CommunityDoor member={false} />],
  ["porta da comunidade, membro", <CommunityDoor member />],
  [
    "cartão de Hot Topic",
    <HotTopicCard
      topic="primeira festa"
      opening="Como foi a primeira festa que te fez gostar de música eletrônica?"
      people={42}
      answers={87}
    />,
  ],
  [
    "cartão de Hot Topic com a última contribuição e as caras",
    <HotTopicCard
      topic="primeira festa"
      opening="Como foi a primeira festa que te fez gostar de música eletrônica?"
      people={42}
      answers={87}
      autor="Caio Mendes"
      ultima={{
        texto: "Um set de 6 horas num galpão. Saí de lá sabendo que era isso.",
        autorNome: "Lia Souza",
        autorHandle: "liasouza",
        autorAvatarUrl: null,
        quando: "há 2 h",
      }}
      rostos={[
        { nome: "Lia Souza", avatarUrl: null },
        { nome: "Caio Mendes", avatarUrl: null },
        { nome: "Ana Lima", avatarUrl: null },
      ]}
    />,
  ],
  [
    "cartão de contribuição",
    <AnswerCard author="Lia Souza" handle="liasouza" when="há 2 h">
      Um set de 6 horas num galpão.
    </AnswerCard>,
  ],
  [
    "cartão de contribuição, a minha",
    <AnswerCard author="Lia Souza" handle="liasouza" when="há 2 h" minha>
      Um set de 6 horas num galpão.
    </AnswerCard>,
  ],
  [
    "cartão de contribuição, nova desde a última visita",
    <AnswerCard author="Lia Souza" handle="liasouza" when="há 2 h" nova>
      Um set de 6 horas num galpão.
    </AnswerCard>,
  ],
  [
    "linha de comunidade",
    <CommunityRow name="Música Eletrônica" members={1240} activeTopics={8} />,
  ],
  ["linha de tópico", <TopicRow name="primeira festa" people={42} answers={87} />],
  [
    "abas",
    <Tabs
      label="Seções do perfil"
      activeId="respostas"
      tabs={[
        { id: "respostas", label: "Respostas" },
        { id: "comunidades", label: "Comunidades" },
      ]}
    />,
  ],
  [
    "folha inferior",
    <BottomSheet title="Ordenar tópicos" open>
      <p>conteúdo</p>
    </BottomSheet>,
  ],
  ["caixa de seleção marcada", <Checkbox checked label="Li e aceito os Termos de uso" />],
  ["interruptor ligado", <Switch checked label="Avisar sobre destaque" />],
  ["interruptor desligado", <Switch checked={false} label="Avisar sobre destaque" />],
  ["carregando", <Skeleton className="h-avatarLg w-full" />],
  [
    "erro com tentar de novo",
    <ErrorState message="Não foi possível carregar os tópicos." onRetry={() => undefined} />,
  ],
  ["sucesso", <SuccessMessage>Tópico criado em Música Eletrônica</SuccessMessage>],
  ["vazio", <EmptyState title="Nenhum tópico ainda" description="Crie o primeiro." />],
  ["fim da lista", <EndOfList />],
  // F06: descoberta.
  [
    "filtro segmentado",
    <Segmented
      label="Filtrar resultados"
      atual="comunidades"
      onSelect={() => undefined}
      opcoes={[
        { id: "tudo", label: "Tudo" },
        { id: "comunidades", label: "Comunidades" },
      ]}
    />,
  ],
  ["seguir, desligado", <FollowButton seguindo={false} oQue="Lia Souza" />],
  ["seguir, ligado", <FollowButton seguindo oQue="Lia Souza" />],
  /*
    No cartão escuro do tópico: contorno branco sem seguir, e **círculo
    cheio em sun com o desenho em ink** seguindo. O estado não depende só
    da cor — `aria-pressed` e o rótulo mudam junto.
  */
  ["seguir no escuro, desligado", <FollowButton seguindo={false} tom="escuro" oQue="o tópico" />],
  ["seguir no escuro, ligado", <FollowButton seguindo tom="escuro" oQue="o tópico" />],
  ["botão redondo de 44 px", <RoundIconButton label="Compartilhar">{"·"}</RoundIconButton>],
  /* 36 px: a caixa de contribuição e a pílula de ordenar, desde 5/11. */
  [
    "botão redondo de 36 px",
    <RoundIconButton label="Adicionar imagem" tamanho="sm">
      {"·"}
    </RoundIconButton>,
  ],
  /*
    Sem círculo: os três pontos da contribuição, desde 7/11. O círculo
    pedia atenção que o controle não merece — ele é o terceiro item de um
    cartão cujo assunto é o texto de outra pessoa.
  */
  [
    "botão redondo sem círculo",
    <RoundIconButton label="Opções" tamanho="sm" nu>
      {"·"}
    </RoundIconButton>,
  ],
  /*
    O primeiro deslizante do design system (PR H). O snapshot guarda o
    desenho; o teste de acessibilidade abaixo guarda o que importa mais —
    que o `−` e o `+` digam de que controle são.
  */
  [
    "controle deslizante",
    <ControleDeslizante
      rotulo="Aproximação"
      valor={1.6}
      minimo={1}
      maximo={3}
      onMudar={() => {}}
    />,
  ],
  ["título de seção", <SectionTitle>Universos</SectionTitle>],
  // O # numa lista diz qual comunidade, não só "a comunidade".
  ["porta da comunidade, com nome", <CommunityDoor member={false} oQue="Vinil" />],
  // F07: comunidades.
  [
    "capa da comunidade",
    <CommunityCover name="Música Eletrônica" coverUrl={null}>
      <CommunityDoor member oQue="Música Eletrônica" />
    </CommunityCover>,
  ],
  ["fixar, desligado", <PinButton fixada={false} oQue="Vinil" />],
  ["fixar, ligado", <PinButton fixada oQue="Vinil" />],
  ["botão destrutivo", <Button variant="danger">Sair da comunidade</Button>],
  // F08: tópicos.
  ["nome de tópico", <TopicName>primeira festa</TopicName>],
  // F12: perfil.
  [
    "topo do perfil, de outra pessoa",
    <ProfileHeader
      nome="Lia Souza"
      handle="liasouza"
      bio="Vinil, serras e pista desde 2010."
      avatarUrl={null}
      seguidores={214}
      contribuicoes={86}
      comunidades={5}
      links={[{ title: "Instagram", url: "https://instagram.com/lia" }]}
    />,
  ],
  [
    "topo do perfil, próprio",
    <ProfileHeader
      nome="Ana Lima"
      handle="analima"
      bio={null}
      avatarUrl={null}
      seguidores={128}
      seguidoresHref="/perfil/seguidores"
      seguindo={<span>45 seguindo</span>}
      contribuicoes={1}
      comunidades={1}
    />,
  ],
  [
    // RN27: escondeu os seguidores, então o número não chega nem ao HTML.
    "topo do perfil, com seguidores escondidos",
    <ProfileHeader
      nome="Ana Lima"
      handle="analima"
      bio={null}
      avatarUrl={null}
      seguidores={null}
      contribuicoes={12}
      comunidades={18}
    />,
  ],
  ["foto de perfil, sem foto", <Avatar nome="Lia Souza" tamanho="perfil" />],
  [
    // O nome tem de aparecer **na tela**, não só no `aria-label`: antes a
    // pessoa lia a explicação sem saber o que ela ligava.
    "linha de ajuste, ligada",
    <SwitchRow nome="Cabine" descricao="Convites para conversar e mensagens novas." checked />,
  ],
  [
    "linha de ajuste, desligada",
    <SwitchRow
      nome="Novos tópicos nas comunidades"
      descricao="Desligado por padrão: uma comunidade ativa abre vários por dia."
      checked={false}
    />,
  ],
  ["foto de perfil, nome de uma palavra só", <Avatar nome="Jo" />],
  // F11: as linhas do Início.
  [
    "linha do Início, com novas",
    <HomeRow
      nome="filmes que ninguém viu"
      href="/c/terror/filmes"
      detalhe="Terror. 19 pessoas, 27 respostas"
      destaque="3 novas"
    />,
  ],
  [
    "linha do Início, sem destaque",
    <HomeRow nome="serra" href="/c/paisagem/serra" detalhe="Fotografia. 12 pessoas" />,
  ],
  [
    "o que quem você segue fez",
    <ActivityRow
      handle="liasouza"
      oQueFez="respondeu"
      topico="primeira festa"
      href="/c/musica/primeira-festa"
      comunidade="Música Eletrônica"
      quando="há 20 min"
    />,
  ],
  [
    "comunidade sugerida",
    <SuggestionRow nome="Vinil" universo="Música" membros={2100} href="/c/vinil" />,
  ],
  [
    "mídia da contribuição",
    <MidiaDaContribuicao
      url="https://media.giphy.com/abc.gif"
      parado="https://media.giphy.com/abc-parado.gif"
      tipo="gif"
      autor="Lia"
      medidas={{ largura: 200, altura: 150 }}
    />,
  ],
  [
    "select de comunidade",
    <Select
      label="Comunidade"
      opcoes={[
        { valor: "vinil", rotulo: "Vinil" },
        { valor: "fotografia", rotulo: "Fotografia" },
      ]}
    />,
  ],
  ["select com erro", <Select label="Comunidade" error="Escolha uma comunidade." opcoes={[]} />],
  ["estrela sem nenhuma", <StarButton estrelada={false} total={0} />],
  ["estrela de outras pessoas", <StarButton estrelada={false} total={7} />],
  ["estrela com a minha", <StarButton estrelada total={8} />],
  [
    "abertura do tópico",
    <TopicOpening
      nome="Primeira festa"
      autor={{ nome: "Caio Mendes" }}
      abertura="Como foi a primeira festa que te fez gostar de música eletrônica?"
      pessoas={86}
      respostas={112}
    />,
  ],
  [
    "abertura sem autor, com uma contribuição só",
    <TopicOpening abertura="Qual pista você quer conhecer?" pessoas={1} respostas={1} />,
  ],
];

describe("snapshot dos componentes", () => {
  it.each(cases)("%s", (_nome, element) => {
    expect(renderToStaticMarkup(element)).toMatchSnapshot();
  });
});

describe("acessibilidade dos controles sem texto", () => {
  it("a porta da comunidade diz o que faz e em que estado está", () => {
    const html = renderToStaticMarkup(<CommunityDoor member />);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("aria-label=");
  });

  it("o interruptor expõe estado em aria-checked, não só na cor", () => {
    expect(renderToStaticMarkup(<Switch checked label="x" />)).toContain('aria-checked="true"');
    expect(renderToStaticMarkup(<Switch checked={false} label="x" />)).toContain(
      'aria-checked="false"',
    );
  });

  it("o chip selecionado traz o ✓ além da cor", () => {
    // Lavender contra surfacePage tem 2,1:1: a cor não pode ser o sinal único.
    expect(renderToStaticMarkup(<Chip label="Música" selected />)).toContain("✓");
  });

  it("o botão desativado explica o que falta", () => {
    const html = renderToStaticMarkup(
      <Button disabled disabledHint="Preencha nome, intro, capa e Universo.">
        Criar comunidade
      </Button>,
    );
    expect(html).toContain("Preencha nome, intro, capa e Universo.");
  });
});

/**
 * Texto de gente quebra linha.
 *
 * O PO mandou um print do cartão Sobre com uma sequência longa sem espaço
 * atravessando o cartão e saindo pela direita. O navegador não quebra linha
 * no meio de uma palavra sem ser mandado, e `@` de rede social, link colado
 * e teclado travado produzem "palavras" de duzentos caracteres todo dia.
 *
 * A barreira olha o HTML desenhado: todo componente que mostra texto escrito
 * por alguém tem de levar `wrap-anywhere` no elemento desse texto. Procurar
 * a classe no código-fonte não serviria — ela precisa estar **no elemento
 * certo**, e um `truncate` no lugar dela também resolve, porque corta em vez
 * de furar.
 */
describe("texto de gente nunca fura o cartão", () => {
  const PALAVRA = "A".repeat(220);

  const casos: [string, React.ReactElement][] = [
    ["abertura do tópico", <TopicOpening abertura={PALAVRA} pessoas={2} respostas={3} />],
    [
      "contribuição",
      <AnswerCard author="Lia" handle="lia" when="há 2 h">
        {PALAVRA}
      </AnswerCard>,
    ],
    ["autor da contribuição", <AnswerCard author={PALAVRA} handle="lia" when="há 2 h" />],
    [
      "destaque do dia",
      <HotTopicCard topic="Tópico" opening={PALAVRA} people={4} answers={9} href="/c/x/y" />,
    ],
    ["nome da comunidade na capa", <CommunityCover name={PALAVRA} coverUrl={null} />],
    ["nome do tópico na linha", <TopicRow name={PALAVRA} people={1} answers={1} />],
    [
      "título do post no blog",
      <PostRow titulo={PALAVRA} resumo="curto" minutos={2} quando="há 2 dias" />,
    ],
    [
      "resumo do post no blog",
      <PostRow titulo="Post" resumo={PALAVRA} minutos={2} quando="há 2 dias" />,
    ],
  ];

  it.each(casos)("%s", (_nome, elemento) => {
    const html = renderToStaticMarkup(elemento);

    /*
     * `overflow-wrap` e `text-overflow` são herdados, então a classe vale
     * em qualquer elemento **que contenha** o texto — não só no mais
     * próximo. Por isso a conferência monta a pilha de tags abertas até o
     * ponto onde o texto aparece e olha todas elas: olhar só a tag mais
     * próxima reprovava o `TopicRow`, onde o asterisco em SVG vem antes do
     * nome dentro do mesmo `<span className="truncate">`.
     */
    const antes = html.slice(0, html.indexOf(PALAVRA));
    const pilha: string[] = [];
    for (const [tag] of antes.matchAll(/<\/?[a-zA-Z][^>]*>/g)) {
      if (tag.startsWith("</")) pilha.pop();
      else if (!tag.endsWith("/>")) pilha.push(tag);
    }

    expect(pilha.join(" "), `as tags que envolvem o texto são: ${pilha.join(" ")}`).toMatch(
      /wrap-anywhere|truncate/,
    );
  });
});

/**
 * A `Janela` — e tudo que a usa, como o `ConfirmSheet` — é desenhada por
 * **portal** no `body` desde 7 de novembro de 2026, para não ficar presa
 * abaixo da barra lateral.
 *
 * Portal precisa de `document`, e estes testes rodam em Node com
 * `renderToStaticMarkup`. O snapshot dela virava `"<div></div>"` — uma
 * linha que passa para sempre e não guarda nada. Saiu, e no lugar fica
 * esta afirmação, que é a verdade verificável aqui: **no servidor, o
 * diálogo não existe**.
 *
 * O conteúdo dele é coberto por jornada, onde há navegador de verdade:
 * "o autor apaga, com confirmação que diz quantas respostas somem"
 * (`e2e/topicos.spec.ts`) lê o texto da confirmação.
 */
describe("a janela é portal, e portal não existe no servidor", () => {
  it("não desenha o diálogo nem o seu texto", () => {
    const html = renderToStaticMarkup(
      <ConfirmSheet
        open
        titulo="Sair de Música Eletrônica?"
        descricao="Seus tópicos e respostas continuam na comunidade."
        confirmar="Sair"
        cancelar="Continuar membro"
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(html).not.toContain("Sair de Música Eletrônica?");
    expect(html).not.toContain('role="dialog"');
  });
});

describe("o botão redondo sem círculo", () => {
  it("não tem fundo nenhum, e o redondo continua só no hover", () => {
    /*
      Os três pontos da contribuição (pedido do PO, 7/11). Snapshot
      sozinho não é barreira aqui: qualquer um dos dois lados muda o
      snapshot, e atualizar snapshot é reflexo. Esta medida diz **qual**
      classe não pode voltar.
    */
    const nu = renderToStaticMarkup(
      <RoundIconButton label="Opções" tamanho="sm" nu>
        {"·"}
      </RoundIconButton>,
    );
    expect(nu).not.toContain("bg-paper");

    // E o irmão com círculo continua tendo o fundo: senão este teste
    // passaria verde com a variante inteira apagada.
    const comCirculo = renderToStaticMarkup(
      <RoundIconButton label="Opções" tamanho="sm">
        {"·"}
      </RoundIconButton>,
    );
    expect(comCirculo).toContain("bg-paper");
  });
});

describe("o controle deslizante", () => {
  it("o − e o + dizem de que controle são, e param nos limites", () => {
    /*
      "Diminuir" sozinho não diz nada quando há dois deslizantes na tela,
      e quem usa leitor de tela ouve a lista de controles fora de ordem.
      O rótulo entra no nome dos dois botões.
    */
    const html = renderToStaticMarkup(
      <ControleDeslizante
        rotulo="Aproximação"
        valor={1}
        minimo={1}
        maximo={3}
        onMudar={() => {}}
      />,
    );

    expect(html).toContain('aria-label="Diminuir aproximação"');
    expect(html).toContain('aria-label="Aumentar aproximação"');

    // No mínimo, o − está desativado — e **com o porquê**, que é a
    // convenção do projeto para controle desativado.
    expect(html).toContain("Já está no mínimo");
    expect(html).toMatch(/aria-label="Diminuir aproximação"[^>]*disabled|disabled[^>]*Diminuir/);
  });

  it("no máximo, é o + que desativa", () => {
    const html = renderToStaticMarkup(
      <ControleDeslizante
        rotulo="Aproximação"
        valor={3}
        minimo={1}
        maximo={3}
        onMudar={() => {}}
      />,
    );
    expect(html).toContain("Já está no máximo");
  });
});

/**
 * **O `@` leva ao perfil — e nunca dentro de outro link.**
 *
 * Pedido do PO em 12 de novembro de 2026. O risco de cumpri-lo sem pensar é
 * âncora dentro de âncora, que é HTML inválido: o navegador fecha a
 * primeira sozinho, e o que sobra na tela não é o que o código diz. Por
 * isso o `@` do `TopicCard` **continua texto** — ele mora dentro do link
 * que abre o tópico, e quem leva ao perfil ali é o avatar.
 */
describe("o @ é link, menos onde já há um link em volta", () => {
  it("o @ do cartão de contribuição leva ao perfil", () => {
    const html = renderToStaticMarkup(
      <AnswerCard author="Lia Souza" handle="liasouza" when="há 2 h">
        Oi
      </AnswerCard>,
    );

    expect(html).toContain('href="/liasouza"');
  });

  it("o @ do cartão de tópico continua texto", () => {
    const html = renderToStaticMarkup(
      <TopicCard
        name="Tópico"
        people={2}
        answers={3}
        ultima={{
          texto: "oi",
          autorNome: "Lia",
          autorHandle: "liasouza",
          avatarUrl: null,
        }}
      />,
    );

    expect(html).toContain("@liasouza");
    expect(html, "o cartão inteiro já é link: um <a> aqui seria inválido").not.toContain(
      'href="/liasouza"',
    );
  });

  /**
   * A barreira geral: nenhum componente do sistema desenha âncora dentro de
   * âncora. Uma regex sobre o HTML achado é mais grosseira que um analisador,
   * e é exatamente por isso que serve — ela não depende de eu lembrar de
   * conferir o caso novo.
   */
  it.each(cases)("%s não aninha link dentro de link", (_nome, elemento) => {
    const html = renderToStaticMarkup(elemento);

    let profundidade = 0;
    let maior = 0;
    for (const marca of html.match(/<\/?a[\s>]/g) ?? []) {
      profundidade += marca.startsWith("</") ? -1 : 1;
      maior = Math.max(maior, profundidade);
    }

    expect(maior, "âncora dentro de âncora é HTML inválido").toBeLessThanOrEqual(1);
  });
});
