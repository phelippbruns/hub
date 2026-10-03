import type { ReactNode } from "react";
import { ConfirmedIcon, WarningIcon } from "../icons";
import { cn } from "../cn";

/**
 * Estados que valem para todas as telas (docs/telas.html, tela 29).
 */

/**
 * Carregando: blocos estáticos em lavanda clara, **sem brilho animado**.
 * O design system pede calma, e animação de brilho não é calma.
 */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("bg-lavender/40 block rounded-sm", className)} />;
}

/** Região carregando, anunciada ao leitor de tela. */
export function LoadingBlock({
  label = "Carregando",
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className="flex w-full flex-col gap-2">
      {children}
    </div>
  );
}

/** Erro com ícone e ação de tentar de novo. Nunca só a cor. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p
        role="alert"
        className="bg-paper text-caption text-error flex items-start gap-1 rounded-sm p-2"
      >
        <WarningIcon decorative className="size-iconSm shrink-0" />
        <span>{message}</span>
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-pill border-ink text-caption text-ink box-border cursor-pointer border-2 px-2 py-1 font-semibold"
        >
          Tentar de novo
        </button>
      ) : null}
    </div>
  );
}

/** Confirmação de ação concluída. */
export function SuccessMessage({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="bg-paper text-caption text-success flex items-start gap-1 rounded-sm p-2"
    >
      <ConfirmedIcon decorative className="size-iconSm shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** Vazio convida a agir: título, uma linha de explicação e, quando cabe, uma ação. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-bodyStrong text-ink font-extrabold">{title}</p>
      <p className="text-caption text-inkMuted">{description}</p>
      {action}
    </div>
  );
}

/** A lista termina. Toda lista do Início acaba aqui. */
export function EndOfList({ children = "Você está em dia." }: { children?: ReactNode }) {
  return (
    <p className="border-line text-caption text-inkMuted border-t border-dashed py-1 text-center">
      {children}
    </p>
  );
}
