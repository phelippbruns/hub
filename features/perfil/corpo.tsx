import Link from "next/link";
import { SectionTitle, TopicName } from "@/design/components";
import { haQuantoTempo } from "@/lib/tempo";
import type { ComunidadeNoPerfil, RespostaNoPerfil } from "@/lib/data/perfil";

function numero(valor: number) {
  return valor.toLocaleString("pt-BR");
}

/**
 * A aba Respostas (RN27).
 *
 * Cada item mostra o tópico **e a pergunta** antes da resposta: sem elas, a
 * frase solta não diz nada a quem chegou pelo perfil e não conhece o
 * assunto.
 */
export function AbaRespostas({ itens }: { itens: RespostaNoPerfil[] }) {
  if (itens.length === 0) {
    return <p className="text-body text-inkMuted">Nada por aqui ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {itens.map((item) => (
        <Link
          key={`${item.criouOTopico ? "t" : "r"}-${item.id}`}
          href={`/c/${item.comunidade.slug}/${item.topico.slug}`}
          className="bg-paper flex flex-col gap-1 rounded-sm p-3"
        >
          <span className="text-caption text-inkMuted">
            {/* Abrir um assunto é participação tanto quanto responder. */}
            {item.criouOTopico ? "Criou o tópico " : ""}
            <TopicName>{item.topico.nome}</TopicName>, {item.comunidade.nome}
          </span>

          <span className="text-bodyStrong text-ink">{item.topico.pergunta}</span>

          {item.texto ? <span className="text-body text-ink">{item.texto}</span> : null}

          <span className="text-caption text-inkMuted">{haQuantoTempo(item.quando)}</span>
        </Link>
      ))}
    </div>
  );
}

/** A aba Comunidades: as em comum primeiro, com o selo. */
export function AbaComunidades({ itens }: { itens: ComunidadeNoPerfil[] }) {
  if (itens.length === 0) {
    return <p className="text-body text-inkMuted">Ainda não está em nenhuma comunidade.</p>;
  }

  return (
    <>
      <SectionTitle>
        {numero(itens.length)} {itens.length === 1 ? "comunidade" : "comunidades"}
      </SectionTitle>

      <div className="flex flex-col gap-2">
        {itens.map((comunidade) => (
          <Link
            key={comunidade.id}
            href={`/c/${comunidade.slug}`}
            className="bg-paper flex items-center gap-3 rounded-sm p-3"
          >
            <span
              aria-hidden="true"
              className="size-thumb bg-lavender block shrink-0 rounded-sm bg-cover bg-center"
              style={
                comunidade.coverUrl ? { backgroundImage: `url(${comunidade.coverUrl})` } : undefined
              }
            />
            <span className="min-w-0 flex-1">
              <span className="text-bodyStrong text-ink block truncate">{comunidade.nome}</span>
              <span className="text-caption text-inkMuted block">
                {numero(comunidade.membros)} {comunidade.membros === 1 ? "membro" : "membros"}
              </span>
            </span>

            {comunidade.emComum ? (
              <span className="rounded-pill bg-lavender text-ink text-caption shrink-0 px-2 py-1 font-semibold">
                Em comum
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </>
  );
}
