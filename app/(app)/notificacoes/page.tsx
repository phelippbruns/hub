import type { Metadata } from "next";
import Link from "next/link";
import { ContentColumn, EmptyState, PageTitle, SectionTitle } from "@/design/components";
import { getViewer } from "@/lib/auth/session";
import { listarNotificacoes, marcarNotificacoesComoLidas } from "@/lib/data/notificacoes";
import { haQuantoTempo } from "@/lib/tempo";

export const metadata: Metadata = { title: "Notificações · Hub" };

/**
 * Tela 8: a central de notificações.
 *
 * Duas separações, e as duas vêm do protótipo. **Pede atenção** em cima:
 * convite, mensagem, marcação, conteúdo removido — são as que têm alguém do
 * outro lado esperando. Depois, **Agora** e **Ontem**.
 *
 * Abrir marca tudo como lido, e é o que finalmente apaga o ponto do sino —
 * ele existe desde a F11 e nunca teve onde ser apagado.
 */
export default async function NotificacoesPage() {
  const viewer = await getViewer();
  const notificacoes = await listarNotificacoes(viewer);

  // Sem `await`: marcar não pode atrasar a tela, e se falhar o pior que
  // acontece é o ponto continuar lá na próxima visita.
  void marcarNotificacoesComoLidas(viewer);

  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);

  const pedemAtencao = notificacoes.filter((n) => n.pessoal);
  const outras = notificacoes.filter((n) => !n.pessoal);
  const agora = outras.filter((n) => n.quando > ontem);
  const antes = outras.filter((n) => n.quando <= ontem);

  return (
    <ContentColumn>
      <PageTitle>Notificações</PageTitle>

      {notificacoes.length === 0 ? (
        <EmptyState
          title="Nada por aqui"
          description="Avisos sobre o seu tópico, convites de Cabine e quando alguém te marca aparecem nesta tela."
        />
      ) : (
        <>
          {pedemAtencao.length > 0 ? (
            <>
              <SectionTitle>Pedem atenção</SectionTitle>
              <div className="flex flex-col gap-2">
                {pedemAtencao.map((n) => (
                  <Aviso key={n.id} notificacao={n} destacada />
                ))}
              </div>
            </>
          ) : null}

          {agora.length > 0 ? (
            <>
              <SectionTitle>Agora</SectionTitle>
              <div className="flex flex-col gap-2">
                {agora.map((n) => (
                  <Aviso key={n.id} notificacao={n} />
                ))}
              </div>
            </>
          ) : null}

          {antes.length > 0 ? (
            <>
              <SectionTitle>Ontem</SectionTitle>
              <div className="flex flex-col gap-2">
                {antes.map((n) => (
                  <Aviso key={n.id} notificacao={n} />
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </ContentColumn>
  );
}

function Aviso({
  notificacao,
  destacada = false,
}: {
  notificacao: Awaited<ReturnType<typeof listarNotificacoes>>[number];
  destacada?: boolean;
}) {
  const conteudo = (
    <span className="flex items-center gap-2">
      {notificacao.autor ? (
        <span
          aria-hidden="true"
          className="size-avatarMd rounded-pill bg-lavender block shrink-0 bg-cover bg-center"
          style={
            notificacao.autor.avatarUrl
              ? { backgroundImage: `url(${notificacao.autor.avatarUrl})` }
              : undefined
          }
        />
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="text-body text-ink block">{notificacao.texto}</span>
        <span className="text-caption text-inkMuted block">
          {haQuantoTempo(notificacao.quando)}
        </span>
      </span>
    </span>
  );

  /*
   * Destacada em lavanda, e não só com negrito: quem está olhando a lista
   * precisa distinguir "alguém espera você" de "aconteceu algo" antes de
   * ler qualquer texto.
   */
  const classe = destacada ? "bg-lavender block rounded-sm p-3" : "bg-paper block rounded-sm p-3";

  return notificacao.href ? (
    <Link href={notificacao.href} className={classe}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}
