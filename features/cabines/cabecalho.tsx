import type { ReactNode } from "react";
import { cn } from "@/design/cn";

export type PessoaNoCabecalho = {
  id: string;
  nome: string;
  avatarUrl: string | null;
};

/**
 * O cabeçalho da conversa: quem está dentro, o nome e o menu.
 *
 * As pessoas ficam aqui, e não num painel à direita, porque é a informação
 * que responde "com quem eu estou falando" — ela pertence ao alto da
 * conversa, não a uma coluna separada que some quando a janela encolhe.
 *
 * As fotos se sobrepõem em até três: a quarta não acrescenta nada que o
 * "N pessoas na Cabine" ao lado já não diga.
 */
export function CabecalhoDaCabine({
  nome,
  participantes,
  menu,
}: {
  nome: string;
  participantes: PessoaNoCabecalho[];
  menu: ReactNode;
}) {
  const quantas = participantes.length;

  return (
    <header className="border-line flex items-center gap-2 border-b px-5 py-4">
      <span aria-hidden="true" className="flex shrink-0">
        {participantes.slice(0, 3).map((pessoa, i) => (
          <span
            key={pessoa.id}
            className={cn(
              "size-avatarSm rounded-pill bg-lavender text-ink text-caption ring-paper grid place-items-center bg-cover bg-center font-bold ring-2",
              i > 0 && "-ml-2",
            )}
            style={pessoa.avatarUrl ? { backgroundImage: `url(${pessoa.avatarUrl})` } : undefined}
          >
            {pessoa.avatarUrl ? null : pessoa.nome.slice(0, 1)}
          </span>
        ))}
      </span>

      <span className="min-w-0 flex-1">
        <h1 className="text-subtitle text-ink truncate">{nome}</h1>
        <span className="text-caption text-inkMuted block">
          {quantas} {quantas === 1 ? "pessoa" : "pessoas"} na Cabine
        </span>
      </span>

      {menu}
    </header>
  );
}
