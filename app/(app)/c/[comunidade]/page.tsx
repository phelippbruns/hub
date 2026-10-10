import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentColumn, EmptyState, HotTopicCard, SectionTitle } from "@/design/components";
import { TopicStarInline } from "@/design/icons";
import { CabecalhoDaComunidade } from "@/features/comunidades/cabecalho";
import { ControlesDeTopicos } from "@/features/comunidades/controles-de-topicos";
import { comunidadeDaRota } from "@/features/comunidades/dados";
import { emAltaAgora, painelEstaOculto, topicosDaComunidade } from "@/lib/data/comunidades";
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

  const [topicos, destaque, oculto] = await Promise.all([
    topicosDaComunidade(viewer, dados.id, { ordem: ordemAtual, termo }),
    emAltaAgora(dados.id),
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
        Não é o Hot Topic: o ciclo das 00h chega na F10. Até lá, o espaço
        mostra o que está em alta agora, com esse nome — chamar de Hot Topic
        algo que não passou pela virada seria mentir numa tela que o painel
        ao lado explica em detalhe.
      */}
      {destaque && !termo ? (
        <>
          <SectionTitle>Em alta agora</SectionTitle>
          <HotTopicCard
            topic={destaque.name}
            opening={destaque.description}
            people={destaque.pessoas}
            answers={destaque.respostas}
            autor={destaque.autor?.name}
            href={`/topico/${destaque.id}`}
          />
        </>
      ) : null}

      <SectionTitle>Tópicos</SectionTitle>
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
        />
      ) : (
        <div className="flex flex-col gap-2">
          {topicos.map((topico) => (
            <Link
              key={topico.id}
              href={`/topico/${topico.id}`}
              className="bg-paper block rounded-sm p-3"
            >
              <span className="text-bodyStrong text-ink block">
                <TopicStarInline className="mr-1" />
                {topico.name}
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
