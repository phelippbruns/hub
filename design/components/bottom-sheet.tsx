"use client";

import { useId, type ReactNode } from "react";
import { cn } from "../cn";

/**
 * Folha inferior. Sobe do rodapé com a alça no topo.
 *
 * É `role="dialog"` com `aria-modal`, nomeada pelo próprio título, para o
 * leitor de tela anunciar o que abriu.
 */
export function BottomSheet({
  title,
  open,
  children,
  className,
}: {
  title: string;
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  const titleId = useId();
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={cn("bg-paper flex w-full flex-col gap-2 rounded-t-md p-3", className)}
    >
      <span aria-hidden="true" className="w-avatarMd rounded-pill bg-line h-1 self-center" />
      <h2 id={titleId} className="text-subtitle text-ink">
        {title}
      </h2>
      {children}
    </div>
  );
}
