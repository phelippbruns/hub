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
  type AbaDaComunidade,
  filtroDeTopicos,
  type FiltroDeTopicos,
  telaDaComunidade,
} from "@/features/comunidades/shared";
import { haQuantoTempo } from "@/lib/tempo";
import { SobreAComunidade } from "@/features/comunidades/sobre";
import { MembrosDaComunidade } from "@/features/comunidades/membros";
import { ResumoDaComunidade } from "@/features/comunidades/resumo";
import type { ParaEntrar } from "@/features/comunidades/janela-de-entrada";
import { LinkDoTopico } from "@/features/comunidades/link-do-topico";
import { PainelDoTopico } from "@/features/topicos/painel";
import { ateQuantasContribuicoes, ordemDasContribuicoes } from "@/features/respostas/shared";
import { OlhoDoTopico } from "@/features/topicos/olho";
import { cookies } from "next/headers";
import { COOKIE_DA_LARGURA, larguraDoPainel } from "@/features/topicos/shared";
import { CorpoDoTopico } from "@/features/topicos/corpo";
import { getViewer } from "@/lib/auth/session";
import { gifEstaLigado } from "@/lib/midia/giphy";
import {
  conversaDoEvento,
  LIMITE_RESPOSTAS_PARA_APAGAR,
  topicoPorEndereco,
} from "@/lib/data/topics";
import { marcarTopicoComoVisto, quandoVisitouOTopico } from "@/lib/data/inicio";
import { comunidadeDaRota } from "@/features/comunidades/dados";
import { filtroDeMembros, membrosDaComunidade } from "@/lib/data/membros";
import { enquetesDaComunidade, enquetesEsperandoMeuVoto } from "@/lib/data/enquetes";
import { ListaDeEnquetes } from "@/features/enquetes/lista";
import { eventosDaComunidade, eventosFuturos } from "@/lib/data/eventos";
import { ListaDeEventos } from "@/features/eventos/lista";
import { DetalheDoEvento } from "@/features/eventos/detalhe";
import { denunciasPendentes, filaDeDenuncias } from "@/lib/data/moderacao";
import { FilaDeDenuncias } from "@/features/moderacao/fila";
import { topicosDaComunidade, type PaginaDaComunidade } from "@/lib/data/comunidades";
import type { Viewer } from "@/lib/data/viewer";
import { hotTopicDeHoje, type HotTopic as HotTopicDeHoje } from "@/lib/data/ciclo";
import { jaCrieiTopicoHoje } from "@/lib/data/topics";
import { CriarTopico } from "@/features/topicos/criar";
import { meusSeguidoresParaCompartilhar } from "@/lib/data/follows";
import { NotFoundError } from "@/lib/data/errors";
import { enderecoDaComunidade, enderecoParaCompartilharTopico } from "@/lib/rotas";

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
    /**
     * O evento aberto **no centro**, pelo id.
     *
     * Parâmetro de consulta, e não `/c/<slug>/eventos/<id>`, por um motivo
     * concree: uma pasta ao lado de `[topico]` nasceria irmã estática da
     * rota dinâmica, exigiria entrada nas duas listas de slugs reservados
     * (código e banco) e na lista do teste de nonce. O `?evento=` não custa
     * nada disso, e o evento ainda não tem endereço para compartilhar.
     */
    evento?: string;
    /** Item 10.1: quantas contribuições já foram carregadas, de 20 em 20. */
    ate?: string;
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
  const {
    q,
    ordem,
    convite,
    aba,
    filtro,
    pessoa,
    papel,
    t,
    evento,
    nome,
    ate: ateQuantas,
  } = await searchParams;
  const pessoaFiltro = papel;
  const termo = q?.trim() ?? "";
  /*
   * **Quem disputa o centro, e quem ganha** — numa função pura, testada sem
   * navegador (`features/comunidades/shared.test.ts`). Aba, tópico e evento
   * cabem na mesma URL, e uma precedência trocada não quebra nada: só mostra
   * a tela errada, caladinha.
   */
  const tela = telaDaComunidade({ aba, t, evento });
  const abaAtual = tela.aba;
  /*
   * Com o evento no centro, a coluna da direita trata a aba como Eventos —
   * senão o bloco "PRÓXIMO EVENTO" repetiria ao lado o evento que o centro
   * já está mostrando inteiro. É a mesma regra que fez os blocos sumirem na
   * aba correspondente.
   */
  const abaDoResumo: AbaDaComunidade = tela.centro === "evento" ? "eventos" : abaAtual;
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
    // RN18: a folha de compartilhar lista **quem me segue**, não as
    // sugestões da Cabine. A `/cabines/nova` continua com as sugestões:
    // lá a regra é comunidade em comum (RN21), que é outra coisa.
    meusSeguidoresParaCompartilhar(viewer),
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
   * O que a janela de entrar precisa saber, montado uma vez e passado às
   * abas. Ela abre do cabeçalho, das enquetes e dos eventos — quem não
   * participa e clica em votar ou confirmar recebe o convite, e não um
   * botão desabilitado.
   */
  const paraEntrar = {
    id: dados.id,
    slug: dados.slug,
    name: dados.name,
    intro: dados.intro,
    regras: dados.regras,
  };

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

          {/*
            **Duas colunas em todas as abas, não só no Início.**

            A coluna da direita ficava dentro do ramo do Início, então trocar
            de aba a fazia desaparecer — e clicar em "Ver todos" ou "Ver
            evento" levava a pessoa para uma tela que perdia o contexto de
            onde ela veio. Agora o par conteúdo+resumo envolve o encadeado:
            **uma instância só**, um `<Suspense>` só, e o resumo acompanha
            as quatro abas.

            A coluna é **desta página**, e não uma rota paralela do app com
            preferência no banco — foi assim que ela nasceu na F20 e é o que
            o vacilo 17 registrou. Aqui ela é um `<aside>` e nada mais.

            Sem corte por largura: o protótipo v6 some com ela abaixo de
            1100 px, mas o Hub é só computador até a F21 e a regra do projeto
            proíbe breakpoint. A adaptação entra inteira lá, junto com o
            celular. Medido antes de mexer: a aba Início, que já tinha as
            duas colunas, cabe até em 768 px.
          */}
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              {tela.centro === "evento" || abaAtual === "eventos" ? (
                <Suspense
                  fallback={
                    <PaginaCarregando titulo={false} linhas={2} label="Carregando os eventos" />
                  }
                >
                  <AbaDeEventos
                    slug={dados.slug}
                    comunidadeId={dados.id}
                    souMembro={dados.souMembro}
                    paraEntrar={paraEntrar}
                    eventoAberto={tela.centro === "evento" ? tela.evento : null}
                    ordem={ordem}
                    ate={ateQuantas}
                  />
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
                    paraEntrar={paraEntrar}
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
                <>
                  <SobreAComunidade
                    about={dados.about}
                    regras={dados.regras}
                    criadaPor={dados.criadaPor}
                    criadaEm={dados.criadaEm}
                  />

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
                  <SectionTitle
                    contagem={dados.topicosCount}
                    acao={
                      dados.souMembro ? (
                        <CriarTopico
                          slug={dados.slug}
                          nomeDaComunidade={dados.name}
                          jaUsouODia={jaUsouODia}
                          nomeSugerido={nome?.slice(0, 80) ?? ""}
                          gifLigado={gifEstaLigado()}
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
                    />
                  </Suspense>
                </>
              )}
            </div>

            {/*
              O resumo em `<Suspense>`: ele pede o próximo evento e a enquete
              aberta, e essas duas consultas não podem atrasar o conteúdo da
              aba, que é o que a pessoa veio ler.
            */}
            <Suspense fallback={<ResumoDaComunidade aba={abaDoResumo} comunidade={dados} />}>
              <ResumoComAgenda aba={abaDoResumo} comunidade={dados} viewer={viewer} />
            </Suspense>
          </div>
        </ContentColumn>
      </div>

      {/*
        **O painel do tópico não monta junto do evento.** `tela.topico` já
        chega nulo quando há evento aberto, e é por isso que a coluna da
        direita continua ao lado do evento: duas conversas na tela espremeriam
        o conteúdo em três faixas estreitas, que já foi tentado e revertido.
      */}
      {tela.topico ? (
        <Suspense fallback={null}>
          <PainelAoLado comunidade={slug} topico={tela.topico} ordem={ordem} ate={ateQuantas} />
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
  ate: ateQuantas,
}: {
  comunidade: string;
  topico: string;
  ordem: string | undefined;
  ate: string | undefined;
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

  /*
   * **Dois endereços, e a diferença importa.**
   *
   * `endereco` é o que as actions revalidam, e desde que a tela cheia do
   * tópico saiu (6 de novembro) a tela que precisa ser refeita é a da
   * **comunidade** — revalidar `/c/<com>/<topico>` agora seria revalidar
   * um redirecionamento, e a contribuição nova não apareceria.
   *
   * `enderecoCanonico` é o que o botão de compartilhar copia: aquele sim
   * continua com o tópico no caminho, porque é ele que carrega a prévia
   * do link e a tela de convite para quem não tem conta.
   */
  const endereco = enderecoDaComunidade(comunidade);
  const enderecoCanonico = enderecoParaCompartilharTopico(comunidade, topico);
  const ordemDasRespostas = ordemDasContribuicoes(ordem);
  // Item 10.1: 20 por vez, e o `?ate=` diz quantas já chegaram.
  const ate = ateQuantasContribuicoes(ateQuantas);

  // Lido **antes** de marcar a visita de agora: depois, a marca já seria
  // "agora" e a linha de contribuições novas nunca apareceria.
  const vistoEm = await quandoVisitouOTopico(viewer, dados.id);
  void marcarTopicoComoVisto(viewer, dados.id);

  return (
    <PainelDoTopico
      nome={dados.name}
      topicId={dados.id}
      enderecoCanonico={enderecoCanonico}
      comunidadeSlug={comunidade}
      nomeDaComunidade={dados.community.name}
      larguraInicial={larguraDoPainel((await cookies()).get(COOKIE_DA_LARGURA)?.value)}
      souAutor={dados.souAutor}
      podeApagar={dados.podeApagar}
      respostasDeOutros={dados.respostasDeOutros}
      limite={LIMITE_RESPOSTAS_PARA_APAGAR}
      paraCompartilhar={await meusSeguidoresParaCompartilhar(viewer)}
    >
      <CorpoDoTopico
        topicId={dados.id}
        nome={dados.name}
        endereco={endereco}
        abertura={dados.description}
        autor={
          dados.author ? { nome: dados.author.name, avatarUrl: dados.author.avatarUrl } : undefined
        }
        seguir={
          <OlhoDoTopico
            topicId={dados.id}
            nome={dados.name}
            endereco={endereco}
            seguindoInicial={dados.following}
          />
        }
        midia={
          dados.midiaDaAbertura
            ? {
                url: dados.midiaDaAbertura,
                parado: dados.midiaParadaDaAbertura,
                tipo: dados.tipoDaMidiaDaAbertura,
                medidas: dados.medidasDaMidiaDaAbertura,
              }
            : null
        }
        pessoas={dados.peopleCount}
        respostas={dados.answerCount}
        podeVerRespostas={dados.podeVerRespostas}
        ordem={ordemDasRespostas}
        ate={ate}
        vistoEm={vistoEm}
      />
    </PainelDoTopico>
  );
}

/**
 * O resumo da direita, com o próximo evento e a enquete aberta.
 *
 * As duas consultas são as **mesmas** das abas, e isso é a regra, não
 * economia: `enquetesDaComunidade` é quem aplica a RN37 (quem não votou
 * recebe `totalDeVotos: null`), e uma consulta escrita só para este bloco
 * teria de repetir a regra — e um dia esqueceria.
 */
async function ResumoComAgenda({
  aba,
  comunidade,
  viewer,
}: {
  /** A aba aberta: o bloco dela não aparece na coluna. */
  aba: AbaDaComunidade;
  comunidade: PaginaDaComunidade;
  viewer: Viewer;
}) {
  const [eventos, enquetes] = await Promise.all([
    eventosDaComunidade(viewer, comunidade.id),
    enquetesDaComunidade(viewer, comunidade.id),
  ]);

  return (
    <ResumoDaComunidade
      aba={aba}
      comunidade={comunidade}
      proximoEvento={eventos.find((evento) => !evento.passou) ?? null}
      enqueteAberta={enquetes.find((enquete) => !enquete.encerrada) ?? null}
    />
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
}: {
  comunidadeId: string;
  slug: string;
  nomeDaComunidade: string;
  termo: string;
  filtro: FiltroDeTopicos;
  souMembro: boolean;
}) {
  // `comunidadeDaRota` é lida uma vez por requisição, então pedir o viewer
  // de novo aqui não custa outra ida ao banco.
  const { viewer } = await comunidadeDaRota(slug);

  /*
   * A lista sai sempre sem o filtro de novidades, para o chip "Com
   * novidades (n)" saber o número antes de ser clicado. É a mesma consulta
   * — o filtro é aplicado aqui, na memória, sobre o que já veio.
   */
  const [todos, hotTopic] = await Promise.all([
    topicosDaComunidade(viewer, comunidadeId, {
      filtro: filtro === "novas" ? "alta" : filtro,
      termo,
    }),
    hotTopicDeHoje(comunidadeId),
  ]);
  const comNovidades = todos.filter((topico) => topico.novas > 0).length;
  const semDestaque = filtro === "novas" ? todos.filter((topico) => topico.novas > 0) : todos;

  /*
   * **O Hot Topic é a primeira linha da lista** (pedido do PO, 7 de
   * novembro), e não uma seção própria acima dela. Mantém o cartão
   * escuro, com a última contribuição e os rostos — é isso que convida
   * a entrar, e era o que se perderia transformando-o numa linha comum.
   *
   * Ele é **fixado no topo do que já veio**, nunca injetado: se o filtro
   * "Seguindo" o excluiu, ou a busca não o achou, ele não aparece. Um
   * destaque que ignora o filtro é o filtro mentindo.
   */
  const destacado = hotTopic ? semDestaque.find((t) => t.id === hotTopic.id) : undefined;
  const topicos = destacado
    ? [destacado, ...semDestaque.filter((t) => t.id !== destacado.id)]
    : semDestaque;

  /*
   * **O destaque que é conversa de um encontro fica acima da lista, não
   * dentro dela.**
   *
   * Medido, não suposto: `topicosDaComunidade` filtra `event_id IS NULL`, e
   * esse filtro é permanente — a conversa não é um assunto aberto a todos.
   * Então `semDestaque.find()` acima **nunca** a encontra, e tirar o filtro
   * da exibição do Hot Topic não bastava: o destaque do dia sumiria da
   * comunidade em silêncio, com o cartão correto já pronto para ser
   * desenhado.
   *
   * A regra de "o destaque respeita o filtro" continua valendo, e é por isso
   * que ele sai com busca, com "Seguindo" e com "Com novidades": nesses três
   * a pessoa escolheu excluir algo. "Em alta" e "Recentes" são ordenação, não
   * exclusão — e aí o destaque do dia aparece.
   */
  const destaqueDeEvento =
    hotTopic?.eventoId && !termo && filtro !== "seguindo" && filtro !== "novas" ? hotTopic : null;

  return (
    <>
      <ControlesDeTopicos
        slug={slug}
        nomeDaComunidade={nomeDaComunidade}
        termoInicial={termo}
        filtro={filtro}
        comNovidades={comNovidades}
        souMembro={souMembro}
      />

      {destaqueDeEvento ? (
        <LinkDoTopico
          slugDaComunidade={slug}
          slug={destaqueDeEvento.slug}
          eventoId={destaqueDeEvento.eventoId}
        >
          <CartaoDeDestaque hotTopic={destaqueDeEvento} />
        </LinkDoTopico>
      ) : null}

      {topicos.length === 0 ? (
        <EmptyState title={vazio(filtro, termo).titulo} description={vazio(filtro, termo).texto} />
      ) : (
        <div className="flex flex-col gap-2">
          {topicos.map((topico) =>
            hotTopic && topico.id === hotTopic.id ? (
              /*
                **O cartão de destaque abre num clique, como os outros.**
                Até 12 de novembro de 2026 só o botão "Contribuir" no canto
                levava a algum lugar: clicar no título ou na pergunta não
                fazia nada. É o mesmo `LinkDoTopico` da lista — e por isso o
                botão saiu de dentro do cartão.
              */
              <LinkDoTopico key={topico.id} slugDaComunidade={slug} slug={hotTopic.slug}>
                <CartaoDeDestaque hotTopic={hotTopic} />
              </LinkDoTopico>
            ) : (
              <LinkDoTopico key={topico.id} slugDaComunidade={slug} slug={topico.slug}>
                <TopicCard
                  name={topico.name}
                  people={topico.pessoas}
                  answers={topico.respostas}
                  when={topico.ultima ? haQuantoTempo(topico.ultima.quando) : undefined}
                  following={topico.seguindo}
                  novas={topico.novas}
                  ultima={topico.ultima}
                  trecho={topico.trecho}
                />
              </LinkDoTopico>
            ),
          )}
        </div>
      )}
    </>
  );
}

/**
 * O cartão escuro do destaque do dia.
 *
 * Componente porque dois lugares o desenham agora: dentro da lista, quando o
 * destaque é um tópico comum, e acima dela, quando é a conversa de um
 * encontro — que a lista filtra. Duas cópias divergiriam na primeira
 * correção feita só de um lado, e a diferença apareceria em um dos dois
 * casos, que é o jeito mais caro de descobrir.
 */
function CartaoDeDestaque({ hotTopic }: { hotTopic: NonNullable<HotTopicDeHoje> }) {
  return (
    <HotTopicCard
      topic={hotTopic.name}
      opening={hotTopic.description}
      people={hotTopic.pessoas}
      answers={hotTopic.respostas}
      autor={hotTopic.autor?.handle}
      ultima={
        hotTopic.ultima
          ? { ...hotTopic.ultima, quando: haQuantoTempo(hotTopic.ultima.quando) }
          : null
      }
      rostos={hotTopic.primeirosRostos}
    />
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
  paraEntrar,
  eventoAberto,
  ordem,
  ate: ateQuantas,
}: {
  slug: string;
  comunidadeId: string;
  souMembro: boolean;
  paraEntrar: ParaEntrar;
  /** O evento a mostrar no lugar da lista, quando há um e ele existe. */
  eventoAberto: string | null;
  /** A ordem e o "até" da área de comentários, os mesmos `?ordem=` e `?ate=`. */
  ordem: string | undefined;
  ate: string | undefined;
}) {
  const { viewer } = await comunidadeDaRota(slug);
  const eventos = await eventosDaComunidade(viewer, comunidadeId);

  /*
   * **Uma consulta só, e o detalhe sai dela.**
   *
   * Nenhum `findFirst` novo para o evento aberto: a regra inteira desta
   * camada — "o link da sala só sai para quem confirmou" (RN38) — mora em
   * `eventosDaComunidade`, e uma segunda consulta teria de repeti-la. É o
   * mesmo argumento pelo qual a coluna da direita recebe a enquete de
   * `enquetesDaComunidade` em vez de perguntar por conta própria.
   *
   * **Evento que não existe cai na lista, e não em 404.** O 404 desta rota
   * pertence à comunidade; um id velho ou apagado num link colado é um
   * endereço para onde voltar, não uma tela de erro. Mesmo comportamento do
   * painel do tópico, que some em silêncio.
   */
  const aberto = eventoAberto ? eventos.find((e) => e.id === eventoAberto) : undefined;
  if (aberto) {
    return (
      <DetalheDoEvento
        evento={aberto}
        slug={slug}
        souMembro={souMembro}
        paraEntrar={paraEntrar}
        /*
          **A página é quem compõe as duas features.** `features/eventos` não
          importa `features/topicos`, e vice-versa — é a regra do projeto, e
          aqui ela cai bem: o cartão do encontro e o corpo do tópico são duas
          coisas inteiras, e o que as junta é esta tela.
        */
        comentarios={
          /*
            **Os comentários em `<Suspense>` próprio**, e não junto do cartão.
            Sem ele o `<Suspense>` de fora cobre a tela inteira, e o encontro
            — data, lugar, vagas, botão de confirmar presença, que é o que a
            pessoa veio ver — espera a conversa, o compositor e a lista de
            contribuições. O padrão do projeto é esse: o que já está resolvido
            desenha, e só o pedaço lento escorre.
          */
          <Suspense
            fallback={
              <PaginaCarregando titulo={false} linhas={2} label="Carregando os comentários" />
            }
          >
            <ComentariosDoEvento eventoId={aberto.id} slug={slug} ordem={ordem} ate={ateQuantas} />
          </Suspense>
        }
      />
    );
  }

  return (
    <ListaDeEventos
      slug={slug}
      communityId={comunidadeId}
      eventos={eventos}
      souMembro={souMembro}
      paraEntrar={paraEntrar}
    />
  );
}

/**
 * **A área de comentários de um encontro.**
 *
 * É o corpo do tópico **inteiro**, com um cabeçalho diferente: o compositor,
 * a ordem, as estrelas, a mídia, as 20 por vez e a linha de "novas desde a
 * sua última visita" são os mesmos objetos que o painel do tópico desenha.
 * Isso é o ganho da decisão do Bloco 3 — a conversa é um tópico de verdade,
 * então nada aqui precisou de regra nova.
 *
 * **Não há olho de seguir.** Seguir a conversa de um encontro está fora de
 * escopo de propósito: o Início lista tópicos seguidos por `?t=<slug>`, e o
 * slug da conversa não abre painel nenhum. O dia em que seguir entrar, entra
 * junto com o endereço — não antes.
 *
 * Conversa que não existe desenha nada, e o cartão do encontro fica. O
 * gatilho garante que ela existe para todo evento criado pelo Hub; o que
 * sobra é banco mexido à mão, e aí a tela não é o lugar de reclamar.
 */
async function ComentariosDoEvento({
  eventoId,
  slug,
  ordem,
  ate: ateQuantas,
}: {
  eventoId: string;
  slug: string;
  ordem: string | undefined;
  ate: string | undefined;
}) {
  const viewer = await getViewer();

  let conversa;
  try {
    conversa = await conversaDoEvento(viewer, eventoId, { comRespostas: false });
  } catch (erro) {
    if (erro instanceof NotFoundError) return null;
    throw erro;
  }

  /*
   * O endereço que as actions revalidam é o da **comunidade**, igual ao do
   * painel do tópico: o evento vive em `/c/<slug>?aba=eventos&evento=<id>`, e
   * `revalidatePath` trabalha no caminho, não na busca. Passar o endereço com
   * os parâmetros revalidaria o mesmo caminho por acidente — e o dia em que
   * não revalidasse, a contribuição nova não apareceria sem recarregar.
   */
  const endereco = enderecoDaComunidade(slug);

  // Lido **antes** de marcar a visita de agora: depois, a marca já seria
  // "agora" e a linha de comentários novos nunca apareceria.
  const vistoEm = await quandoVisitouOTopico(viewer, conversa.id);
  void marcarTopicoComoVisto(viewer, conversa.id);

  return (
    <CorpoDoTopico
      topicId={conversa.id}
      nome={conversa.name}
      endereco={endereco}
      abertura={conversa.description}
      pessoas={conversa.peopleCount}
      respostas={conversa.answerCount}
      podeVerRespostas={conversa.podeVerRespostas}
      ordem={ordemDasContribuicoes(ordem)}
      ate={ateQuantasContribuicoes(ateQuantas)}
      vistoEm={vistoEm}
      /*
        **O cabeçalho é um título de seção, não o cartão de abertura.** O
        cartão do encontro já está logo acima, desenhado por
        `DetalheDoEvento` — repeti-lo embaixo com nome e pergunta copiados
        mostraria o mesmo encontro duas vezes. O que falta ali é dizer onde
        se escreve, e a contagem é a mesma que o resto do Hub usa.
      */
      cabecalho={<SectionTitle contagem={conversa.answerCount}>Comentários</SectionTitle>}
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
  paraEntrar,
}: {
  slug: string;
  comunidadeId: string;
  souMembro: boolean;
  paraEntrar: ParaEntrar;
}) {
  const { viewer } = await comunidadeDaRota(slug);
  const enquetes = await enquetesDaComunidade(viewer, comunidadeId);

  return (
    <ListaDeEnquetes
      slug={slug}
      communityId={comunidadeId}
      enquetes={enquetes}
      souMembro={souMembro}
      paraEntrar={paraEntrar}
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
