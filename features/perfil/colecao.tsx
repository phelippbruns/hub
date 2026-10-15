import Link from "next/link";
import { SectionTitle, TopicName } from "@/design/components";

export type AgrupamentoDaColecao = "comunidade" | "recente";

type TopicoDaColecao = {
  id: string;
  slug: string;
  name: string;
  community: { id: string; name: string; universeId: string; coverUrl: string | null };
};

/**
 * A Coleção (RN18): os tópicos que a pessoa seguiu.
 *
 * Só o dono vê — a privacidade é garantida em `getCollection`, e a aba nem
 * aparece para visitante. Isto aqui é a tela.
 */
export function Colecao({
  topicos,
  agrupamento,
  base,
}: {
  topicos: TopicoDaColecao[];
  agrupamento: AgrupamentoDaColecao;
  base: string;
}) {
  const opcoes: { id: AgrupamentoDaColecao; rotulo: string; marca: string }[] = [
    { id: "comunidade", rotulo: "Por comunidade", marca: "#" },
    { id: "recente", rotulo: "Mais recentes", marca: "🕐" },
  ];

  return (
    <div className="flex flex-col gap-2">
      <SectionTitle
        acao={
          <span className="flex gap-1">
            {opcoes.map((opcao) => (
              <Link
                key={opcao.id}
                href={`${base}?aba=colecao&ordem=${opcao.id}`}
                aria-label={opcao.rotulo}
                aria-current={opcao.id === agrupamento ? "true" : undefined}
                className={
                  opcao.id === agrupamento
                    ? "rounded-pill bg-ink text-paper text-caption px-2 py-1"
                    : "rounded-pill text-inkMuted text-caption px-2 py-1"
                }
              >
                {opcao.rotulo}
              </Link>
            ))}
          </span>
        }
      >
        {/* A aba já se chama Coleção; repetir aqui seria a mesma palavra
            duas vezes na mesma tela. O que falta dizer é como organizar. */}
        Organizar
      </SectionTitle>

      <p className="text-caption text-inkMuted">Só você vê a sua Coleção.</p>

      {topicos.length === 0 ? (
        <p className="text-body text-inkMuted">
          Você ainda não segue nenhum tópico. O olho na página do tópico salva aqui.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {topicos.map((topico) => (
            <Link
              key={topico.id}
              href={`/topico/${topico.id}`}
              className="bg-paper block rounded-sm p-3"
            >
              <span className="text-bodyStrong text-ink block truncate">
                <TopicName>{topico.name}</TopicName>
              </span>
              <span className="text-caption text-inkMuted block">{topico.community.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
