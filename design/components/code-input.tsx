"use client";

import { useId, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "../cn";

/**
 * Código de 6 dígitos da recuperação de senha (tela 4).
 *
 * São seis campos visuais, mas um valor só. O foco anda sozinho ao digitar e
 * volta no apagar, e colar o código inteiro distribui os dígitos — é como as
 * pessoas realmente usam, vindas do email.
 */
export function CodeInput({
  value,
  onChange,
  length = 6,
  label,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  label: string;
  error?: string;
}) {
  const id = useId();
  const errorId = `${id}-erro`;
  const digits = value.padEnd(length, " ").slice(0, length).split("");

  function setDigit(index: number, digit: string) {
    const next = digits.map((d, i) => (i === index ? digit : d)).join("");
    onChange(next.replace(/\s/g, ""));
  }

  function focusAt(index: number) {
    const target = document.getElementById(`${id}-${index}`);
    if (target instanceof HTMLInputElement) target.focus();
  }

  function handleChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const digit = event.target.value.replace(/\D/g, "").slice(-1);
    if (!digit) return;
    setDigit(index, digit);
    if (index < length - 1) focusAt(index + 1);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Backspace") return;
    event.preventDefault();

    if (digits[index]?.trim()) {
      setDigit(index, " ");
      return;
    }
    if (index > 0) {
      setDigit(index - 1, " ");
      focusAt(index - 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    focusAt(Math.min(pasted.length, length - 1));
  }

  return (
    <div className="flex flex-col gap-1">
      <span id={`${id}-rotulo`} className="text-caption text-inkMuted font-bold">
        {label}
      </span>

      <div role="group" aria-labelledby={`${id}-rotulo`} className="grid grid-cols-6 gap-1">
        {digits.map((digit, index) => (
          <input
            // A posição é a identidade: os campos nunca são reordenados.
            key={index}
            id={`${id}-${index}`}
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={digit.trim()}
            aria-label={`Dígito ${index + 1} de ${length}`}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => handleChange(index, event)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            className={cn(
              "text-ink bg-paper h-avatarMd box-border w-full rounded-sm border-2 text-center font-bold",
              error ? "border-error" : "border-inkMuted",
            )}
          />
        ))}
      </div>

      {error ? (
        <span id={errorId} role="alert" className="text-caption text-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}
