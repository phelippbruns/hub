import Link from "next/link";
import { ContentColumn, LevelMark, PageTitle, TopicName } from "@/design/components";
import { sizes, variants } from "@/design/components/button";
import { cn } from "@/design/cn";

/**
 * A tela 2: o que quem **não tem conta** vê ao abrir um link compartilhado.
 *
 * RN16: vê a comunidade e o tópico, nunca as respostas.
 *
 * O desfoque é **conteúdo de exemplo**, escrito aqui. Não é o texto real com
 * um filtro em cima: um filtro é cortina, e o texto estaria no HTML, a um
 * "ver código-fonte" de distância. O servidor nunca manda resposta de
 * verdade para quem não tem conta — a camada de dados devolve `null`, e esta
 * tela não teria o que esconder mesmo se quisesse.
 */

const EXEMPLOS = [
  "Conteúdo disponível depois do cadastro, com texto de exemplo para o desfoque.",
  "Conteúdo disponível depois do cadastro.",
  "Conteúdo disponível depois do cadastro, com um pouco mais de texto para variar a altura.",
];

export function TelaDeConvite({
  comunidade,
  topico,
  compartilhadoPor,
}: {
  comunidade: {
    nome: string;
    slug: string;
    intro: string;
    membros: number;
    capaUrl: string | null;
  };
  /** Sem tópico, o link era da comunidade: a tela mostra só ela. */
  topico?: { nome: string; abertura: string; respostas: number; pessoas: number };
  /** O `@` de quem compartilhou, quando o link traz. */
  compartilhadoPor?: string;
}) {
  return (
    <ContentColumn>
      {comunidade.capaUrl ? (
        <span
          aria-hidden="true"
          className="h-cover block w-full rounded-sm bg-cover bg-center"
          style={{ backgroundImage: `url(${comunidade.capaUrl})` }}
        />
      ) : (
        <span aria-hidden="true" className="h-cover bg-lavender block w-full rounded-sm" />
      )}

      <PageTitle>{comunidade.nome}</PageTitle>

      <p className="text-caption text-inkMuted flex items-center gap-2">
        <LevelMark level="community" />
        {comunidade.membros.toLocaleString("pt-BR")}{" "}
        {comunidade.membros === 1 ? "membro" : "membros"}
        {compartilhadoPor ? (
          <span>
            · Compartilhado por <span className="text-ink font-semibold">@{compartilhadoPor}</span>
          </span>
        ) : null}
      </p>

      <p className="text-body text-ink">{comunidade.intro}</p>

      {topico ? (
        <>
          <h2 className="text-subtitle text-ink">
            <TopicName>{topico.nome}</TopicName>
          </h2>
          <p className="text-body text-ink">{topico.abertura}</p>

          {/*
            As respostas de mentira, embaçadas. `aria-hidden` porque leitor de
            tela não deve ler texto de enfeite como se fosse conversa — quem
            não enxerga receberia três frases falsas no lugar do convite.
          */}
          <div aria-hidden="true" className="flex flex-col gap-2 blur-sm select-none">
            {EXEMPLOS.map((exemplo, i) => (
              <span key={i} className="bg-paper flex flex-col gap-1 rounded-sm p-2">
                <span className="text-bodyStrong text-ink">Pessoa</span>
                <span className="text-body text-ink">{exemplo}</span>
              </span>
            ))}
          </div>

          <p className="text-bodyStrong text-ink">
            {topico.respostas.toLocaleString("pt-BR")}{" "}
            {topico.respostas === 1 ? "resposta" : "respostas"} de{" "}
            {topico.pessoas.toLocaleString("pt-BR")} {topico.pessoas === 1 ? "pessoa" : "pessoas"}
          </p>
        </>
      ) : null}

      <div className="flex flex-col items-start gap-2">
        <Link
          href="/criar-conta"
          className={cn("rounded-pill inline-block", variants.primary, sizes.md)}
        >
          {topico ? "Criar conta para ver as respostas" : "Criar conta para participar"}
        </Link>
        <p className="text-caption text-inkMuted">
          Já tem conta?{" "}
          <Link href="/entrar" className="text-ink font-semibold underline">
            Entrar
          </Link>
        </p>
      </div>
    </ContentColumn>
  );
}
