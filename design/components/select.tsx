"use client";

import { useId, type SelectHTMLAttributes } from "react";
import { cn } from "../cn";

export type OpcaoDoSelect = { valor: string; rotulo: string };

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "children"> & {
  label: string;
  opcoes: OpcaoDoSelect[];
  /** Mensagem de erro. Quando existe, o campo fica em `error` e é anunciado. */
  error?: string;
  /** Texto de apoio abaixo do campo. */
  hint?: string;
  className?: string;
};

/**
 * Escolher uma coisa numa lista fechada.
 *
 * **`<select>` nativo, e isto é escolha.** O Hub não tinha nenhum até
 * novembro de 2026, e a tentação era montar um balão com botões — o
 * `MenuSuspenso` já existe e pareceria o caminho curto. Seria o caminho
 * longo: um combobox de verdade precisa de setas, Home e End, busca por
 * primeira letra, `aria-activedescendant`, rolagem até o item focado e o
 * comportamento de toque do celular. O nativo traz tudo isso pronto e
 * igual ao que a pessoa já usa no resto do navegador.
 *
 * Não é o `RadioGroup`: aquele mostra as opções todas, sempre, e serve a
 * três ou quatro escolhas que a pessoa precisa comparar (os motivos de
 * denúncia). Aqui a lista pode ter trinta comunidades.
 *
 * A seta é desenhada em CSS, com `appearance-none`: a do sistema muda de
 * desenho a cada navegador e não respeita os tokens.
 */
export function Select({ label, opcoes, error, hint, className, id, ...props }: SelectProps) {
  const gerado = useId();
  const campoId = id ?? gerado;
  const erroId = `${campoId}-erro`;
  const apoioId = `${campoId}-apoio`;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={campoId} className="text-caption text-inkMuted font-bold">
        {label}
      </label>

      <div className="relative">
        <select
          id={campoId}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(error && erroId, hint && apoioId) || undefined}
          className={cn(
            "text-body text-ink bg-paper box-border w-full appearance-none rounded-sm border py-2 pr-5 pl-2",
            error ? "border-error" : "border-inkMuted",
          )}
          {...props}
        >
          {opcoes.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>

        {/* A seta não é alvo de clique: o `<select>` inteiro já é. */}
        <span
          aria-hidden="true"
          className="text-inkMuted pointer-events-none absolute top-1/2 right-2 -translate-y-1/2"
        >
          <svg
            viewBox="0 0 24 24"
            width={16}
            height={16}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </div>

      {hint ? (
        <span id={apoioId} className="text-caption text-inkMuted">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={erroId} role="alert" className="text-caption text-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}
