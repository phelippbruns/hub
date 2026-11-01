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
  HomeRow,
  HotTopicCard,
  LevelMark,
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
  TopicOpening,
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
  [
    "confirmação de ação destrutiva",
    <ConfirmSheet
      open
      titulo="Sair de Música Eletrônica?"
      descricao="Seus tópicos e respostas continuam na comunidade."
      confirmar="Sair"
      cancelar="Continuar membro"
      onConfirm={() => undefined}
      onCancel={() => undefined}
    />,
  ],
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
    "abertura do tópico",
    <TopicOpening
      autor="Caio Mendes"
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
