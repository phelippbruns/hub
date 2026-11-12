import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContentColumn, EmptyState, PageTitle } from "@/design/components";
import { CriarTopico } from "@/features/topicos/criar";
import { getViewer } from "@/lib/auth/session";
import { gifEstaLigado } from "@/lib/midia/giphy";
import { minhasComunidades } from "@/lib/data/comunidades";
import { ondeAindaPossoCriarHoje } from "@/lib/data/topics";

export const metadata: Metadata = { title: "Criar tópico · Hub" };

/**
 * O atalho de criar tópico, da barra lateral.
 *
 * **Era uma página que perguntava em qual comunidade**, com a lista de
 * links, e só o clique nela abria a janela. Agora a janela abre direto,
 * com um campo de comunidade no topo — pedido do PO em 5 de novembro.
 * Perguntar numa tela e escrever noutra eram duas paradas para uma
 * decisão só.
 *
 * O endereço continua existindo e continua sendo o destino da barra:
 * endereço que já existiu nunca vira 404.
 *
 * Com **uma** comunidade só não há o que escolher, e a pessoa vai direto
 * para lá — a janela abre sobre a comunidade dela, que é onde ela ia
 * parar de qualquer jeito.
 */
export default async function CriarTopicoPage() {
  const viewer = await getViewer();
  const comunidades = await minhasComunidades(viewer);

  if (comunidades.length === 1) redirect(`/c/${comunidades[0]!.slug}/novo`);

  if (comunidades.length === 0) {
    return (
      <ContentColumn>
        <PageTitle>Criar tópico</PageTitle>
        <EmptyState
          title="Você ainda não está em nenhuma comunidade"
          description="Tópico nasce dentro de uma comunidade. Use Explorar para entrar numa, ou crie a sua."
        />
      </ContentColumn>
    );
  }

  /*
   * O limite do dia (RN07) de **todas** de uma vez, numa consulta só:
   * trocar a comunidade no campo tem de trocar o aviso junto, e isso
   * acontece no navegador, sem nova ida ao servidor.
   */
  const gastas = await ondeAindaPossoCriarHoje(viewer);
  const escolherEntre = comunidades.map((c) => ({
    slug: c.slug,
    nome: c.name,
    jaUsouODia: gastas.has(c.id),
  }));

  return (
    <ContentColumn>
      <PageTitle>Criar tópico</PageTitle>
      <CriarTopico
        abrirDeInicio
        slug={escolherEntre[0]!.slug}
        nomeDaComunidade={escolherEntre[0]!.nome}
        jaUsouODia={escolherEntre[0]!.jaUsouODia}
        escolherEntre={escolherEntre}
        gifLigado={gifEstaLigado()}
      />
    </ContentColumn>
  );
}
