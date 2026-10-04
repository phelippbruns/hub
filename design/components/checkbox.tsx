"use client";

import { useId } from "react";
import { ConfirmedIcon } from "../icons";
import { cn } from "../cn";

/** Caixa de seleção. O ✓ é o sinal; a cor acompanha, mas não decide sozinha. */
export function Checkbox({
  checked,
  onToggle,
  label,
  className,
}: {
  checked: boolean;
  onToggle?: () => void;
  label: string;
  className?: string;
}) {
  const id = useId();

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <button
        id={id}
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={onToggle}
        className={cn(
          "size-checkbox rounded-control box-border inline-grid cursor-pointer place-items-center border-2",
          checked ? "border-ink bg-ink text-paper" : "border-inkMuted bg-paper",
        )}
      >
        {checked ? <ConfirmedIcon decorative className="size-iconSm" /> : null}
      </button>
      <label htmlFor={id} className="text-body text-ink cursor-pointer">
        {label}
      </label>
    </span>
  );
}
