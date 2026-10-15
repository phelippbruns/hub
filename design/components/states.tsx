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

/**
 * O esqueleto de uma tela inteira, para o `loading.tsx` de cada rota.
 *
 * Existe porque **toda rota do Hub renderiza por requisição** (a CSP exige
 * nonce, e nonce não sobrevive ao prerender). Cada navegação espera o
 * servidor — e, sem um `loading.tsx`, o Next não tem o que desenhar durante
 * a espera: a tela anterior fica parada, sem sinal nenhum, até a nova chegar
 * inteira. Dois segundos sem resposta parecem dez.
 *
 * `linhas` é quantos blocos de conteúdo desenhar, para o esqueleto ter mais
 * ou menos a altura da tela que vem. Não precisa ser exato: precisa ocupar
 * espaço e dizer "estou indo".
 */
export function PaginaCarregando({
  titulo = true,
  linhas = 3,
  label = "Carregando a página",
}: {
  titulo?: boolean;
  linhas?: number;
  label?: string;
}) {
  return (
    <LoadingBlock label={label}>
      {titulo ? <Skeleton className="h-avatarMd w-authColumn max-w-full" /> : null}
      {Array.from({ length: linhas }, (_, i) => (
        <Skeleton key={i} className="h-cover w-full" />
      ))}
    </LoadingBlock>
  );
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
