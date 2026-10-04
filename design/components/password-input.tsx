"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { cn } from "../cn";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
};

/**
 * Campo de senha com mostrar e ocultar.
 *
 * O botão diz o que faz e qual é o estado atual: sem isso, quem usa leitor de
 * tela não sabe se a senha está visível.
 */
export function PasswordInput({ label, error, hint, className, id, ...props }: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-erro`;
  const hintId = `${inputId}-apoio`;
  const [visible, setVisible] = useState(false);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={inputId} className="text-caption text-inkMuted font-bold">
        {label}
      </label>

      <div
        className={cn(
          "bg-paper box-border flex w-full items-center gap-1 rounded-sm border-2 px-2",
          error ? "border-error" : "border-inkMuted",
        )}
      >
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(error && errorId, hint && hintId) || undefined}
          className="text-body text-ink min-w-0 flex-1 border-0 bg-transparent py-2 outline-none"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          className="text-caption text-inkMuted cursor-pointer font-semibold"
        >
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      </div>

      {hint ? (
        <span id={hintId} className="text-caption text-inkMuted">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} role="alert" className="text-caption text-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}
