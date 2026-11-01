/** Mês e ano: o dia exato de uma comunidade não interessa a ninguém. */
function mesEAno(data: Date) {
  return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

/**
 * O cartão Sobre, no topo do Início da comunidade.
 *
 * Título à esquerda e "Criada por @x em mês" à direita na mesma linha, como
 * o protótipo v6 mostra: a autoria é contexto, não manchete.
 *
 * As regras ficam **recolhidas**. Elas importam na hora de entrar e na hora
 * de uma denúncia, não a cada visita — abertas, empurrariam a lista de
 * tópicos para baixo da dobra em toda comunidade que escreveu cinco.
 *
 * **O cartão inteiro some quando não há nada dentro.** Comunidade recém
 * criada não tem sobre nem regras, e um cartão com título e vazio é pior
 * do que cartão nenhum — ali o que a pessoa precisa ver é Primeiros passos.
 */
export function SobreAComunidade({
  about,
  regras,
  criadaPor,
  criadaEm,
}: {
  about: string;
  regras: string[];
  criadaPor: { name: string; handle: string } | null;
  criadaEm: Date;
}) {
  if (!about && regras.length === 0) return null;

  return (
    <section className="bg-paper flex flex-col gap-2 rounded-md p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-subtitle text-ink">Sobre</h2>
        {/*
          Quem criou pode ter saído do Hub: a relação é `SetNull`, e aí a
          linha fala só da data. "Criada por ninguém" seria pior que nada.
        */}
        <span className="text-caption text-inkMuted">
          {criadaPor
            ? `Criada por @${criadaPor.handle} em ${mesEAno(criadaEm)}`
            : `Criada em ${mesEAno(criadaEm)}`}
        </span>
      </div>

      {/* `wrap-anywhere` em todo texto de gente: uma sequência longa sem
          espaço atravessava o cartão e saía pela direita. */}
      {about ? <p className="text-body text-ink wrap-anywhere">{about}</p> : null}

      {regras.length > 0 ? (
        <details className="bg-surfacePage rounded-sm px-3 py-2">
          <summary className="text-label text-ink cursor-pointer">
            {regras.length === 1
              ? "Regra da comunidade"
              : `Regras da comunidade (${regras.length})`}
          </summary>
          <ol className="text-body text-ink mt-2 flex list-decimal flex-col gap-1 pl-4 wrap-anywhere">
            {regras.map((regra) => (
              <li key={regra}>{regra}</li>
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  );
}
