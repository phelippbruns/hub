import { SectionTitle } from "@/design/components";

/** Mês e ano: o dia exato de uma comunidade não interessa a ninguém. */
function mesEAno(data: Date) {
  return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

/**
 * O cartão Sobre, no topo do Início da comunidade.
 *
 * As regras ficam **recolhidas**. Elas importam na hora de entrar e na hora
 * de uma denúncia, não a cada visita — abertas, empurrariam a lista de
 * tópicos para baixo da dobra em toda comunidade que se deu ao trabalho de
 * escrever cinco.
 *
 * Quem entra numa comunidade com regras já as leu: a porta abre a folha
 * antes de deixar entrar. Aqui elas continuam ao alcance de quem quiser
 * reler.
 */
export function SobreAComunidade({
  intro,
  regras,
  criadaPor,
  criadaEm,
}: {
  intro: string;
  regras: string[];
  criadaPor: { name: string; handle: string } | null;
  criadaEm: Date;
}) {
  return (
    <section className="bg-paper flex flex-col gap-2 rounded-sm p-3">
      <SectionTitle>Sobre</SectionTitle>

      <p className="text-body text-ink">{intro}</p>

      {regras.length > 0 ? (
        <details className="bg-surfacePage rounded-sm px-3 py-2">
          <summary className="text-label text-ink cursor-pointer">
            {regras.length === 1
              ? "Regra da comunidade"
              : `Regras da comunidade (${regras.length})`}
          </summary>
          <ol className="text-body text-ink mt-2 flex list-decimal flex-col gap-1 pl-4">
            {regras.map((regra) => (
              <li key={regra}>{regra}</li>
            ))}
          </ol>
        </details>
      ) : null}

      {/*
        Quem criou pode ter saído do Hub: a relação é `SetNull`, e aí a
        linha fala só da data. Escrever "Criada por ninguém" seria pior do
        que não escrever.
      */}
      <p className="text-caption text-inkMuted">
        {criadaPor
          ? `Criada por @${criadaPor.handle} em ${mesEAno(criadaEm)}`
          : `Criada em ${mesEAno(criadaEm)}`}
      </p>
    </section>
  );
}
