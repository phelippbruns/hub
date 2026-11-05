import type { ReactNode } from "react";
import { Avatar } from "./avatar";
import { TopicName } from "./topic-name";

/**
 * A abertura do tópico, no cartão escuro da tela 15 (protótipo v6).
 *
 * Separada das contribuições de propósito: a pergunta é o que o tópico é, e
 * as contribuições são o que as pessoas fizeram com ela. Misturar as duas
 * faria a abertura parecer a primeira contribuição.
 *
 * **O nome entra aqui, e não acima do cartão.** Até o protótipo v6 ele era
 * um `<h1>` solto, fora do escuro, e o cartão começava na abertura — o que
 * fazia a pergunta parecer um comentário sobre um título que não se lia
 * junto. Agora os dois são o mesmo bloco, e o olho de seguir mora no canto
 * dele: seguir é sobre a pergunta, não sobre a barra de ferramentas.
 *
 * RN15: pessoas e contribuições sempre visíveis, e são contagens do tópico
 * inteiro. A estrela conta por contribuição e vive no cartão de cada uma;
 * aqui nunca entra, porque o cabeçalho mede participação, não apreço.
 */
export function TopicOpening({
  nome,
  autor,
  abertura,
  pessoas,
  respostas,
  seguir,
  acoes,
}: {
  /** O nome do tópico. É ele que carrega o asterisco. */
  nome?: string;
  /** Quem abriu: o nome, e a foto quando existe. */
  autor?: { nome: string; avatarUrl?: string | null } | string;
  abertura: string;
  pessoas: number;
  respostas: number;
  /** O olho, no canto superior direito do cartão. */
  seguir?: ReactNode;
  /** Compartilhar e afins, quando a tela os coloca no rodapé. */
  acoes?: ReactNode;
}) {
  const numero = (valor: number) => valor.toLocaleString("pt-BR");
  const quem = typeof autor === "string" ? { nome: autor, avatarUrl: null } : autor;

  return (
    <article className="bg-ink text-paper relative flex flex-col gap-2 rounded-md p-3">
      {/*
        O olho é posicionado, e o título reserva o espaço dele com `pr`:
        sem a reserva, um nome longo passa por baixo do botão e as duas
        últimas palavras ficam ilegíveis.
      */}
      {seguir ? <span className="absolute top-2 right-2">{seguir}</span> : null}

      {nome ? (
        <h1 className={`text-title wrap-anywhere ${seguir ? "pr-controlLg" : ""}`}>
          <TopicName>{nome}</TopicName>
        </h1>
      ) : null}

      <p className="text-lead wrap-anywhere">{abertura}</p>

      <div className="border-inkLine flex flex-wrap items-center gap-2 border-t pt-2">
        {quem ? (
          <>
            <Avatar nome={quem.nome} url={quem.avatarUrl} tamanho="sm" tom="claro" />
            <span className="text-caption">{quem.nome}</span>
            <span className="text-caption text-inkMutedOnDark">abriu este tópico</span>
          </>
        ) : null}

        <p className="text-caption text-inkMutedOnDark ml-auto">
          {numero(pessoas)} {pessoas === 1 ? "pessoa" : "pessoas"} · {numero(respostas)}{" "}
          {respostas === 1 ? "contribuição" : "contribuições"}
        </p>

        {acoes ? <span className="flex items-center gap-1">{acoes}</span> : null}
      </div>
    </article>
  );
}
