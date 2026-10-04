import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/session";
import { getTopicForViewer } from "@/lib/data/topics";
import { ContentColumn, PageTitle } from "@/design/components";

/**
 * Atalho temporário para um tópico por id.
 *
 * A URL canônica do protótipo é `/c/<comunidade>/<topico>`, com *slug* nas
 * duas pontas — colunas que o banco ainda não tem. Elas entram na F07 e na
 * F08, junto das entidades, e aí este atalho vira um redirecionamento.
 *
 * Existe porque o convite da F04 aponta para cá: sem ele, quem volta de um
 * convite cai num 404.
 */
export default async function TopicoPorIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (viewer.kind !== "member") redirect(`/entrar?next=/topico/${id}`);

  const topico = await getTopicForViewer(viewer, id);

  return (
    <ContentColumn larga>
      <p className="text-caption text-inkMuted">{topico.community.name}</p>
      <PageTitle>{topico.name}</PageTitle>
      <p className="text-body text-ink">{topico.description}</p>
      <p className="text-caption text-inkMuted">
        {topico.peopleCount} {topico.peopleCount === 1 ? "pessoa" : "pessoas"} ·{" "}
        {topico.answerCount} {topico.answerCount === 1 ? "resposta" : "respostas"}
      </p>
      <p className="text-caption text-inkMuted">A página do tópico chega na F08.</p>
    </ContentColumn>
  );
}
