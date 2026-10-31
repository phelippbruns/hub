import Link from "next/link";
import { Avatar } from "@/design/components";
import type { PaginaDaComunidade } from "@/lib/data/comunidades";

/**
 * A coluna da direita da página da comunidade: quem está aqui e o que
 * andou acontecendo.
 *
 * **Ela é desta página.** A primeira versão, na F20, era uma rota paralela
 * do app inteiro (`app/(app)/@painel/`) com uma preferência guardada no
 * perfil — 23 telas pagando por uma. Saiu, e está no `vacilos.md`. Esta
 * volta é um `<aside>` e nada mais: nenhuma rota, nenhuma coluna no banco.
 *
 * Por ora traz membros e atividade. Próximo encontro e enquete aberta
 * entram quando eventos e enquetes existirem — bloco que anuncia o que não
 * existe é moldura.
 */
export function ResumoDaComunidade({ comunidade }: { comunidade: PaginaDaComunidade }) {
  const novidade = comunidade.contribuicoesHoje;

  return (
    <aside
      aria-label="Resumo da comunidade"
      data-resumo
      className="min-[1100px]:max-w-contextPanel flex w-full shrink-0 flex-col gap-2"
    >
      <section className="bg-paper flex flex-col gap-2 rounded-md p-3">
        <h2 className="text-label text-inkMuted">
          MEMBROS · {comunidade.membersCount.toLocaleString("pt-BR")}
        </h2>

        {comunidade.primeirosMembros.length > 0 ? (
          <div aria-hidden="true" className="flex flex-wrap gap-1">
            {comunidade.primeirosMembros.map((pessoa, i) => (
              <Avatar key={i} nome={pessoa.nome} url={pessoa.avatarUrl} tamanho="md" />
            ))}
          </div>
        ) : null}

        {/*
          Com `py-1` o link tinha 18 px de altura — menos que o mínimo de
          24 de qualquer diretriz, e difícil de acertar mesmo com o mouse.
          `inline-flex` com altura mínima resolve sem virar botão.
        */}
        <Link
          href={`/c/${comunidade.slug}?aba=membros`}
          className="text-label text-ink min-h-controlSm inline-flex items-center self-start underline underline-offset-2"
        >
          Ver todos
        </Link>
      </section>

      <section className="bg-paper flex flex-col gap-1 rounded-md p-3">
        <h2 className="text-label text-inkMuted">ATIVIDADE</h2>
        <p className="text-body text-ink">
          {novidade > 0
            ? `${novidade.toLocaleString("pt-BR")} ${
                novidade === 1 ? "contribuição" : "contribuições"
              } nas últimas 24 horas`
            : "Nenhuma contribuição nas últimas 24 horas"}
        </p>
        <p className="text-caption text-inkMuted">
          {comunidade.topicosCount.toLocaleString("pt-BR")}{" "}
          {comunidade.topicosCount === 1 ? "tópico" : "tópicos"} ·{" "}
          {comunidade.contribuicoesCount.toLocaleString("pt-BR")}{" "}
          {comunidade.contribuicoesCount === 1 ? "contribuição" : "contribuições"} desde o começo
        </p>
      </section>
    </aside>
  );
}
