import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AnswerCard,
  BottomSheet,
  Button,
  Checkbox,
  Chip,
  CommunityDoor,
  CommunityRow,
  EmptyState,
  EndOfList,
  ErrorState,
  FollowButton,
  HotTopicCard,
  LevelMark,
  SectionTitle,
  Segmented,
  Skeleton,
  SortToggle,
  SuccessMessage,
  Switch,
  Tabs,
  TextField,
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
    "cartão de resposta",
    <AnswerCard author="Lia Souza" handle="liasouza" when="há 2 h">
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
  ["ordem por atividade", <SortToggle ordem="atividade" onChange={() => undefined} />],
  ["título de seção", <SectionTitle>Universos</SectionTitle>],
  // O # numa lista diz qual comunidade, não só "a comunidade".
  ["porta da comunidade, com nome", <CommunityDoor member={false} oQue="Vinil" />],
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
