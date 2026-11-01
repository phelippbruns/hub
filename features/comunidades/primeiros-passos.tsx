import Link from "next/link";
import { SectionTitle } from "@/design/components";
import { TopicStar } from "@/design/icons";

/**
 * As três sugestões de tópico de uma comunidade recém-nascida.
 *
 * Genéricas de propósito: elas abrem o formulário com o nome preenchido e
 * quem escreve continua dono dele. Sugestão específica demais vira o tópico
 * de todo mundo, e a comunidade nasce falando de um assunto que ninguém
 * escolheu.
 */
const SUGESTOES = [
  "Apresente-se aqui",
  "O que você está fazendo agora?",
  "Qual foi a primeira vez que você fez isso?",
];

/** Abaixo disto a comunidade ainda não pegou no tranco. */
export const TOPICOS_PARA_SUMIR = 3;

/**
 * Primeiros passos, no Início de uma comunidade com menos de três tópicos.
 *
 * Some sozinho: um bloco de boas-vindas que nunca sai vira moldura, e a
 * comunidade parece sempre vazia mesmo depois de cheia.
 *
 * Só para quem é membro — a RN07 exige participação para criar, e sugerir
 * um caminho que termina em recusa é pior do que não sugerir.
 */
export function PrimeirosPassos({ slug }: { slug: string }) {
  return (
    <section className="border-lavender flex flex-col gap-2 rounded-sm border-2 border-dashed p-3">
      <SectionTitle>Primeiros passos</SectionTitle>
      <p className="text-body text-inkMuted">
        Comunidade nova ganha vida com os primeiros tópicos. Comece por um destes:
      </p>

      <div className="flex flex-col gap-1">
        {SUGESTOES.map((sugestao) => (
          <Link
            key={sugestao}
            /*
              Vai direto para a comunidade com a janela aberta, em vez de
              passar por `/novo` e tomar um redirecionamento. O `/novo`
              continua valendo para quem chega de fora.
            */
            href={`/c/${slug}?novo=1&nome=${encodeURIComponent(sugestao)}`}
            className="bg-surfacePage text-bodyStrong text-ink flex items-center gap-2 rounded-sm p-3"
          >
            <TopicStar className="size-icon" />
            {sugestao}
          </Link>
        ))}
      </div>
    </section>
  );
}
