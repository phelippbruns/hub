import type { ReactNode } from "react";
import { cn } from "../cn";

/**
 * A casca das telas autenticadas, acima de 768 px.
 *
 * Três partes: a barra lateral, o conteúdo e — **só quando a tela tem um** —
 * o painel de contexto à direita. Das 23 telas autenticadas, apenas a página
 * da comunidade e a Cabine têm painel; reservar a coluna nas outras 21
 * deixaria o conteúdo torto e fora do centro.
 *
 * O painel chega por rota paralela, e uma rota paralela está **sempre**
 * preenchida: as telas sem painel caem num `default` que devolve nada. Por
 * isso quem decide se a coluna existe é o `empty:hidden` — se a tela não
 * desenhou nada ali, a coluna some, em vez de ficar uma faixa de 260 px em
 * branco com uma linha ao lado.
 */
export function AppShell({
  nav,
  children,
  painel,
}: {
  nav: ReactNode;
  children: ReactNode;
  painel?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-surfacePage grid min-h-screen",
        painel === undefined
          ? "grid-cols-[auto_minmax(0,1fr)]"
          : "grid-cols-[auto_minmax(0,1fr)_auto]",
      )}
    >
      {nav}
      <main className="min-w-0">{children}</main>
      {painel === undefined ? null : (
        <aside
          aria-label="Painel de contexto"
          className="border-line w-contextPanel border-l p-4 empty:hidden"
        >
          {painel}
        </aside>
      )}
    </div>
  );
}

/**
 * Coluna de conteúdo: 720 px centralizados, com o título na mesma coluna.
 *
 * `larga` é para o tópico e a página da comunidade, que o design system manda
 * usarem a largura total.
 */
export function ContentColumn({
  children,
  larga = false,
  className,
}: {
  children: ReactNode;
  larga?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // Design system, Ritmo: na web, 32 px nas laterais e no topo, 16 px
        // entre componentes.
        "flex flex-col gap-3 px-5 pb-5",
        larga ? "w-full" : "max-w-contentColumn mx-auto w-full",
        className,
      )}
      // A PWA instalada chega à borda de cima; o recorte do aparelho não
      // pode comer o título.
      style={{ paddingTop: "max(var(--spacing-5), env(safe-area-inset-top))" }}
    >
      {children}
    </div>
  );
}

/** Título de tela, alinhado à coluna de conteúdo. */
export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-title text-ink">{children}</h1>;
}
