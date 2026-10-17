import type { ReactNode } from "react";
import { cn } from "@/design/cn";

/**
 * As peças repetidas das demonstrações da apresentação.
 *
 * Não são componentes do design system: nada aqui aparece em outra tela.
 * São conteúdo fixo, desenhado para contar uma história em 10 segundos —
 * nenhum dado real entra nestes painéis.
 */

/** O painel lavanda à direita de cada card. */
export function Painel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-surfacePage h-demoPanel relative flex flex-col gap-2 overflow-hidden rounded-md p-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Linha branca de lista, dentro de um painel. */
export function Linha({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("bg-paper relative flex items-center gap-2 rounded-sm p-2", className)}>
      {children}
    </div>
  );
}

/**
 * Duas versões da mesma coisa no mesmo lugar: a de antes e a de depois.
 *
 * Em grade sobreposta, e não com uma trocando a outra, para a linha não
 * mudar de altura no meio da animação.
 */
export function Pilha({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("grid [&>*]:col-start-1 [&>*]:row-start-1", className)}>{children}</span>
  );
}

/** O anel que marca o toque de quem está usando. */
export function Toque({ nome, className }: { nome: string; className?: string }) {
  return (
    <span
      className={cn(
        "hub-anima border-ink rounded-pill size-avatarMd pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 opacity-0",
        nome,
        className,
      )}
    />
  );
}

/** Rótulo pequeno no topo de um painel. */
export function RotuloDoPainel({ children }: { children: ReactNode }) {
  return <span className="text-caption text-inkMuted">{children}</span>;
}

/** Botão falso: tem a forma do botão do sistema, mas não é clicável. */
export function BotaoFalso({
  children,
  tom = "primary",
  className,
}: {
  children: ReactNode;
  tom?: "primary" | "secondary" | "highlight";
  className?: string;
}) {
  const tons =
    tom === "secondary"
      ? "bg-transparent text-ink border-ink"
      : tom === "highlight"
        ? "bg-sun text-ink border-sun"
        : "bg-ink text-paper border-ink";

  return (
    <span
      className={cn(
        "rounded-pill text-caption relative box-border inline-flex items-center justify-center gap-1 border-2 px-2 py-1 font-semibold",
        tons,
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Nome em destaque dentro de uma linha. */
export function Nome({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("text-bodyStrong text-ink block", className)}>{children}</span>;
}

/** Linha de apoio, em cinza. */
export function Apoio({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("text-caption text-inkMuted block", className)}>{children}</span>;
}

/** Avatar falso: a inicial num círculo. */
export function Avatar({
  inicial,
  tom = "lavender",
  className,
}: {
  inicial: string;
  tom?: "lavender" | "sun";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-pill text-label text-ink size-thumb grid shrink-0 place-items-center font-bold",
        tom === "sun" ? "bg-sun" : "bg-lavender",
        className,
      )}
    >
      {inicial}
    </span>
  );
}

/** Lista numerada de passos, a mesma dos cards 2, 3, 4, 5 e 6. */
export function Passos({ itens }: { itens: ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {itens.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="bg-surfacePage text-caption text-ink size-toggleH rounded-pill grid shrink-0 place-items-center font-bold">
            {i + 1}
          </span>
          <span className="text-body text-ink">{item}</span>
        </li>
      ))}
    </ol>
  );
}

/** Observação no pé da coluna de texto, separada por um fio. */
export function Nota({ children }: { children: ReactNode }) {
  return <p className="text-caption text-inkMuted border-line border-t pt-2">{children}</p>;
}
