import type { ReactNode } from "react";

/**
 * Cartão de resposta. Mostra o nome real do autor, como manda o princípio de
 * identidade real, e não tem curtida nem contador — participação, não
 * popularidade.
 *
 * O texto é renderizado como texto, nunca como HTML (regra de segurança 8).
 */
export function AnswerCard({
  author,
  handle,
  when,
  children,
  avatar,
}: {
  author: string;
  handle: string;
  when: string;
  children: ReactNode;
  avatar?: ReactNode;
}) {
  return (
    <article className="bg-paper flex flex-col gap-1 rounded-sm p-2">
      <div className="flex items-center gap-2">
        {avatar}
        <span className="text-bodyStrong text-ink">{author}</span>
        <span className="text-caption text-inkMuted">
          @{handle} · {when}
        </span>
      </div>
      <p className="text-body text-ink">{children}</p>
    </article>
  );
}
