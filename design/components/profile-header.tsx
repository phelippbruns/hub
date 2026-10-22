import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "./avatar";
import { CopyLinkIcon } from "../icons";
import type { Enquadramento } from "@/lib/midia/enquadramento";

function numero(valor: number) {
  return valor.toLocaleString("pt-BR");
}

export type LinkDoPerfil = { title: string; url: string };

/**
 * O topo do perfil: foto, @, nome, seguidores, descrição, links e
 * indicadores (RN27).
 *
 * Alinhado à esquerda, com as ações soltas no canto superior direito — é o
 * desenho da v3. O **@ vem primeiro e grande**, e o nome real embaixo em
 * corpo de texto: no Hub a pessoa é encontrada e marcada pelo @, e ele é
 * que precisa ser lido de longe.
 *
 * **Seguidores é texto, não link** (RN28), e some por inteiro quando a
 * pessoa escondeu — aí `seguidores` chega nulo, porque o número nem é
 * consultado no servidor.
 */
export function ProfileHeader({
  nome,
  handle,
  bio,
  avatarUrl,
  enquadramento,
  medidasDaFoto,
  seguidores,
  seguidoresHref,
  seguindo,
  links = [],
  contribuicoes,
  comunidades,
  acoes,
}: {
  nome: string;
  handle: string;
  bio: string | null;
  avatarUrl: string | null;
  enquadramento?: Enquadramento;
  medidasDaFoto?: { largura: number; altura: number } | null;
  /** `null` quando a pessoa escondeu: o número não chega nem ao HTML. */
  seguidores: number | null;
  /**
   * Para onde o número de seguidores leva, quando leva.
   *
   * RN28: **só no perfil próprio.** No perfil de outra pessoa ele continua
   * sendo número sem lista — ali a lista existiria para comparar perfis,
   * que é o que o Princípio 2 recusa. No seu, são as pessoas que
   * escolheram te acompanhar, e isso é seu dado.
   */
  seguidoresHref?: string;
  seguindo?: ReactNode;
  links?: LinkDoPerfil[];
  contribuicoes: number;
  comunidades: number;
  /** As ações do canto superior direito. */
  acoes?: ReactNode;
}) {
  return (
    <div className="relative flex flex-col gap-3">
      {/*
        As ações flutuam no canto. `pr` no cabeçalho reserva o lugar delas:
        sem isso, um @ comprido passa por baixo dos botões.
      */}
      {acoes ? <div className="absolute top-0 right-0 flex gap-2">{acoes}</div> : null}

      <div className="pr-navRailOpen flex flex-wrap items-center gap-3">
        <Avatar
          nome={nome}
          url={avatarUrl}
          tamanho="perfil"
          enquadramento={enquadramento}
          medidas={medidasDaFoto}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {/*
            O @ é o `h1` da tela, no perfil próprio e no dos outros.
            Havia um "Perfil" acima dele no perfil próprio, e ele dizia
            menos do que o @ que vinha logo abaixo — a tela inteira já é o
            perfil. Tirar o título deixaria a página sem âncora para quem
            usa leitor de tela, então o @ assume o posto.
          */}
          <h1 className="text-title text-ink">{handle}</h1>
          <span className="text-body text-ink">{nome}</span>

          {seguidores === null && !seguindo ? null : (
            <span className="text-caption text-inkMuted mt-1 flex flex-wrap items-center gap-1">
              {seguidores === null ? null : seguidoresHref ? (
                <Link href={seguidoresHref} className="underline underline-offset-2">
                  {numero(seguidores)} {seguidores === 1 ? "seguidor" : "seguidores"}
                </Link>
              ) : (
                <span>
                  {numero(seguidores)} {seguidores === 1 ? "seguidor" : "seguidores"}
                </span>
              )}
              {seguidores !== null && seguindo ? <span aria-hidden="true">·</span> : null}
              {seguindo}
            </span>
          )}
        </div>
      </div>

      {bio ? <p className="text-body text-ink max-w-contentColumn">{bio}</p> : null}

      <PerfilLinks links={links} />

      {/*
        Uma linha de texto, não três caixas (RN28). As caixas davam a
        aparência de placar a dois números que medem participação, e o
        princípio da rede é participação e não popularidade.
      */}
      <div className="text-caption text-inkMuted flex flex-wrap gap-3">
        <span>
          <b className="text-bodyStrong text-ink">{numero(contribuicoes)}</b>{" "}
          {contribuicoes === 1 ? "contribuição" : "contribuições"}
        </span>
        <span>
          <b className="text-bodyStrong text-ink">{numero(comunidades)}</b>{" "}
          {comunidades === 1 ? "comunidade" : "comunidades"}
        </span>
      </div>
    </div>
  );
}

/**
 * A fileira de links do perfil (RN16, RN27).
 *
 * **É o único lugar do Hub com link para fora**, e por isso o único que abre
 * em outra aba. `noopener` e `noreferrer` sempre: sem `noopener`, a página
 * aberta pode mexer na aba que a abriu; sem `noreferrer`, o destino fica
 * sabendo de qual perfil a pessoa veio.
 */
export function PerfilLinks({ links }: { links: LinkDoPerfil[] }) {
  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {links.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-bodyStrong text-ink inline-flex items-center gap-1 underline underline-offset-2"
        >
          <CopyLinkIcon decorative className="size-iconSm" />
          {link.title}
        </a>
      ))}
    </div>
  );
}
