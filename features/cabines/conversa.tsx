"use client";

import { Avatar } from "@/design/components";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/design/cn";
import { createClient } from "@/lib/supabase/client";

/**
 * Quem está na conversa, para dar nome a quem chega pelo tempo real.
 *
 * A mesma lista que o cabeçalho desenha: a página já a carregou, e passá-la
 * adiante não custa consulta nenhuma.
 */
export type QuemEstaNaCabine = {
  id: string;
  nome: string;
  handle: string;
  avatarUrl: string | null;
};

export type MensagemNaTela = {
  id: string;
  texto: string | null;
  imagem: string | null;
  tipoDaMidia: "image" | "gif" | null;
  quando: string;
  souAutor: boolean;
  autor: { nome: string; handle: string; avatarUrl: string | null } | null;
  compartilhado: {
    tipo: "comunidade" | "topico";
    nome: string;
    href: string;
    apoio: string;
  } | null;
};

/**
 * A conversa, com as mensagens que chegam sozinhas.
 *
 * **O Realtime não passa pelo Prisma.** O navegador assina a tabela
 * `messages` direto no Supabase, com a chave anônima, e quem autoriza é o
 * RLS (`messages_read_member`): só participante daquela Cabine recebe. É por
 * isso que a política existe desde a F02 — ela não é segunda barreira aqui,
 * é a única.
 *
 * Enviar continua indo por Server Action. A mensagem nasce no servidor,
 * depois da validação, do bloqueio de links e da limpeza da imagem; o
 * Realtime é só o caminho de volta.
 *
 * O que chega pela assinatura é a linha crua do banco: traz `media_url`, que
 * é o **caminho** no depósito, não um endereço assinado. Por isso a mensagem
 * recém-chegada aparece com o texto na hora e a imagem só depois que a
 * revalidação do servidor trouxer o endereço. Assinar no cliente exigiria
 * abrir o depósito, que é justamente o que não se faz.
 */
export function Conversa({
  cabinId,
  iniciais,
  meuId,
  participantes,
}: {
  cabinId: string;
  iniciais: MensagemNaTela[];
  meuId: string;
  /** Quem está na conversa, para resolver o autor do que chega ao vivo. */
  participantes: QuemEstaNaCabine[];
}) {
  const router = useRouter();
  const [mensagens, setMensagens] = useState(iniciais);

  /*
   * As do servidor mandam: elas vêm com o endereço da imagem assinado e com
   * o autor resolvido. Esta linha é o que faz a revalidação consertar o que
   * a assinatura entregou pela metade.
   */
  const [ultimasDoServidor, setUltimasDoServidor] = useState(iniciais);
  if (iniciais !== ultimasDoServidor) {
    setUltimasDoServidor(iniciais);
    setMensagens(iniciais);
  }

  useEffect(() => {
    const supabase = createClient();
    let canal: ReturnType<typeof supabase.channel> | null = null;
    let valeu = true;

    /*
     * A sessão **antes** de assinar.
     *
     * O Realtime é autorizado pelo RLS, e o RLS precisa saber quem está
     * pedindo. Se o canal sobe antes de a sessão ser lida do cookie, ele
     * conecta como anônimo: a assinatura dá certo, não há erro nenhum, e
     * nenhuma mensagem chega — porque a política está fazendo o trabalho
     * dela. Foi exatamente o que aconteceu na primeira tentativa, e é o
     * tipo de falha que não aparece em lugar nenhum.
     */
    void supabase.auth.getSession().then(({ data }) => {
      if (!valeu) return;
      const token = data.session?.access_token;
      if (token) supabase.realtime.setAuth(token);
      canal = assinar(
        supabase,
        cabinId,
        meuId,
        participantes,
        setMensagens,
        () => {
          /*
           * Assinou: buscar de novo o que o servidor tem.
           *
           * Entre a tela abrir e o canal conectar existe uma fresta — ler a
           * sessão do cookie e subir o WebSocket leva tempo. Mensagem enviada
           * nessa fresta **não é reenviada**: o Realtime entrega o que
           * acontece depois da assinatura, e o que passou sumiria até alguém
           * recarregar a página.
           *
           * Uma ida ao servidor ao assinar fecha a fresta, e de quebra traz a
           * imagem assinada e o autor resolvido.
           */
          router.refresh();
        },
        /*
         * Mensagem de quem não está na lista: é alguém que entrou no grupo
         * depois de esta tela abrir. A lista daqui envelheceu, e o servidor
         * é quem sabe — pedir a ele é mais honesto do que escolher um nome.
         */
        () => router.refresh(),
      );
    });

    return () => {
      valeu = false;
      if (canal) void supabase.removeChannel(canal);
    };
  }, [cabinId, meuId, participantes, router]);

  if (mensagens.length === 0) {
    return <p className="text-caption text-inkMuted">Nenhuma mensagem ainda. Diga alguma coisa.</p>;
  }

  return (
    <div className="max-w-contentColumn mx-auto flex w-full flex-col gap-2">
      {mensagens.map((mensagem) => (
        <LinhaDeMensagem key={mensagem.id} mensagem={mensagem} />
      ))}
    </div>
  );
}

/**
 * O autor de uma mensagem recém-chegada, entre quem está na conversa.
 *
 * Devolve `null` quando não acha — e aí a tela **não inventa nome**: ela
 * mostra o texto de reserva e a revalidação do servidor resolve. Acontece
 * com quem entrou no grupo depois de esta tela abrir, que é o único caso em
 * que a lista está velha.
 */
export function quemEnviou(
  participantes: QuemEstaNaCabine[],
  autorId: string | null,
): MensagemNaTela["autor"] {
  if (!autorId) return null;
  const achado = participantes.find((p) => p.id === autorId);
  return achado ? { nome: achado.nome, handle: achado.handle, avatarUrl: achado.avatarUrl } : null;
}

/** Assina os INSERTs daquela Cabine. Só participante recebe, pelo RLS. */
function assinar(
  supabase: ReturnType<typeof createClient>,
  cabinId: string,
  meuId: string,
  participantes: QuemEstaNaCabine[],
  setMensagens: Dispatch<SetStateAction<MensagemNaTela[]>>,
  aoAssinar: () => void,
  /** Chamado quando chega mensagem de alguém que esta tela não conhece. */
  aoNaoConhecer: () => void,
) {
  return supabase
    .channel(`cabine:${cabinId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `cabin_id=eq.${cabinId}`,
      },
      (evento) => {
        const linha = evento.new as {
          id: string;
          text: string | null;
          author_id: string | null;
          media_kind: "image" | "gif" | null;
        };

        const autor = quemEnviou(participantes, linha.author_id);
        const souEu = linha.author_id === meuId;
        if (!souEu && !autor) aoNaoConhecer();

        setMensagens((atuais) => {
          // A própria mensagem já veio pela resposta da action.
          if (atuais.some((m) => m.id === linha.id)) return atuais;

          return [
            ...atuais,
            {
              id: linha.id,
              texto: linha.text,
              // O endereço é assinado no servidor; chega na revalidação.
              imagem: null,
              tipoDaMidia: linha.media_kind,
              quando: "agora",
              souAutor: souEu,
              /*
               * **Resolvido aqui, não esperado do servidor.**
               *
               * O Realtime entrega a linha crua de `messages`, que tem
               * `author_id` e nenhum nome — a tabela não guarda nome. Isto
               * ficava `null`, e a tela caía no texto de reserva: toda
               * mensagem que chegava ao vivo aparecia como "Pessoa que saiu
               * do Hub", com o avatar genérico.
               *
               * Ele se consertava quando o servidor mandasse a lista
               * resolvida — e isso é uma volta à rede, o que tornava o erro
               * um piscar aqui e um nome parado na tela em produção, com o
               * servidor em São Paulo. Medido em 23 de novembro de 2026.
               *
               * Quem está na conversa já está na tela: o cabeçalho desenha
               * os participantes. Resolver contra essa lista não custa
               * consulta nenhuma e não mostra nada que já não esteja ali.
               */
              autor,
              compartilhado: null,
            },
          ];
        });
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") aoAssinar();
    });
}

function LinhaDeMensagem({ mensagem }: { mensagem: MensagemNaTela }) {
  const nome = mensagem.souAutor ? "Você" : (mensagem.autor?.nome ?? "Pessoa que saiu do Hub");
  const minha = mensagem.souAutor;

  /*
   * Balão, e não cartão.
   *
   * O meu à direita em lavender, o das outras pessoas à esquerda em paper:
   * é o formato que qualquer pessoa já sabe ler sem explicação, e o lado
   * diz de quem é antes do nome. A conversa deixa de parecer uma lista de
   * respostas de tópico, que é o que ela era.
   *
   * A largura para em 72%: balão que atravessa a tela inteira perde a
   * silhueta que faz a conversa ser legível de longe.
   */
  return (
    <article className={cn("flex items-end gap-2", minha && "flex-row-reverse")}>
      {minha ? null : <Avatar nome={nome} url={mensagem.autor?.avatarUrl} tamanho="md" />}

      <div className={cn("flex max-w-[72%] min-w-0 flex-col gap-1", minha && "items-end")}>
        <span className={cn("text-caption text-inkMuted px-1", minha && "text-right")}>
          {minha ? null : <b className="text-label text-ink mr-1 font-bold">{nome}</b>}
          {mensagem.quando}
        </span>

        {mensagem.texto ? (
          <p
            className={cn(
              "text-body text-ink rounded-sm px-3 py-2 wrap-anywhere",
              minha ? "bg-lavender" : "bg-paper",
            )}
          >
            {mensagem.texto}
          </p>
        ) : null}

        {mensagem.imagem ? (
          /*
           * `<img>` e não `next/image`, pelo mesmo motivo da resposta: a URL
           * é assinada e expira em dez minutos, então o cache do otimizador
           * nunca acerta e uma URL vencida serviria erro no lugar da imagem.
           *
           * `self-start` porque a coluna é flex, e item de flex em coluna
           * estica na largura — foi assim que o GIF da resposta saiu
           * espichado em produção.
           */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mensagem.imagem}
            alt={mensagem.tipoDaMidia === "gif" ? `GIF de ${nome}` : `Imagem de ${nome}`}
            // Conversa longa é muita imagem acima do que se está lendo.
            loading="lazy"
            decoding="async"
            className={cn(
              "block h-auto w-auto max-w-full rounded-sm",
              minha ? "self-end" : "self-start",
            )}
          />
        ) : null}

        {/*
          RN25: cartão de comunidade ou tópico compartilhado. Criar um vem da
          F14; aqui a conversa sabe desenhar o que já existir.
        */}
        {mensagem.compartilhado ? (
          <Link
            href={mensagem.compartilhado.href}
            className="bg-paper border-line box-border flex flex-col gap-1 rounded-sm border p-2"
          >
            <span className="text-bodyStrong text-ink">{mensagem.compartilhado.nome}</span>
            <span className="text-caption text-inkMuted">{mensagem.compartilhado.apoio}</span>
          </Link>
        ) : null}
      </div>
    </article>
  );
}
