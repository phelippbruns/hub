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
  seguindo,
  links = [],
  contribuicoes,
  comunidades,
  acoes,
  comoTitulo = false,
}: {
  nome: string;
  handle: string;
  bio: string | null;
  avatarUrl: string | null;
  enquadramento?: Enquadramento;
  medidasDaFoto?: { largura: number; altura: number } | null;
  /** `null` quando a pessoa escondeu: o número não chega nem ao HTML. */
  seguidores: number | null;
  seguindo?: ReactNode;
  links?: LinkDoPerfil[];
  contribuicoes: number;
  comunidades: number;
  /** As ações do canto superior direito. */
  acoes?: ReactNode;
  /**
   * Quando o @ **é** o título da tela.
   *
   * No perfil de outra pessoa o protótipo não repete nada num título acima:
   * o @ já é o título. Mas a tela precisa de um `h1`, senão quem usa leitor
   * de tela perde a âncora da página.
   */
  comoTitulo?: boolean;
}) {
  const Identificador = comoTitulo ? "h1" : "span";

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
          <Identificador className="text-title text-ink">{handle}</Identificador>
          <span className="text-body text-ink">{nome}</span>

          {seguidores === null && !seguindo ? null : (
            <span className="text-caption text-inkMuted mt-1 flex flex-wrap items-center gap-1">
              {seguidores === null ? null : (
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
