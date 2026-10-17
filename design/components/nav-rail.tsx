"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  CabinNavIcon,
  CommunitiesNavIcon,
  CommunityHash,
  ExploreNavIcon,
  HomeNavIcon,
  NotificationsNavIcon,
  ProfileNavIcon,
  SettingsIcon,
  TopicStar,
} from "../icons";
import { LevelMark } from "./level-mark";
import { cn } from "../cn";

/**
 * Barra de navegação lateral, acima de 768 px.
 *
 * Recolhida tem `navRail` e mostra só ícones; com o mouse em cima — ou com o
 * foco do teclado dentro dela — abre para `navRailOpen` e mostra os rótulos.
 * Só ícone obrigava a adivinhar o desenho ou esperar o balãozinho do
 * navegador; rótulo sempre visível comeria a largura do conteúdo o tempo
 * todo. Ela cresce **por cima** da tela, e nada se move embaixo.
 *
 * Tudo em CSS, sem estado: hover e foco são do navegador, e um menu que
 * depende de JavaScript para abrir fica mudo enquanto a página hidrata.
 *
 * O foco que abre é o **de teclado** (`:focus-visible`), não qualquer foco.
 * Com `focus-within`, clicar num item deixava o foco nele: o mouse saía, a
 * barra continuava aberta e ficava por cima da tela que a pessoa acabara
 * de abrir. Quem navega com Tab continua abrindo a barra, que era o motivo
 * da regra existir.
 *
 * **O eixo dos ícones é o mesmo nos dois estados.** Cada linha começa por
 * uma caixa de `navItemBox` com o conteúdo centrado: com o respiro de 16 px
 * da barra, o centro dela cai em 42 px, que é metade de `navRail`. O rótulo
 * entra depois da caixa, então abrir a barra não empurra ícone nenhum.
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
    // A lupa abre Explorar, que lista as comunidades em alta e as sugestões.
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

/**
 * A caixa que fixa o eixo. Tudo que aparece recolhido mora dentro de uma.
 *
 * `shrink-0` porque ela não pode encolher quando o rótulo ao lado for longo:
 * é justamente a largura dela que mantém o ícone no lugar.
 */
function Eixo({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("w-navItemBox grid shrink-0 place-items-center", className)}>
      {children}
    </span>
  );
}

/**
 * O rótulo, que só aparece com a barra aberta.
 *
 * Por opacidade, e não por `hidden`: o leitor de tela continua lendo o texto
 * nos dois estados, e é ele que dá nome ao link — sem isso cada item
 * precisaria de um `aria-label` repetindo o que já está escrito.
 *
 * `whitespace-nowrap` para o texto não quebrar em duas linhas durante os
 * 150 ms em que a barra ainda está estreita.
 */
function Rotulo({ children }: { children: ReactNode }) {
  return (
    <span className="whitespace-nowrap opacity-0 transition-opacity duration-100 ease-in-out group-hover/nav:opacity-100 group-has-[:focus-visible]/nav:opacity-100 motion-reduce:transition-none">
      {children}
    </span>
  );
}

export function NavRail({ temNovidade = false }: { temNovidade?: boolean }) {
  const pathname = usePathname();
  const atualHref = areaAtual(pathname);

  return (
    <nav
      aria-label="Navegação principal"
      /*
       * `absolute` dentro do encaixe de `navRail` que o AppShell desenha: é
       * o que faz a barra aberta passar **por cima** do conteúdo em vez de
       * empurrá-lo. O encaixe é quem segura a coluna e o `sticky`.
       *
       * A borda da direita só ganha cor quando a barra abre — recolhida ela
       * é uma faixa branca sem linha, como na referência. A borda existe
       * sempre, transparente, para aparecer sem mudar a largura de nada.
       */
      className={cn(
        "group/nav bg-paper border-r-line w-navRail hover:w-navRailOpen has-[:focus-visible]:w-navRailOpen",
        "absolute inset-y-0 left-0 flex flex-col gap-1 overflow-hidden border-r border-r-transparent px-3 pb-4",
        "hover:border-r-line has-[:focus-visible]:border-r-line transition-[width] duration-150 ease-in-out",
        "motion-reduce:transition-none",
      )}
      style={{ paddingTop: "max(var(--spacing-5), env(safe-area-inset-top))" }}
    >
      {/* A marca leva ao Início, como em qualquer site. O rótulo é só "Hub":
          o item de navegação logo abaixo já se chama Início, e dois links com
          o mesmo nome na mesma barra confundem quem usa leitor de tela.

          O `{` era a marca do Universo e ficou sem dono quando ele saiu do
          produto na F12.1 (docs/vacilos.md). Agora é a marca do Hub. */}
      <Link
        href="/inicio"
        aria-label="Hub"
        className="text-ink mb-4 flex items-center gap-2 no-underline"
      >
        <Eixo>
          <LevelMark level="universe" />
        </Eixo>
        <span aria-hidden="true" className="text-title">
          <Rotulo>Hub</Rotulo>
        </span>
      </Link>

      {AREAS.map(({ href, nome, Icone }) => {
        const atual = href === atualHref;
        return (
          <Link
            key={href}
            href={href}
            /*
             * O `aria-label` fica, mesmo com o rótulo visível ao lado.
             *
             * Sem ele, o nome do link passa a ser a soma do que há dentro —
             * e em Notificações isso vira "Notificações Há novidade", que
             * muda conforme o dia. O rótulo explícito mantém o nome fixo.
             */
            aria-label={nome}
            aria-current={atual ? "page" : undefined}
            className={cn(
              "rounded-pill text-label h-navItem flex items-center gap-2 font-semibold no-underline",
              atual ? "bg-surfacePage text-ink" : "text-inkMuted hover:bg-surfacePage",
            )}
          >
            <Eixo className="relative">
              <Icone decorative active={atual} className="size-iconNav" />
              {href === "/notificacoes" && temNovidade ? (
                <span
                  /*
                   * "Há novidade", e não um número: o Hub sabe que existe
                   * algo não lido, não quantos. Dizer "1 não lidas" seria
                   * errado em português e impreciso ao mesmo tempo.
                   *
                   * Fica **sempre no canto do sino**, aberta ou fechada a
                   * barra. Antes ele trocava de lugar — canto do ícone
                   * recolhido, fim da linha aberto —, copiado do selo da
                   * referência; o que ele diz não muda com a largura da
                   * barra, e procurar o aviso em dois lugares é trabalho
                   * de quem lê.
                   */
                  aria-label="Há novidade"
                  role="status"
                  className="bg-sun rounded-pill absolute top-0 right-1 size-2"
                />
              ) : null}
            </Eixo>
            <Rotulo>{nome}</Rotulo>
          </Link>
        );
      })}

      {/* Criar fica no fim da barra, separado da navegação: são ações, não
          lugares. Recolhidos são círculos de `control`; abertos viram
          pílula com o nome, **da mesma largura**, sem sair do eixo.

          Cada um leva a cor do seu nível, cheia: tópico em ink com o
          asterisco em paper, comunidade em lavanda com a cerquilha em ink.
          É a mesma regra de cor das marcas do Hub, aplicada ao botão
          inteiro — antes a de comunidade era um selo de 24 px solto dentro
          de um anel vazado de 42, pequeno e fora do centro.

          Os dois ícones têm 24 px, como a engrenagem logo abaixo: três
          tamanhos diferentes em três botões empilhados é o tipo de coisa
          que se vê antes de saber o que é. */}
      <div
        className="mt-auto flex flex-col gap-2"
        /*
         * O recuo que põe o círculo de 42 px no mesmo eixo de 42 px dos
         * ícones: a diferença entre a caixa do eixo e o botão, dividida por
         * dois. Calculado a partir dos tokens, e não escrito como 5px, para
         * continuar certo se alguma das duas medidas mudar.
         */
        style={{ paddingLeft: "calc((var(--spacing-navItemBox) - var(--spacing-control)) / 2)" }}
      >
        <Link
          href="/criar-topico"
          aria-label="Criar tópico"
          className="bg-ink text-paper rounded-pill text-label h-control w-control flex items-center overflow-hidden font-semibold whitespace-nowrap no-underline group-hover/nav:w-full group-has-[:focus-visible]/nav:w-full"
        >
          <span className="size-control grid shrink-0 place-items-center">
            <TopicStar className="size-iconNav" />
          </span>
          <Rotulo>Criar tópico</Rotulo>
        </Link>

        <Link
          href="/comunidades/nova"
          aria-label="Criar comunidade"
          className="bg-lavender text-ink rounded-pill text-label h-control w-control flex items-center overflow-hidden font-semibold whitespace-nowrap no-underline group-hover/nav:w-full group-has-[:focus-visible]/nav:w-full"
        >
          <span className="size-control grid shrink-0 place-items-center">
            <CommunityHash className="size-iconNav" />
          </span>
          <Rotulo>Criar comunidade</Rotulo>
        </Link>
      </div>

      <Link
        href="/configuracoes"
        aria-current={pathname.startsWith("/configuracoes") ? "page" : undefined}
        className={cn(
          "rounded-pill text-label h-navItem mt-3 flex items-center gap-2 font-semibold no-underline",
          pathname.startsWith("/configuracoes")
            ? "bg-surfacePage text-ink"
            : "text-inkMuted hover:bg-surfacePage",
        )}
      >
        <Eixo>
          <SettingsIcon decorative className="size-iconNav" />
        </Eixo>
        <Rotulo>Configurações</Rotulo>
      </Link>
    </nav>
  );
}
