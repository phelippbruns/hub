import Link from "next/link";
import { EndOfList, SectionTitle, TopicName } from "@/design/components";
import { haQuantoTempo } from "@/lib/tempo";
import type { ComunidadeNoPerfil, RespostaNoPerfil } from "@/lib/data/perfil";

function numero(valor: number) {
  return valor.toLocaleString("pt-BR");
}

/**
 * A aba Contribuições (RN27, RN28).
 *
 * Respostas **e** tópicos criados, na mesma lista: abrir um assunto é
 * participação tanto quanto responder, e separá-los em duas abas faria a
 * pessoa procurar em dois lugares o que ela fez num lugar só. O tópico
 * criado é marcado nos metadados.
 *
 * Cada item mostra o tópico **e a pergunta** antes da resposta: sem elas, a
 * frase solta não diz nada a quem chegou pelo perfil e não conhece o
 * assunto.
 */
export function AbaContribuicoes({
  itens,
  cartao = "bg-paper",
}: {
  itens: RespostaNoPerfil[];
  /** Muda com a cor de fundo escolhida: sobre fundo branco o cartão não é branco. */
  cartao?: string;
}) {
  if (itens.length === 0) {
    return <p className="text-body text-inkMuted">Nada por aqui ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {itens.map((item) => (
        <Link
          key={`${item.criouOTopico ? "t" : "r"}-${item.id}`}
          href={`/c/${item.comunidade.slug}/${item.topico.slug}`}
          className={`${cartao} flex flex-col gap-1 rounded-sm p-3`}
        >
          <span className="text-caption text-inkMuted">
            {item.criouOTopico ? (
              <span className="text-ink font-semibold">Criou o tópico</span>
            ) : null}
            {item.criouOTopico ? " · " : null}
            <TopicName>{item.topico.nome}</TopicName>, {item.comunidade.nome} ·{" "}
            {haQuantoTempo(item.quando)}
          </span>

          <span className="text-bodyStrong text-ink">{item.topico.pergunta}</span>

          {item.texto ? <span className="text-body text-ink">{item.texto}</span> : null}
        </Link>
      ))}

      <EndOfList>Fim das contribuições</EndOfList>
    </div>
  );
}

/**
 * A aba Comunidades.
 *
 * Para o visitante, as em comum vêm num grupo próprio e **primeiro**: o que
 * interessa a quem chega num perfil é onde vocês já se cruzam. Para o dono
 * não existe "em comum" — são todas dele —, então é uma lista só.
 */
export function AbaComunidades({
  itens,
  souEu,
  cartao = "bg-paper",
}: {
  itens: ComunidadeNoPerfil[];
  souEu: boolean;
  cartao?: string;
}) {
  if (itens.length === 0) {
    return <p className="text-body text-inkMuted">Ainda não está em nenhuma comunidade.</p>;
  }

  const emComum = itens.filter((c) => c.emComum);
  const outras = itens.filter((c) => !c.emComum);

  return (
    <div className="flex flex-col gap-2">
      {souEu ? (
        <>
          <SectionTitle>
            {numero(itens.length)} {itens.length === 1 ? "comunidade" : "comunidades"}
          </SectionTitle>
          <Lista itens={itens} cartao={cartao} />
        </>
      ) : (
        <>
          {emComum.length > 0 ? (
            <>
              <SectionTitle>Em comum · {numero(emComum.length)}</SectionTitle>
              <Lista itens={emComum} cartao={cartao} />
            </>
          ) : null}

          {outras.length > 0 ? (
            <>
              <SectionTitle>
                {emComum.length > 0 ? "Outras comunidades" : "Comunidades"}
              </SectionTitle>
              <Lista itens={outras} cartao={cartao} />
            </>
          ) : null}
        </>
      )}

      <EndOfList>
        {itens.length === 1 ? "1 comunidade" : `${numero(itens.length)} comunidades`}
      </EndOfList>
    </div>
  );
}

/**
 * As linhas de comunidade.
 *
 * Sem selo "Em comum": o título do grupo já diz, e repetir a informação em
 * cada linha é ruído. Os cartões dos dois grupos são iguais de propósito.
 */
function Lista({ itens, cartao }: { itens: ComunidadeNoPerfil[]; cartao: string }) {
  return (
    <div className="flex flex-col gap-2">
      {itens.map((comunidade) => (
        <Link
          key={comunidade.id}
          href={`/c/${comunidade.slug}`}
          className={`${cartao} flex items-center gap-3 rounded-sm p-3`}
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
              {numero(comunidade.membros)} {comunidade.membros === 1 ? "pessoa" : "pessoas"} ·{" "}
              {numero(comunidade.topicosAtivos)}{" "}
              {comunidade.topicosAtivos === 1 ? "tópico ativo" : "tópicos ativos"}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
