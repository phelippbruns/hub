import type { ReactNode } from "react";
import { cn } from "../cn";

/**
 * A casca das telas autenticadas, acima de 768 px.
 *
 * Duas partes: a barra lateral e o conteúdo.
 *
 * Houve uma terceira — o painel de contexto à direita, por rota paralela —,
 * e ela saiu na F20 junto com o painel da comunidade, que era a única tela
 * a usá-la. O Hub inteiro carregava a rota paralela, o `default` que
 * devolvia nada e o `empty:hidden` que escondia a coluna, por uma tela só.
 * As informações da comunidade desceram para baixo da capa.
 */
export function AppShell({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-surfacePage grid min-h-screen grid-cols-[auto_minmax(0,1fr)]">
      {/*
        O encaixe da barra: largura fixa de `navRail`, e é ele que fica
        `sticky`. A barra mora dentro em posição absoluta e cresce por cima
        do conteúdo ao abrir — se ela fosse a coluna, abrir empurraria a
        tela inteira para a direita.

        `z-20` põe a barra aberta acima do conteúdo; `h-screen` com o
        `sticky` é o que mantém os botões de criar na tela quando a página
        é comprida, que é o que a jornada da F05 guarda.
      */}
      <div className="w-navRail sticky top-0 z-20 h-screen self-start">{nav}</div>
      <main className="min-w-0">{children}</main>
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
