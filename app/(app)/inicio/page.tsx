import type { Metadata } from "next";
import Link from "next/link";
import {
  ActivityRow,
  Button,
  ContentColumn,
  EndOfList,
  HomeRow,
  HotTopicCard,
  LevelMark,
  PageTitle,
  SectionTitle,
  SuggestionRow,
} from "@/design/components";
import { getViewer } from "@/lib/auth/session";
import {
  hotTopicsParaMim,
  interacoesDeQuemSigo,
  minhasUltimasInteracoes,
  topicosQueSigoComNovas,
} from "@/lib/data/inicio";
import { minhasComunidades } from "@/lib/data/comunidades";
import { comunidadesNovas, paraVoce } from "@/lib/data/descoberta";
import { LinhaComunidade } from "@/features/descoberta/linhas";
import { haQuantoTempo } from "@/lib/tempo";

export const metadata: Metadata = { title: "Hoje · Hub" };

function contagem(pessoas: number, respostas: number) {
  return `${pessoas.toLocaleString("pt-BR")} ${pessoas === 1 ? "pessoa" : "pessoas"}, ${respostas.toLocaleString("pt-BR")} ${respostas === 1 ? "resposta" : "respostas"}`;
}

/**
 * Tela 6: o Início.
 *
 * Princípio 3: **a lista termina.** Nenhuma seção pagina, e a tela acaba em
 * "Você está em dia" — é o contrário de um feed infinito, e é de propósito.
 *
 * Princípio 1: **comunidades são o centro.** Por isso os destaques vêm
 * primeiro e a seção de pessoas é limitada a três: o conteúdo de pessoas
 * acompanha a tela, não a define.
 *
 * Na web não há painel lateral, e a coluna fica nos 720 px de sempre.
 */
export default async function InicioPage() {
  const viewer = await getViewer();

  const [destaques, seguidos, deQuemSigo, minhas, comunidades, novas] = await Promise.all([
    hotTopicsParaMim(viewer),
    topicosQueSigoComNovas(viewer),
    interacoesDeQuemSigo(viewer),
    minhasUltimasInteracoes(viewer),
    minhasComunidades(viewer),
    comunidadesNovas(viewer),
  ]);

  // Tela 7: quem ainda não entrou em nenhuma comunidade não tem o que ver.
  if (comunidades.length === 0) {
    const sugestoes = await paraVoce(viewer, 3);

    return (
      <ContentColumn>
        <PageTitle>Hoje</PageTitle>

        <div className="bg-paper flex flex-col items-center gap-2 rounded-md p-5 text-center">
          <span aria-hidden="true" className="flex gap-1">
            <LevelMark level="community" />
            <LevelMark level="topic" />
          </span>
          <p className="text-subtitle text-ink">Suas comunidades aparecem aqui</p>
          <p className="text-body text-inkMuted">
            Entre em comunidades para acompanhar as discussões em destaque.
          </p>
        </div>

        {sugestoes.length > 0 ? (
          <div className="flex flex-col gap-2">
            {sugestoes.map((comunidade) => (
              <SuggestionRow
                key={comunidade.id}
                nome={comunidade.name}
                universo={comunidade.universo.name}
                membros={comunidade.membersCount}
                href={`/c/${comunidade.slug}`}
              />
            ))}
          </div>
        ) : null}

        <Link href="/comunidades" className="block">
          <Button className="w-full">Explorar comunidades</Button>
        </Link>
      </ContentColumn>
    );
  }

  const [primeiro, ...outros] = destaques;

  /*
   * Um tópico que a pessoa segue **e** respondeu apareceria duas vezes, com
   * dois rótulos diferentes para a mesma coisa. Numa tela que existe para
   * mostrar o que importa e terminar, repetir é o oposto do objetivo.
   *
   * Fica na seção de seguidos, que é a que traz novidade; a outra seção é
   * sobre o que ela já leu.
   */
  const jaListados = new Set(seguidos.map((topico) => topico.topicId));
  const minhasSemRepetir = minhas.filter((topico) => !jaListados.has(topico.topicId));

  return (
    <ContentColumn>
      <PageTitle>Hoje</PageTitle>

      {primeiro ? (
        <>
          <SectionTitle>Hot Topics</SectionTitle>
          <HotTopicCard
            topic={primeiro.comunidade.nome}
            opening={primeiro.abertura}
            people={primeiro.pessoas}
            answers={primeiro.respostas}
            href={`/c/${primeiro.comunidade.slug}/${primeiro.topicoSlug}`}
          />

          {outros.map((destaque) => (
            <HomeRow
              key={destaque.topicId}
              nome={destaque.nome}
              href={`/c/${destaque.comunidade.slug}/${destaque.topicoSlug}`}
              detalhe={`Destaque em ${destaque.comunidade.nome}. ${contagem(destaque.pessoas, destaque.respostas)}`}
            />
          ))}
        </>
      ) : null}

      {/*
        Item 9 do escopo: na web, os tópicos seguidos vêm logo depois dos
        destaques; só então as pessoas.
      */}
      {seguidos.length > 0 ? (
        <>
          <SectionTitle
            acao={
              <Link href="/perfil" className="text-caption text-inkMuted underline">
                Ver coleção
              </Link>
            }
          >
            Tópicos que você segue
          </SectionTitle>
          {seguidos.map((topico) => (
            <HomeRow
              key={topico.topicId}
              nome={topico.nome}
              href={`/c/${topico.comunidade.slug}/${topico.topicoSlug}`}
              detalhe={`${topico.comunidade.nome}. ${contagem(topico.pessoas, topico.respostas)}`}
              destaque={
                topico.novas > 0
                  ? `${topico.novas} ${topico.novas === 1 ? "nova" : "novas"}`
                  : undefined
              }
            />
          ))}
        </>
      ) : null}

      {deQuemSigo.length > 0 ? (
        <>
          <SectionTitle
            acao={
              <Link href="/perfil/seguindo" className="text-caption text-inkMuted underline">
                Ver todas
              </Link>
            }
          >
            Pessoas que você segue
          </SectionTitle>
          {deQuemSigo.map((interacao) => (
            <ActivityRow
              key={`${interacao.oQueFez}-${interacao.id}`}
              handle={interacao.quem.handle}
              oQueFez={interacao.oQueFez}
              topico={interacao.topico.nome}
              href={`/c/${interacao.comunidade.slug}/${interacao.topico.slug}`}
              comunidade={interacao.comunidade.nome}
              quando={haQuantoTempo(interacao.quando)}
            />
          ))}
        </>
      ) : null}

      {minhasSemRepetir.length > 0 ? (
        <>
          <SectionTitle>Suas últimas interações</SectionTitle>
          {minhasSemRepetir.map((topico) => (
            <HomeRow
              key={topico.topicId}
              nome={topico.nome}
              href={`/c/${topico.comunidade.slug}/${topico.topicoSlug}`}
              detalhe={`${topico.comunidade.nome}. ${contagem(topico.pessoas, topico.respostas)}${
                topico.depoisDaMinha > 0 ? `. ${topico.depoisDaMinha} depois da sua` : ""
              }`}
            />
          ))}
        </>
      ) : null}

      {/*
        O que nasceu no Hub.

        O resto do Início é sobre o que você já segue; esta é a única
        janela para fora disso, e por isso fica no fim — depois do que é
        seu, antes do "você está em dia". Some quando não há comunidade
        nova: seção avisando que não há nada é pior do que seção nenhuma.
      */}
      {novas.length > 0 ? (
        <>
          <SectionTitle
            acao={
              <Link href="/comunidades" className="text-caption text-inkMuted underline">
                Explorar
              </Link>
            }
          >
            Novas no Hub
          </SectionTitle>
          {novas.map((comunidade) => (
            <LinhaComunidade key={comunidade.id} comunidade={comunidade} />
          ))}
        </>
      ) : null}

      {/* Princípio 3: a lista termina. Sempre. */}
      <EndOfList />
    </ContentColumn>
  );
}
