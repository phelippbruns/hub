"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
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
  /**
   * Mostra "N de 80" ao lado do rótulo, como o `TextField` faz.
   *
   * Exige `maxLength`: contador sem limite não conta nada. Para título de
   * tópico e nome de evento, onde o PO pediu o contador que o protótipo
   * mostra — o campo é curto e estourar o limite sem aviso é a surpresa
   * que o contador existe para evitar.
   */
  contador?: boolean;
  className?: string;
};

/**
 * Campo de uma linha.
 *
 * O `TextField` é textarea com contador, para resposta e abertura de tópico.
 * Email, senha e nome precisam de um campo simples — é este.
 */
export function Input({
  label,
  error,
  hint,
  rotuloOculto,
  contador = false,
  className,
  id,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-erro`;
  const hintId = `${inputId}-apoio`;
  const contadorId = `${inputId}-contador`;

  const limite = typeof props.maxLength === "number" ? props.maxLength : undefined;
  const mostraContador = contador && limite !== undefined;

  /*
   * O texto só é acompanhado quando há contador, e o campo continua
   * **não controlado**: `defaultValue` segue funcionando, e quem escreve
   * continua dono do campo. Guardar o valor para todo `Input` do Hub
   * faria 40 campos renderizarem a cada tecla por causa de dois.
   */
  const [escrito, setEscrito] = useState(String(props.defaultValue ?? props.value ?? ""));

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={inputId}
          className={cn("text-caption text-inkMuted font-bold", rotuloOculto && "sr-only")}
        >
          {label}
        </label>
        {mostraContador ? (
          <span id={contadorId} aria-live="polite" className="text-caption text-inkMuted">
            {escrito.length} de {limite}
          </span>
        ) : null}
      </div>

      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          cn(error && errorId, hint && hintId, mostraContador && contadorId) || undefined
        }
        className={cn(
          "text-body text-ink bg-paper box-border w-full rounded-sm border px-2 py-2",
          error ? "border-error" : "border-inkMuted",
        )}
        {...props}
        onChange={(evento) => {
          if (mostraContador) setEscrito(evento.target.value);
          props.onChange?.(evento);
        }}
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
