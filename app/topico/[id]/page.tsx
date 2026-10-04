import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/session";
import { getTopicForViewer } from "@/lib/data/topics";

/**
 * Destino de quem volta de um convite (RN31). A página do tópico de verdade é
 * da F08; aqui fica o mínimo para o link do convite não cair num 404.
 */
export default async function TopicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (viewer.kind !== "member") redirect(`/entrar?next=/topico/${id}`);

  const topico = await getTopicForViewer(viewer, id);

  return (
    <main className="max-w-contentColumn mx-auto flex flex-col gap-3 px-4 py-4">
      <p className="text-caption text-inkMuted">{topico.community.name}</p>
      <h1 className="text-title text-ink">{topico.name}</h1>
      <p className="text-body text-ink">{topico.description}</p>
      <p className="text-caption text-inkMuted">
        {topico.peopleCount} {topico.peopleCount === 1 ? "pessoa" : "pessoas"} ·{" "}
        {topico.answerCount} {topico.answerCount === 1 ? "resposta" : "respostas"}
      </p>
      <p className="text-caption text-inkMuted">A página do tópico chega na F08.</p>
    </main>
  );
}
