import { Avatar } from "@/design/components";
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
          /*
            Sem o anel branco que separava um do outro: a máscara da forma
            recorta tudo que o elemento desenha, inclusive anel e sombra.
            Quem separa agora é a sobreposição menor — os cantos do
            hexágono já criam o respiro que o círculo não tinha.
          */
          <Avatar
            key={pessoa.id}
            nome={pessoa.nome}
            url={pessoa.avatarUrl}
            tamanho="md"
            className={cn(i > 0 && "-ml-1")}
          />
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
