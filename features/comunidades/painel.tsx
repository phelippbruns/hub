import Link from "next/link";
import { SectionTitle } from "@/design/components";
import type { PaginaDaComunidade, TopicoNaComunidade } from "@/lib/data/comunidades";

function numero(valor: number) {
  return valor.toLocaleString("pt-BR");
}

function Contagem({ topico }: { topico: TopicoNaComunidade }) {
  return (
    <span className="text-caption text-inkMuted block">
      {numero(topico.pessoas)} {topico.pessoas === 1 ? "pessoa" : "pessoas"},{" "}
      {numero(topico.respostas)} {topico.respostas === 1 ? "resposta" : "respostas"}
    </span>
  );
}

/**
 * O painel da direita da página da comunidade (tela 14).
 *
 * Fica visível em todos os estados da tela — busca, compartilhar, menu — e é
 * por isso que ele é uma rota paralela, e não parte do conteúdo: abrir uma
 * folha não pode fazê-lo sumir.
 */
export function PainelDaComunidade({
  comunidade,
  seguidos,
}: {
  comunidade: PaginaDaComunidade;
  seguidos: TopicoNaComunidade[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <SectionTitle>Sobre a comunidade</SectionTitle>
      <p className="text-body text-ink">{comunidade.intro}</p>
      <p className="text-caption text-inkMuted">
        {numero(comunidade.membersCount)} {comunidade.membersCount === 1 ? "membro" : "membros"} em{" "}
        <Link href={`/u/${comunidade.universo.slug}`} className="underline">
          {comunidade.universo.name}
        </Link>
        .
      </p>

      <SectionTitle>Como o Hot Topic funciona</SectionTitle>
      <p className="text-caption text-inkMuted">
        O ciclo vira às 00h. O tópico com mais pessoas diferentes respondendo fica no topo no dia
        seguinte. O destaque não vence dois ciclos seguidos.
      </p>

      {seguidos.length > 0 ? (
        <>
          <SectionTitle>Tópicos que você segue aqui</SectionTitle>
          <div className="flex flex-col gap-2">
            {seguidos.map((topico) => (
              <Link key={topico.id} href={`/topico/${topico.id}`} className="block">
                <span className="text-bodyStrong text-ink block truncate">{topico.name}</span>
                <Contagem topico={topico} />
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
