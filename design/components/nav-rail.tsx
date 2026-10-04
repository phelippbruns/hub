"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CabinNavIcon,
  CommunitiesNavIcon,
  ExploreNavIcon,
  HomeNavIcon,
  NotificationsNavIcon,
  ProfileNavIcon,
} from "../icons";
import { LevelMark } from "./level-mark";
import { cn } from "../cn";

/**
 * Barra de navegação lateral, acima de 768 px.
 *
 * Só ícones, cada um com nome para quem usa leitor de tela — sem rótulo
 * visível a barra fica estreita e o conteúdo ganha espaço.
 *
 * A área atual leva `aria-current="page"` **e** o ícone preenchido: cor
 * sozinha não pode ser o único sinal de estado.
 */
/**
 * Qual ícone acende em cada tela, conferido no protótipo.
 *
 * Prefixo de URL não serve aqui: `/comunidades` é Explorar e
 * `/comunidades/minhas` é Comunidades. Uma regra por prefixo acenderia os
 * dois — foi o que eu tinha feito, e estava errado nos dois sentidos.
 */
const AREAS = [
  {
    href: "/inicio",
    nome: "Início",
    Icone: HomeNavIcon,
    telas: ["/inicio"],
  },
  {
    // A lupa abre Explorar, que lista Universos e sugestões.
    href: "/comunidades",
    nome: "Explorar",
    Icone: ExploreNavIcon,
    telas: ["/comunidades", "/busca", "/u"],
  },
  {
    // O item Comunidades mostra só as minhas.
    href: "/comunidades/minhas",
    nome: "Comunidades",
    Icone: CommunitiesNavIcon,
    telas: ["/comunidades/minhas", "/comunidades/nova", "/c"],
  },
  { href: "/cabines", nome: "Cabine", Icone: CabinNavIcon, telas: ["/cabines"] },
  { href: "/perfil", nome: "Perfil", Icone: ProfileNavIcon, telas: ["/perfil"] },
  {
    href: "/notificacoes",
    nome: "Notificações",
    Icone: NotificationsNavIcon,
    telas: ["/notificacoes"],
  },
] as const;

function cobre(pathname: string, tela: string) {
  return pathname === tela || pathname.startsWith(`${tela}/`);
}

/**
 * A tela mais específica ganha: `/comunidades/minhas` casa com Explorar
 * (`/comunidades`) e com Comunidades, e só o segundo deve acender.
 */
function areaAtual(pathname: string): string | null {
  let escolhida: { href: string; tamanho: number } | null = null;

  for (const area of AREAS) {
    for (const tela of area.telas) {
      if (cobre(pathname, tela) && (!escolhida || tela.length > escolhida.tamanho)) {
        escolhida = { href: area.href, tamanho: tela.length };
      }
    }
  }

  return escolhida?.href ?? null;
}

export function NavRail({ naoLidas = 0 }: { naoLidas?: number }) {
  const pathname = usePathname();
  const atualHref = areaAtual(pathname);

  return (
    <nav
      aria-label="Navegação principal"
      className="bg-paper border-ink w-navRail flex flex-col items-center gap-1 border-r-2 px-1 py-3"
      style={{ paddingTop: "max(var(--spacing-3), env(safe-area-inset-top))" }}
    >
      {/* A marca leva ao Início, como em qualquer site. O rótulo é só "Hub":
          o item de navegação logo abaixo já se chama Início, e dois links com
          o mesmo nome na mesma barra confundem quem usa leitor de tela. */}
      <Link href="/inicio" aria-label="Hub" className="text-ink pb-2">
        <span aria-hidden="true" className="text-subtitle font-extrabold">
          H
        </span>
      </Link>

      {AREAS.map(({ href, nome, Icone }) => {
        const atual = href === atualHref;
        return (
          <Link
            key={href}
            href={href}
            title={nome}
            aria-label={nome}
            aria-current={atual ? "page" : undefined}
            className={cn(
              "size-navItem relative grid place-items-center rounded-sm",
              atual ? "bg-ink text-paper" : "text-inkMuted",
            )}
          >
            <Icone decorative active={atual} className="size-iconNav" />
            {href === "/notificacoes" && naoLidas > 0 ? (
              <span
                aria-label={`${naoLidas} não lidas`}
                role="status"
                className="bg-sun rounded-pill absolute top-1 right-1 size-2"
              />
            ) : null}
          </Link>
        );
      })}

      {/* Criar fica no fim da barra, separado da navegação: são ações, não lugares. */}
      <div className="mt-auto flex flex-col gap-2">
        <Link
          href="/comunidades/nova"
          title="Criar comunidade"
          aria-label="Criar comunidade"
          className="border-line size-navItem box-border grid place-items-center rounded-sm border-2"
        >
          <LevelMark level="community" className="scale-75" />
        </Link>
        <Link
          href="/criar-topico"
          title="Criar tópico"
          aria-label="Criar tópico"
          className="border-line size-navItem box-border grid place-items-center rounded-sm border-2"
        >
          <LevelMark level="topic" className="scale-75" />
        </Link>
      </div>
    </nav>
  );
}
