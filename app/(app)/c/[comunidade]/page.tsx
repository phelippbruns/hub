import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  ContentColumn,
  EmptyState,
  HotTopicCard,
  PaginaCarregando,
  SectionTitle,
  TopicCard,
} from "@/design/components";
import { CabecalhoDaComunidade } from "@/features/comunidades/cabecalho";
import { TelaDeConvite } from "@/features/convite/tela";
import { metadataCompartilhavel } from "@/features/convite/metadata";
import { ControlesDeTopicos } from "@/features/comunidades/controles-de-topicos";
import { AbasDaComunidade } from "@/features/comunidades/abas";
import {
  abaDaComunidade,
  filtroDeTopicos,
  type FiltroDeTopicos,
} from "@/features/comunidades/shared";
import { haQuantoTempo } from "@/lib/tempo";
import { SobreAComunidade } from "@/features/comunidades/sobre";
import { MembrosDaComunidade } from "@/features/comunidades/membros";
import { PrimeirosPassos, TOPICOS_PARA_SUMIR } from "@/features/comunidades/primeiros-passos";
import { ResumoDaComunidade } from "@/features/comunidades/resumo";
import { LinkDoTopico } from "@/features/comunidades/link-do-topico";
import { PainelDoTopico } from "@/features/topicos/painel";
import { CorpoDoTopico } from "@/features/topicos/corpo";
import { getViewer } from "@/lib/auth/session";
import { LIMITE_RESPOSTAS_PARA_APAGAR, topicoPorEndereco } from "@/lib/data/topics";
import type { OrdemDasRespostas } from "@/lib/data/topics";
import { marcarTopicoComoVisto, quandoVisitouOTopico } from "@/lib/data/inicio";
import { comunidadeDaRota } from "@/features/comunidades/dados";
import { filtroDeMembros, membrosDaComunidade } from "@/lib/data/membros";
import { enquetesDaComunidade, enquetesEsperandoMeuVoto } from "@/lib/data/enquetes";
import { ListaDeEnquetes } from "@/features/enquetes/lista";
import { eventosDaComunidade, eventosFuturos } from "@/lib/data/eventos";
import { ListaDeEventos } from "@/features/eventos/lista";
import { denunciasPendentes, filaDeDenuncias } from "@/lib/data/moderacao";
import { FilaDeDenuncias } from "@/features/moderacao/fila";
import { topicosDaComunidade } from "@/lib/data/comunidades";
import { hotTopicDeHoje } from "@/lib/data/ciclo";
import { jaCrieiTopicoHoje } from "@/lib/data/topics";
import { CriarTopico } from "@/features/topicos/criar";
import { sugestoesParaConvidar } from "@/lib/data/cabins";
import { NotFoundError } from "@/lib/data/errors";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ comunidade: string }>;
}): Promise<Metadata> {
  const { comunidade } = await params;
  try {
    const { comunidade: dados, viewer } = await comunidadeDaRota(comunidade);
    return metadataCompartilhavel({
      titulo: dados.name,
      descricao: dados.intro,
      capaUrl: dados.coverUrl,
      semConta: viewer.kind !== "member",
    });
  } catch {
    return { title: "Comunidade · Hub" };
  }
}

/** Tela 14: a página da comunidade. */
export default async function ComunidadePage({
  params,
  searchParams,
}: {
  params: Promise<{ comunidade: string }>;
  searchParams: Promise<{
    q?: string;
    ordem?: string;
    convite?: string;
    aba?: string;
    filtro?: string;
    /** O filtro da aba Membros: todos, moderacao ou novos. */
    papel?: string;
    /** O endereço do tópico aberto no painel ao lado. */
    t?: string;
    pessoa?: string;
    /*
     * `?novo=1` abre a janela de criar tópico, e vem de `/novo`.
     *
     * Declarado aqui para documentar o endereço, mas lido no cliente, por
     * `CriarTopico`: quem chega por `Link` para a mesma rota não remonta o
     * componente, e um valor vindo do servidor ficava preso no inicial.
     */
    novo?: string;
    /** A sugestão de Primeiros passos, que preenche o título. */
    nome?: string;
  }>;
}) {
  const { comunidade: slug } = await params;
  const { q, ordem, convite, aba, filtro, pessoa, papel, t, nome } = await searchParams;
  const pessoaFiltro = papel;
  const termo = q?.trim() ?? "";
  const abaAtual = abaDaComunidade(aba);
  const filtroAtual = filtroDeTopicos(filtro ?? (ordem === "recentes" ? "recentes" : undefined));

  let dados;
  let viewer;
  try {
    ({ comunidade: dados, viewer } = await comunidadeDaRota(slug));
  } catch (erro) {
    if (erro instanceof NotFoundError) notFound();
    throw erro;
  }

  // Sem conta: a tela 2, o convite (F14). RN16 — vê a comunidade, não as
  // respostas dos tópicos dela.
  if (viewer.kind !== "member") {
    return (
      <TelaDeConvite
        comunidade={{
          nome: dados.name,
          slug: dados.slug,
          intro: dados.intro,
          membros: dados.membersCount,
          capaUrl: dados.coverUrl,
        }}
        compartilhadoPor={convite}
      />
    );
  }

  const [paraCompartilhar, enquetesAbertas, proximosEncontros, jaUsouODia] = await Promise.all([
    sugestoesParaConvidar(viewer),
    // O contador da aba. Barato: é um `count` com índice, e a aba sempre
    // aparece, então ele seria pedido de qualquer jeito ao trocar de aba.
    enquetesEsperandoMeuVoto(viewer, dados.id),
    eventosFuturos(viewer, dados.id),
    /*
     * A RN07 é conferida **antes** de escrever, não como recusa depois.
     *
     * Vem com a página, e não só ao abrir a janela: a janela é client, e
     * a conferência é do servidor. Um `count` com índice, na mesma volta
     * das outras três — e só para quem é membro, que são os únicos que
     * veem o botão.
     */
    dados.souMembro ? jaCrieiTopicoHoje(viewer, dados.id) : Promise.resolve(false),
  ]);

  // Zero para quem não modera, e sem erro: a capa é desenhada para todo
  // mundo, e recusar aqui derrubaria a tela por causa de um número que
  // nem apareceria.
  const pendentes = await denunciasPendentes(viewer, dados.id);

  /*
   * O painel do tópico, ao lado da lista (protótipo v6).
   *
   * Ele é parte **desta** página, ligado por `?t=`. Foi rota interceptada
   * antes, para o endereço virar `/c/<comunidade>/<topico>`; a
   * interceptação casa qualquer segmento irmão e engolia `/novo` e
   * `/moderar`. Está no Faustão.
   */
  return (
    <div className="flex items-start">
      <div className="min-w-0 flex-1">
        <ContentColumn larga>
          <CabecalhoDaComunidade
            comunidade={dados}
            paraCompartilhar={paraCompartilhar}
            denunciasPendentes={pendentes}
            /*
              A fila é desenhada aqui, no servidor, e entregue pronta à
              janela: ela depende de permissão, e permissão se confere no
              servidor. Para quem não modera não existe nem o nó.
            */
            filaDeDenuncias={
              dados.souModerador ? (
                <FilaDaComunidade slug={dados.slug} comunidadeId={dados.id} />
              ) : undefined
            }
          />

          <AbasDaComunidade
            base={`/c/${dados.slug}`}
            atual={abaAtual}
            enquetesAbertas={enquetesAbertas}
            eventosFuturos={proximosEncontros}
          />

          {abaAtual === "eventos" ? (
            <Suspense
              fallback={
                <PaginaCarregando titulo={false} linhas={2} label="Carregando os eventos" />
              }
            >
              <AbaDeEventos slug={dados.slug} comunidadeId={dados.id} souMembro={dados.souMembro} />
            </Suspense>
          ) : abaAtual === "enquetes" ? (
            <Suspense
              fallback={
                <PaginaCarregando titulo={false} linhas={2} label="Carregando as enquetes" />
              }
            >
              <AbaDeEnquetes
                slug={dados.slug}
                comunidadeId={dados.id}
                souMembro={dados.souMembro}
              />
            </Suspense>
          ) : abaAtual === "membros" ? (
            <Suspense
              fallback={
                <PaginaCarregando titulo={false} linhas={3} label="Carregando os membros" />
              }
            >
              <AbaDeMembros
                slug={dados.slug}
                comunidadeId={dados.id}
                total={dados.membersCount}
                souModerador={dados.souModerador}
                souMembro={dados.souMembro}
                filtro={pessoaFiltro}
                termo={pessoa?.trim() ?? ""}
              />
            </Suspense>
          ) : (
            /*
          Duas colunas acima de 1100 px, como o protótipo v6: o conteúdo à
          esquerda e o resumo da comunidade à direita.

          A coluna da direita é **desta página**, e não uma rota paralela do
          app inteiro com uma preferência no banco — foi assim que ela nasceu
          na F20 e é o que o vacilo 17 registrou. Aqui ela é um `<aside>` e
          nada mais.

          Sem corte por largura: o protótipo some com ela abaixo de 1100 px,
          mas o Hub é só computador até a F21 e a regra do projeto proíbe
          breakpoint. A adaptação entra inteira lá, junto com o celular.
        */
            <div className="flex items-start gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <SobreAComunidade
                  about={dados.about}
                  regras={dados.regras}
                  criadaPor={dados.criadaPor}
                  criadaEm={dados.criadaEm}
                />

                {/*
              Primeiros passos some sozinho ao terceiro tópico, e só aparece
              para quem é membro: a RN07 exige participação para criar.
            */}
                {dados.souMembro && dados.topicosCount < TOPICOS_PARA_SUMIR ? (
                  <PrimeirosPassos slug={dados.slug} />
                ) : null}

                {/*
              RN09: o Hot Topic do dia, eleito às 00h pelo ciclo anterior.
              Comunidade sem respostas ontem não ganha destaque.

              Ele e a lista são as duas consultas pesadas, e ficam dentro de
              um `<Suspense>` — não num `loading.tsx`. A diferença importa:
              `loading.tsx` abre o limite **antes** de a página rodar, e o
              Next começa a transmitir com 200 no cabeçalho. Numa rota que
              chama `notFound()`, como esta, isso transforma 404 em 200.
              Aconteceu em 15 de outubro e está no Faustão.
            */}
                <Suspense
                  fallback={
                    <PaginaCarregando titulo={false} linhas={1} label="Carregando o Hot Topic" />
                  }
                >
                  <DestaqueDaComunidade comunidadeId={dados.id} slug={dados.slug} termo={termo} />
                </Suspense>

                <SectionTitle
                  contagem={dados.topicosCount}
                  acao={
                    dados.souMembro ? (
                      <CriarTopico
                        slug={dados.slug}
                        nomeDaComunidade={dados.name}
                        jaUsouODia={jaUsouODia}
                        nomeSugerido={nome?.slice(0, 80) ?? ""}
                      />
                    ) : undefined
                  }
                >
                  Tópicos
                </SectionTitle>

                <Suspense
                  fallback={
                    <PaginaCarregando titulo={false} linhas={3} label="Carregando os tópicos" />
                  }
                >
                  <ListaDeTopicos
                    comunidadeId={dados.id}
                    slug={dados.slug}
                    nomeDaComunidade={dados.name}
                    termo={termo}
                    filtro={filtroAtual}
                    souMembro={dados.souMembro}
                    totalDeTopicos={dados.topicosCount}
                  />
                </Suspense>
              </div>

              <ResumoDaComunidade comunidade={dados} />
            </div>
          )}
        </ContentColumn>
      </div>

      {t ? (
        <Suspense fallback={null}>
          <PainelAoLado comunidade={slug} topico={t} ordem={ordem} />
        </Suspense>
      ) : null}
    </div>
  );
}

/**
 * O tópico aberto ao lado da lista.
 *
 * Em `<Suspense>` como o resto: a conferência de existência da comunidade
 * já rodou, e o que chega depois é conteúdo. Tópico que não existe some do
 * painel em silêncio em vez de derrubar a tela — o endereço que vale para
 * dizer "não existe" é o do tópico, `/c/<comunidade>/<topico>`, e esse dá
 * 404 como sempre deu.
 */
async function PainelAoLado({
  comunidade,
  topico,
  ordem,
}: {
  comunidade: string;
  topico: string;
  ordem: string | undefined;
}) {
  const viewer = await getViewer();
  if (viewer.kind !== "member") return null;

  let dados;
  try {
    dados = await topicoPorEndereco(viewer, comunidade, topico, { comRespostas: false });
  } catch (erro) {
    if (erro instanceof NotFoundError) return null;
    throw erro;
  }

  const endereco = `/c/${comunidade}/${topico}`;
  const ordemDasRespostas: OrdemDasRespostas = ordem === "antigas" ? "antigas" : "recentes";

  // Lido **antes** de marcar a visita de agora: depois, a marca já seria
  // "agora" e a linha de contribuições novas nunca apareceria.
  const vistoEm = await quandoVisitouOTopico(viewer, dados.id);
  void marcarTopicoComoVisto(viewer, dados.id);

  return (
    <PainelDoTopico
      nome={dados.name}
      topicId={dados.id}
      endereco={endereco}
      comunidadeSlug={comunidade}
      nomeDaComunidade={dados.community.name}
      seguindoInicial={dados.following}
      souAutor={dados.souAutor}
      podeApagar={dados.podeApagar}
      respostasDeOutros={dados.respostasDeOutros}
      limite={LIMITE_RESPOSTAS_PARA_APAGAR}
      paraCompartilhar={await sugestoesParaConvidar(viewer)}
    >
      <CorpoDoTopico
        topicId={dados.id}
        endereco={endereco}
        abertura={dados.description}
        autor={dados.author?.name}
        pessoas={dados.peopleCount}
        respostas={dados.answerCount}
        podeVerRespostas={dados.podeVerRespostas}
        ordem={ordemDasRespostas}
        vistoEm={vistoEm}
      />
    </PainelDoTopico>
  );
}

/**
 * RN09: o Hot Topic do dia, eleito às 00h pelo ciclo anterior.
 *
 * Some durante a busca: procurar um tópico e ver outro em destaque acima
 * confunde o que é resultado.
 */
async function DestaqueDaComunidade({
  comunidadeId,
  slug,
  termo,
}: {
  comunidadeId: string;
  slug: string;
  termo: string;
}) {
  if (termo) return null;

  const hotTopic = await hotTopicDeHoje(comunidadeId);
  if (!hotTopic) return null;

  return (
    <>
      <SectionTitle>Hot Topic</SectionTitle>
      <HotTopicCard
        topic={hotTopic.name}
        opening={hotTopic.description}
        people={hotTopic.pessoas}
        answers={hotTopic.respostas}
        autor={hotTopic.autor?.name}
        href={`/c/${slug}/${hotTopic.slug}`}
      />
    </>
  );
}

/** A lista de tópicos, que é a consulta mais pesada da tela. */
async function ListaDeTopicos({
  comunidadeId,
  slug,
  nomeDaComunidade,
  termo,
  filtro,
  souMembro,
  totalDeTopicos,
}: {
  comunidadeId: string;
  slug: string;
  nomeDaComunidade: string;
  termo: string;
  filtro: FiltroDeTopicos;
  souMembro: boolean;
  totalDeTopicos: number;
}) {
  // `comunidadeDaRota` é lida uma vez por requisição, então pedir o viewer
  // de novo aqui não custa outra ida ao banco.
  const { viewer } = await comunidadeDaRota(slug);

  /*
   * A lista sai sempre sem o filtro de novidades, para o chip "Com
   * novidades (n)" saber o número antes de ser clicado. É a mesma consulta
   * — o filtro é aplicado aqui, na memória, sobre o que já veio.
   */
  const todos = await topicosDaComunidade(viewer, comunidadeId, {
    filtro: filtro === "novas" ? "alta" : filtro,
    termo,
  });
  const comNovidades = todos.filter((topico) => topico.novas > 0).length;
  const topicos = filtro === "novas" ? todos.filter((topico) => topico.novas > 0) : todos;

  return (
    <>
      <ControlesDeTopicos
        slug={slug}
        nomeDaComunidade={nomeDaComunidade}
        termoInicial={termo}
        filtro={filtro}
        comNovidades={comNovidades}
        souMembro={souMembro}
        totalDeTopicos={totalDeTopicos}
      />

      {topicos.length === 0 ? (
        <EmptyState title={vazio(filtro, termo).titulo} description={vazio(filtro, termo).texto} />
      ) : (
        <div className="flex flex-col gap-2">
          {topicos.map((topico) => (
            <LinkDoTopico key={topico.id} slugDaComunidade={slug} slug={topico.slug}>
              <TopicCard
                name={topico.name}
                people={topico.pessoas}
                answers={topico.respostas}
                when={topico.ultima ? haQuantoTempo(topico.ultima.quando) : undefined}
                following={topico.seguindo}
                novas={topico.novas}
                ultima={topico.ultima}
              />
            </LinkDoTopico>
          ))}
        </div>
      )}
    </>
  );
}

/** Cada lista vazia tem um motivo diferente, e o texto diz qual. */
function vazio(filtro: FiltroDeTopicos, termo: string) {
  if (termo) {
    return { titulo: `Nada encontrado para "${termo}"`, texto: "Tente outro termo." };
  }
  if (filtro === "seguindo") {
    return {
      titulo: "Você não segue nenhum tópico aqui",
      texto: "Abra um tópico e toque no olho para vê-lo nesta lista.",
    };
  }
  if (filtro === "novas") {
    return {
      titulo: "Você está em dia",
      texto: "Nenhuma contribuição nova desde a sua última visita.",
    };
  }
  return {
    titulo: "Nenhum tópico ainda",
    texto: "Seja a primeira pessoa a abrir um assunto aqui.",
  };
}

/**
 * O caminho para a tela 16, de dentro da comunidade.
 *
 * Link com a aparência de botão, e não `<Button>` dentro de `<Link>`: botão
 * dentro de link é HTML inválido e dá dois nomes acessíveis ao mesmo alvo.
 * Mesmo caminho do "Responder" do cartão de Hot Topic.
 */
/**
 * A fila de denúncias, para a janela de moderar.
 *
 * É a mesma de `/c/<comunidade>/moderar`, que continua existindo: a
 * janela é um caminho a mais para ela, não um substituto. Endereço que já
 * foi compartilhado não vira link quebrado.
 */
async function FilaDaComunidade({ slug, comunidadeId }: { slug: string; comunidadeId: string }) {
  const { viewer } = await comunidadeDaRota(slug);
  const denuncias = await filaDeDenuncias(viewer, comunidadeId);

  return (
    <FilaDeDenuncias
      slug={slug}
      communityId={comunidadeId}
      denuncias={denuncias.map((denuncia) => ({
        id: denuncia.id,
        motivo: denuncia.motivo,
        detalhes: denuncia.detalhes,
        vezes: denuncia.vezes,
        trecho: denuncia.alvo.trecho,
        onde: denuncia.alvo.onde,
        autor: denuncia.alvo.autor
          ? { nome: denuncia.alvo.autor.nome, handle: denuncia.alvo.autor.handle }
          : null,
        // Perfil e comunidade não se "removem" pela fila: a ação sobre a
        // pessoa vive na aba Membros da tela de moderação.
        podeRemover: denuncia.alvo.tipo === "answer" || denuncia.alvo.tipo === "topic",
      }))}
    />
  );
}

/** A aba Eventos (RN38). Em `<Suspense>` como as outras. */
async function AbaDeEventos({
  slug,
  comunidadeId,
  souMembro,
}: {
  slug: string;
  comunidadeId: string;
  souMembro: boolean;
}) {
  const { viewer } = await comunidadeDaRota(slug);
  const eventos = await eventosDaComunidade(viewer, comunidadeId);

  return (
    <ListaDeEventos
      slug={slug}
      communityId={comunidadeId}
      eventos={eventos}
      souMembro={souMembro}
    />
  );
}

/**
 * A aba Enquetes (RN37).
 *
 * Em `<Suspense>` como as outras: a conferência de existência da
 * comunidade já rodou, e o que vem depois é só conteúdo.
 */
async function AbaDeEnquetes({
  slug,
  comunidadeId,
  souMembro,
}: {
  slug: string;
  comunidadeId: string;
  souMembro: boolean;
}) {
  const { viewer } = await comunidadeDaRota(slug);
  const enquetes = await enquetesDaComunidade(viewer, comunidadeId);

  return (
    <ListaDeEnquetes
      slug={slug}
      communityId={comunidadeId}
      enquetes={enquetes}
      souMembro={souMembro}
    />
  );
}

/**
 * A aba Membros.
 *
 * Fica em `<Suspense>` como a lista de tópicos, e pelo mesmo motivo: a
 * conferência de existência da comunidade já rodou lá em cima, então o que
 * chega depois é só conteúdo e pode escorrer. `loading.tsx` aqui
 * transformaria o 404 desta rota em 200 — está no Faustão.
 */
async function AbaDeMembros({
  slug,
  comunidadeId,
  total,
  souModerador,
  souMembro,
  filtro,
  termo,
}: {
  slug: string;
  comunidadeId: string;
  total: number;
  souModerador: boolean;
  souMembro: boolean;
  filtro: string | undefined;
  termo: string;
}) {
  const { viewer } = await comunidadeDaRota(slug);
  const escolhido = filtroDeMembros(filtro);
  const membros = await membrosDaComunidade(viewer, comunidadeId, { filtro: escolhido, termo });

  return (
    <MembrosDaComunidade
      slug={slug}
      communityId={comunidadeId}
      total={total}
      membros={membros}
      filtro={escolhido}
      termo={termo}
      souModerador={souModerador}
      souMembro={souMembro}
    />
  );
}
