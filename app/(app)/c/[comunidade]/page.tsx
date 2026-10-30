import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ContentColumn,
  EmptyState,
  HotTopicCard,
  PaginaCarregando,
  SectionTitle,
  TopicName,
} from "@/design/components";
import { sizes, variants } from "@/design/components/button";
import { TopicStar } from "@/design/icons";
import { cn } from "@/design/cn";
import { CabecalhoDaComunidade } from "@/features/comunidades/cabecalho";
import { TelaDeConvite } from "@/features/convite/tela";
import { metadataCompartilhavel } from "@/features/convite/metadata";
import { ControlesDeTopicos } from "@/features/comunidades/controles-de-topicos";
import { AbasDaComunidade } from "@/features/comunidades/abas";
import { abaDaComunidade } from "@/features/comunidades/shared";
import { SobreAComunidade } from "@/features/comunidades/sobre";
import { MembrosDaComunidade } from "@/features/comunidades/membros";
import { PrimeirosPassos, TOPICOS_PARA_SUMIR } from "@/features/comunidades/primeiros-passos";
import { comunidadeDaRota } from "@/features/comunidades/dados";
import { filtroDeMembros, membrosDaComunidade } from "@/lib/data/membros";
import { topicosDaComunidade } from "@/lib/data/comunidades";
import { hotTopicDeHoje } from "@/lib/data/ciclo";
import { sugestoesParaConvidar } from "@/lib/data/cabins";
import { NotFoundError } from "@/lib/data/errors";
import type { OrdemDosTopicos } from "@/lib/data/comunidades";

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
    pessoa?: string;
  }>;
}) {
  const { comunidade: slug } = await params;
  const { q, ordem, convite, aba, filtro, pessoa } = await searchParams;
  const termo = q?.trim() ?? "";
  const ordemAtual: OrdemDosTopicos = ordem === "recentes" ? "recentes" : "respostas";
  const abaAtual = abaDaComunidade(aba);

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

  const paraCompartilhar = await sugestoesParaConvidar(viewer);

  return (
    <ContentColumn larga>
      <CabecalhoDaComunidade comunidade={dados} paraCompartilhar={paraCompartilhar} />

      <AbasDaComunidade base={`/c/${dados.slug}`} atual={abaAtual} />

      {abaAtual === "membros" ? (
        <Suspense
          fallback={<PaginaCarregando titulo={false} linhas={3} label="Carregando os membros" />}
        >
          <AbaDeMembros
            slug={dados.slug}
            comunidadeId={dados.id}
            souModerador={dados.souModerador}
            souMembro={dados.souMembro}
            filtro={filtro}
            termo={pessoa?.trim() ?? ""}
          />
        </Suspense>
      ) : (
        <>
          <SobreAComunidade
            intro={dados.intro}
            regras={dados.regras}
            criadaPor={dados.criadaPor}
            criadaEm={dados.criadaEm}
          />

          {/*
          Primeiros passos some sozinho ao terceiro tópico, e só aparece para
          quem é membro: a RN07 exige participação para criar.
        */}
          {dados.souMembro && dados.topicosCount < TOPICOS_PARA_SUMIR ? (
            <PrimeirosPassos slug={dados.slug} />
          ) : null}

          {/*
          RN09: o Hot Topic do dia, eleito às 00h pelo ciclo anterior.
          Comunidade sem respostas ontem não ganha destaque — e a lista abaixo
          aparece na ordem normal, sem um primeiro lugar que ninguém disputou.

          Some durante a busca: procurar um tópico e ver outro em destaque
          acima confunde o que é resultado.
        */}
          {/*
          O Hot Topic e a lista de tópicos são as duas consultas pesadas, e ficam
          dentro de um `<Suspense>` — não num `loading.tsx`.

          A diferença importa: `loading.tsx` abre o limite **antes** de a página
          rodar, e o Next começa a transmitir com 200 no cabeçalho. Numa rota
          que chama `notFound()`, como esta, isso transforma 404 em 200 — um
          endereço que não existe passa a dizer que existe. Aconteceu em 15 de
          outubro e está no Faustão.

          Aqui a conferência de existência já rodou acima. O que chega depois é
          só conteúdo, e pode escorrer.
        */}
          <Suspense
            fallback={<PaginaCarregando titulo={false} linhas={1} label="Carregando o Hot Topic" />}
          >
            <DestaqueDaComunidade comunidadeId={dados.id} slug={dados.slug} termo={termo} />
          </Suspense>

          {/*
          O botão de criar tópico também mora **aqui**, e não só no atalho da
          barra lateral: a vontade de abrir um assunto nasce lendo a comunidade,
          e não havia caminho daqui para `/c/<slug>/novo`.

          Só para quem é membro: RN07 exige participação para criar, e um botão
          que leva a uma recusa é pior do que botão nenhum.
        */}
          <SectionTitle acao={dados.souMembro ? <BotaoNovoTopico slug={dados.slug} /> : undefined}>
            Tópicos
          </SectionTitle>
          <ControlesDeTopicos
            slug={dados.slug}
            nomeDaComunidade={dados.name}
            termoInicial={termo}
            ordem={ordemAtual}
          />

          <Suspense
            fallback={<PaginaCarregando titulo={false} linhas={3} label="Carregando os tópicos" />}
          >
            <ListaDeTopicos
              comunidadeId={dados.id}
              slug={dados.slug}
              termo={termo}
              ordem={ordemAtual}
            />
          </Suspense>
        </>
      )}
    </ContentColumn>
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
  termo,
  ordem,
}: {
  comunidadeId: string;
  slug: string;
  termo: string;
  ordem: OrdemDosTopicos;
}) {
  // `comunidadeDaRota` é lida uma vez por requisição, então pedir o viewer
  // de novo aqui não custa outra ida ao banco.
  const { viewer } = await comunidadeDaRota(slug);
  const topicos = await topicosDaComunidade(viewer, comunidadeId, { ordem, termo });

  if (topicos.length === 0) {
    return (
      <EmptyState
        title={termo ? `Nada encontrado para "${termo}"` : "Nenhum tópico ainda"}
        description={
          termo ? "Tente outro termo." : "Seja a primeira pessoa a abrir um assunto aqui."
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {topicos.map((topico) => (
        <Link
          key={topico.id}
          href={`/c/${slug}/${topico.slug}`}
          className="bg-paper block rounded-sm p-3"
        >
          <span className="text-bodyStrong text-ink block">
            <TopicName>{topico.name}</TopicName>
          </span>
          <span className="text-caption text-inkMuted block">
            {topico.pessoas.toLocaleString("pt-BR")} {topico.pessoas === 1 ? "pessoa" : "pessoas"},{" "}
            {topico.respostas.toLocaleString("pt-BR")}{" "}
            {topico.respostas === 1 ? "resposta" : "respostas"}
          </span>
        </Link>
      ))}
    </div>
  );
}

/**
 * O caminho para a tela 16, de dentro da comunidade.
 *
 * Link com a aparência de botão, e não `<Button>` dentro de `<Link>`: botão
 * dentro de link é HTML inválido e dá dois nomes acessíveis ao mesmo alvo.
 * Mesmo caminho do "Responder" do cartão de Hot Topic.
 */
/**
 * O botão de criar tópico, em destaque e com o asterisco.
 *
 * É um só. Havia outro igual no estado vazio da lista, e o PO mandou tirá-lo:
 * o lugar deste já é o certo, e dois botões idênticos na mesma tela fazem
 * procurar diferença entre eles.
 *
 * `Link` estilizado, e não `Button` dentro de `Link`: botão dentro de link é
 * HTML inválido, e um `Button` que navega perderia o clique do meio e o
 * "abrir em nova aba".
 */
function BotaoNovoTopico({ slug }: { slug: string }) {
  return (
    <Link
      href={`/c/${slug}/novo`}
      className={cn("rounded-pill inline-flex items-center gap-1", variants.primary, sizes.sm)}
    >
      <TopicStar className="size-icon" />
      Criar tópico
    </Link>
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
  souModerador,
  souMembro,
  filtro,
  termo,
}: {
  slug: string;
  comunidadeId: string;
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
      membros={membros}
      filtro={escolhido}
      termo={termo}
      souModerador={souModerador}
      souMembro={souMembro}
    />
  );
}
