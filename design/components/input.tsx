"use client";

import { useId, type InputHTMLAttributes } from "react";
import { cn } from "../cn";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label: string;
  /** Mensagem de erro. Quando existe, o campo fica em `error` e é anunciado. */
  error?: string;
  /** Texto de apoio abaixo do campo. */
  hint?: string;
  /**
   * Esconde o rótulo da vista, mantendo-o para o leitor de tela.
   *
   * Para campo que já se explica pelo contexto e pelo texto de exemplo —
   * a busca da Cabine, que fica sozinha no topo da coluna. O rótulo nunca
   * some: sem ele, o campo fica mudo para quem não enxerga a tela.
   */
  rotuloOculto?: boolean;
  className?: string;
};

/**
 * Campo de uma linha.
 *
 * O `TextField` é textarea com contador, para resposta e abertura de tópico.
 * Email, senha e nome precisam de um campo simples — é este.
 */
export function Input({ label, error, hint, rotuloOculto, className, id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-erro`;
  const hintId = `${inputId}-apoio`;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label
        htmlFor={inputId}
        className={cn("text-caption text-inkMuted font-bold", rotuloOculto && "sr-only")}
      >
        {label}
      </label>

      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(error && errorId, hint && hintId) || undefined}
        className={cn(
          "text-body text-ink bg-paper box-border w-full rounded-sm border px-2 py-2",
          error ? "border-error" : "border-inkMuted",
        )}
        {...props}
      />

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
