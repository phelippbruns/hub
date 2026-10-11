import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ContentColumn,
  EmptyState,
  HotTopicCard,
  SectionTitle,
  TopicName,
} from "@/design/components";
import { sizes, variants } from "@/design/components/button";
import { cn } from "@/design/cn";
import { CabecalhoDaComunidade } from "@/features/comunidades/cabecalho";
import { ControlesDeTopicos } from "@/features/comunidades/controles-de-topicos";
import { comunidadeDaRota } from "@/features/comunidades/dados";
import { painelEstaOculto, topicosDaComunidade } from "@/lib/data/comunidades";
import { hotTopicDeHoje } from "@/lib/data/ciclo";
import { NotFoundError } from "@/lib/data/errors";
import type { OrdemDosTopicos } from "@/lib/data/comunidades";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ comunidade: string }>;
}): Promise<Metadata> {
  const { comunidade } = await params;
  try {
    const { comunidade: dados } = await comunidadeDaRota(comunidade);
    return { title: `${dados.name} · Hub`, description: dados.intro };
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
  searchParams: Promise<{ q?: string; ordem?: string }>;
}) {
  const { comunidade: slug } = await params;
  const { q, ordem } = await searchParams;
  const termo = q?.trim() ?? "";
  const ordemAtual: OrdemDosTopicos = ordem === "recentes" ? "recentes" : "respostas";

  let dados;
  let viewer;
  try {
    ({ comunidade: dados, viewer } = await comunidadeDaRota(slug));
  } catch (erro) {
    if (erro instanceof NotFoundError) notFound();
    throw erro;
  }

  const [topicos, hotTopic, oculto] = await Promise.all([
    topicosDaComunidade(viewer, dados.id, { ordem: ordemAtual, termo }),
    hotTopicDeHoje(dados.id),
    painelEstaOculto(viewer),
  ]);

  return (
    <ContentColumn larga>
      <CabecalhoDaComunidade comunidade={dados} painelOculto={oculto} />

      {/*
        A descrição não entra aqui: na web ela mora no painel da direita, como
        o protótipo manda. Repetir seria a mesma frase duas vezes na tela. No
        celular, que é a F21, ela volta para cá.
      */}
      {/*
        RN09: o Hot Topic do dia, eleito às 00h pelo ciclo anterior.
        Comunidade sem respostas ontem não ganha destaque — e a lista abaixo
        aparece na ordem normal, sem um primeiro lugar que ninguém disputou.

        Some durante a busca: procurar um tópico e ver outro em destaque
        acima confunde o que é resultado.
      */}
      {hotTopic && !termo ? (
        <>
          <SectionTitle>Hot Topic</SectionTitle>
          <HotTopicCard
            topic={hotTopic.name}
            opening={hotTopic.description}
            people={hotTopic.pessoas}
            answers={hotTopic.respostas}
            autor={hotTopic.autor?.name}
            href={`/c/${dados.slug}/${hotTopic.slug}`}
          />
        </>
      ) : null}

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

      {topicos.length === 0 ? (
        <EmptyState
          title={termo ? `Nada encontrado para "${termo}"` : "Nenhum tópico ainda"}
          description={
            termo ? "Tente outro termo." : "Seja a primeira pessoa a abrir um assunto aqui."
          }
          action={!termo && dados.souMembro ? <BotaoNovoTopico slug={dados.slug} /> : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {topicos.map((topico) => (
            <Link
              key={topico.id}
              href={`/c/${dados.slug}/${topico.slug}`}
              className="bg-paper block rounded-sm p-3"
            >
              <span className="text-bodyStrong text-ink block">
                <TopicName>{topico.name}</TopicName>
              </span>
              <span className="text-caption text-inkMuted block">
                {topico.pessoas.toLocaleString("pt-BR")}{" "}
                {topico.pessoas === 1 ? "pessoa" : "pessoas"},{" "}
                {topico.respostas.toLocaleString("pt-BR")}{" "}
                {topico.respostas === 1 ? "resposta" : "respostas"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </ContentColumn>
  );
}

/**
 * O caminho para a tela 16, de dentro da comunidade.
 *
 * Link com a aparência de botão, e não `<Button>` dentro de `<Link>`: botão
 * dentro de link é HTML inválido e dá dois nomes acessíveis ao mesmo alvo.
 * Mesmo caminho do "Responder" do cartão de Hot Topic.
 */
function BotaoNovoTopico({ slug }: { slug: string }) {
  return (
    <Link
      href={`/c/${slug}/novo`}
      className={cn("rounded-pill inline-block", variants.primary, sizes.sm)}
    >
      Criar tópico
    </Link>
  );
}
