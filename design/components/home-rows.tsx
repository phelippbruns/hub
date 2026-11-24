import Link from "next/link";
import type { ReactNode } from "react";
import { TopicName } from "./topic-name";

function numero(valor: number) {
  return valor.toLocaleString("pt-BR");
}

/**
 * Uma linha do Início, com o nome do tópico em cima e o resto embaixo.
 *
 * As três seções do Início — destaques secundários, tópicos seguidos e
 * minhas interações — têm a mesma forma e mudam só o que vem depois do nome
 * da comunidade. Uma linha só, com o rodapé variável, evita três componentes
 * que divergem no espaçamento sem ninguém notar.
 */
export function HomeRow({
  nome,
  href,
  detalhe,
  destaque,
}: {
  nome: string;
  href: string;
  /** "Música Eletrônica. 19 pessoas, 27 respostas. 3 novas" */
  detalhe: ReactNode;
  /** Quando o número da ponta merece ser lido antes do resto. */
  destaque?: string;
}) {
  return (
    <Link href={href} className="bg-paper flex items-center gap-2 rounded-sm p-2">
      <span className="min-w-0 flex-1">
        <span className="text-bodyStrong text-ink block truncate">
          <TopicName>{nome}</TopicName>
        </span>
        <span className="text-caption text-inkMuted block">{detalhe}</span>
      </span>

      {destaque ? (
        <span className="rounded-pill bg-sun text-ink text-caption shrink-0 px-2 py-1 font-semibold">
          {destaque}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * O que alguém que você segue acabou de fazer.
 *
 * O @ vem antes do verbo porque é por ele que a pessoa é reconhecida — e é
 * um link para o perfil, que é o caminho que o Hub quer que exista: uma
 * resposta desperta interesse, e alguém visita o perfil de quem respondeu.
 */
export function ActivityRow({
  handle,
  oQueFez,
  topico,
  href,
  comunidade,
  quando,
}: {
  handle: string;
  oQueFez: "respondeu" | "criou";
  topico: string;
  href: string;
  comunidade: string;
  quando: string;
}) {
  return (
    <div className="bg-paper flex items-center gap-2 rounded-sm p-2">
      <span className="min-w-0 flex-1">
        <span className="text-body text-ink block truncate">
          <Link href={`/${handle}`} className="font-semibold">
            @{handle}
          </Link>{" "}
          {oQueFez === "respondeu" ? "respondeu em" : "criou"}{" "}
          <Link href={href}>
            <TopicName>{topico}</TopicName>
          </Link>
        </span>
        <span className="text-caption text-inkMuted block">
          {comunidade}, {quando}
        </span>
      </span>
    </div>
  );
}

/**
 * Uma comunidade sugerida a quem ainda não entrou em nenhuma (tela 7).
 *
 * A seta diz que a linha leva a algum lugar: num estado vazio, a pessoa
 * precisa saber que há para onde ir.
 */
/**
 * Uma comunidade sugerida em "Para você".
 *
 * **Ela mostrava o nome do Universo, e o Universo saiu do produto na F12.1.**
 * Como toda comunidade cai no Hubverso, a segunda linha dizia "Hubverso" para
 * todas — o nome de uma coisa que ninguém escolhe e que nenhuma outra tela
 * mostra. A jornada que guarda a F12.1 cobria só o Explorar; o Início nunca
 * foi conferido, e foi por ali que o nome sobreviveu um mês.
 */
export function SuggestionRow({
  nome,
  membros,
  href,
}: {
  nome: string;
  membros: number;
  href: string;
}) {
  return (
    <Link href={href} className="bg-paper flex items-center gap-2 rounded-sm p-3">
      <span className="min-w-0 flex-1">
        <span className="text-bodyStrong text-ink block truncate">{nome}</span>
        <span className="text-caption text-inkMuted block">
          {numero(membros)} {membros === 1 ? "membro" : "membros"}
        </span>
      </span>
      <span aria-hidden="true" className="text-inkMuted text-bodyStrong shrink-0">
        ›
      </span>
    </Link>
  );
}
