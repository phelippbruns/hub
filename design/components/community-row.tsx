import { cn } from "../cn";

/**
 * Linha de comunidade. Em listas, a comunidade aparece com uma miniatura da
 * capa no lugar da marca #.
 *
 * "Tópicos ativos" conta tópicos com ao menos uma resposta nas últimas 24 h.
 */
export function CommunityRow({
  name,
  members,
  activeTopics,
  cover,
  action,
}: {
  name: string;
  members: number;
  activeTopics: number;
  /** Miniatura da capa. Sem capa, fica um bloco em lavender. */
  cover?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-paper flex items-center gap-2 rounded-sm p-2">
      <span
        aria-hidden="true"
        className={cn("size-thumb bg-lavender shrink-0 rounded-sm bg-cover bg-center")}
        style={cover ? { backgroundImage: `url(${cover})` } : undefined}
      />
      <span className="min-w-0 flex-1">
        <span className="text-bodyStrong text-ink block truncate">{name}</span>
        <span className="text-caption text-inkMuted block">
          {members} {members === 1 ? "membro" : "membros"} · {activeTopics}{" "}
          {activeTopics === 1 ? "tópico ativo" : "tópicos ativos"}
        </span>
      </span>
      {action}
    </div>
  );
}
