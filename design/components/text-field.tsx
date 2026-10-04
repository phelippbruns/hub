"use client";

import { useId, useState, type TextareaHTMLAttributes } from "react";
import { cn } from "../cn";

type TextFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> & {
  label: string;
  /** Limite de caracteres. Resposta e abertura de tópico são 240; perfil, 120. */
  maxLength: number;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  error?: string;
  /** Campo alto, para abertura de tópico e resposta. */
  tall?: boolean;
};

/**
 * Campo de texto com contador.
 *
 * O contador é só o aviso visual. O limite de verdade é conferido com Zod no
 * servidor (regra de segurança 4): o navegador nunca é a última palavra.
 */
export function TextField({
  label,
  maxLength,
  value,
  defaultValue = "",
  onValueChange,
  error,
  tall = false,
  className,
  ...props
}: TextFieldProps) {
  const id = useId();
  const counterId = `${id}-contador`;
  const errorId = `${id}-erro`;
  const [internal, setInternal] = useState(defaultValue);
  const text = value ?? internal;
  const remaining = maxLength - text.length;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-label text-ink font-semibold">
        {label}
      </label>

      <textarea
        id={id}
        value={text}
        maxLength={maxLength}
        aria-describedby={error ? `${errorId} ${counterId}` : counterId}
        aria-invalid={error ? true : undefined}
        onChange={(event) => {
          setInternal(event.target.value);
          onValueChange?.(event.target.value);
        }}
        className={cn(
          "bg-paper text-body text-ink box-border w-full resize-none rounded-sm px-2 py-2",
          tall ? "min-h-avatarLg" : "",
          error ? "border-error border-2" : "border-inkMuted border-2",
        )}
        {...props}
      />

      <div className="flex items-baseline justify-between gap-1">
        {error ? (
          <span id={errorId} className="text-caption text-error">
            {error}
          </span>
        ) : (
          <span />
        )}
        <span
          id={counterId}
          aria-live="polite"
          className={cn("text-caption", remaining < 0 ? "text-error" : "text-inkMuted")}
        >
          {remaining} {remaining === 1 ? "caractere" : "caracteres"}
        </span>
      </div>
    </div>
  );
}
