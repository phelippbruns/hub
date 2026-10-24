"use client";

import { cn } from "../cn";

/**
 * Interruptor. O estado vai em `aria-checked` e no deslocamento do botão,
 * não só na cor — a cor sozinha não pode ser o único sinal de estado.
 */
export function Switch({
  checked,
  onToggle,
  label,
  describedBy,
  className,
}: {
  checked: boolean;
  onToggle?: () => void;
  label: string;
  /** Id da frase que explica o ajuste, quando houver uma. */
  describedBy?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      onClick={onToggle}
      className={cn(
        "h-toggleH w-toggleW rounded-pill relative inline-flex shrink-0 cursor-pointer",
        checked ? "bg-ink" : "bg-line",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-toggleKnob rounded-pill bg-paper absolute top-1 transition-[left]",
          checked
            ? "left-[calc(var(--spacing-toggleW)-var(--spacing-toggleKnob)-var(--spacing-1))]"
            : "left-1",
        )}
      />
    </button>
  );
}
