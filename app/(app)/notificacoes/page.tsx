import type { Metadata } from "next";
import { after } from "next/server";
import { Avatar, ContentColumn, EmptyState, PageTitle, SectionTitle } from "@/design/components";
import { getViewer } from "@/lib/auth/session";
import {
  centralDeNotificacoes,
  marcarNotificacoesComoLidas,
  type NotificacaoNaTela,
} from "@/lib/data/notificacoes";
import { convitesParaModerar } from "@/lib/data/moderacao";
import { ConvitesParaModerar } from "@/features/moderacao/convites";
import { AvisoClicavel } from "@/features/notificacoes/aviso";
import { haQuantoTempo } from "@/lib/tempo";

export const metadata: Metadata = { title: "Notificações · Hub" };

/**
 * Tela 8: a central de notificações.
 *
 * **Duas áreas**, e as duas vêm da correção do PO de 4 de novembro.
 *
 * **Só para te avisar**, em cima: convite, mensagem, marcação, conteúdo
 * removido — as que têm alguém do outro lado. Cada uma sai daqui **quando
 * é clicada**, não quando a central é aberta: abrir não é atender, e com
 * dois avisos a pessoa atende um e deixa o outro.
 *
 * **Essa semana**, embaixo: o que chegou desde o último domingo, no máximo
 * cinco. Era "Agora" e "Ontem", duas áreas separadas por dia — e cada linha
 * já escreve "há 1 dia", "há 4 dias", então a separação repetia o texto e
 * ainda criava o caso de um aviso de hoje pertencer às duas.
 *
 * Nada é apagado: a janela é da tela. Aviso de moderação é registro.
 */
export default async function NotificacoesPage() {
  const viewer = await getViewer();
  const { paraTeAvisar, naSemana } = await centralDeNotificacoes(viewer);
  // Convite de moderação precisa de resposta, e o aviso sozinho não tem
  // onde responder: ele aparece em cima, com os dois botões.
  const convites = viewer.kind === "member" ? await convitesParaModerar(viewer) : [];

  /*
   * Marcar como lido é o que apaga o ponto do sino, e não pode atrasar a
   * tela — mas **também não pode ser descartado**.
   *
   * Era `void marcarNotificacoesComoLidas(viewer)`: uma promessa solta num
   * Server Component, que o Next pode encerrar junto com a resposta. Quando
   * isso acontecia, o ponto continuava aceso numa tela recém-lida. `after()`
   * roda depois de a resposta ser enviada, e é esperado.
   */
  if (viewer.kind === "member") {
    after(async () => {
      await marcarNotificacoesComoLidas(viewer);
    });
  }

  return (
    <ContentColumn>
      <PageTitle>Notificações</PageTitle>

      <ConvitesParaModerar
        convites={convites.map((c) => ({ id: c.id, comunidade: c.community.name }))}
      />

      {paraTeAvisar.length === 0 && naSemana.length === 0 && convites.length === 0 ? (
        <EmptyState
          title="Nada por aqui"
          description="Avisos sobre o seu tópico, convites de Cabine e quando alguém te marca aparecem nesta tela."
        />
      ) : (
        <>
          {paraTeAvisar.length > 0 ? (
            <>
              <SectionTitle>Só para te avisar</SectionTitle>
              {/*
                `data-para-te-avisar` é gancho de teste, como o
                `data-resumo` da comunidade: o aviso atendido **desce** para
                a semana em vez de sumir, e lá ele continua sendo um link
                com o mesmo texto. Sem um gancho, contar "quantos avisos de
                marcação existem na tela" conta os dois, e a jornada que
                prova "um saiu do topo" não teria como olhar só o topo.
              */}
              <div data-para-te-avisar className="flex flex-col gap-2">
                {paraTeAvisar.map((n) => (
                  <Aviso key={n.id} notificacao={n} destacada />
                ))}
              </div>
            </>
          ) : null}

          {naSemana.length > 0 ? (
            <>
              <SectionTitle>Essa semana</SectionTitle>
              <div className="flex flex-col gap-2">
                {naSemana.map((n) => (
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
  notificacao: NotificacaoNaTela;
  destacada?: boolean;
}) {
  const conteudo = (
    <span className="flex items-center gap-2">
      {notificacao.autor ? (
        <Avatar nome={notificacao.autor.nome} url={notificacao.autor.avatarUrl} tamanho="lg" />
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

  /*
   * Com destino, o aviso é clicável **e** se marca como atendido ao ser
   * clicado — por isso passa por um componente de cliente. Sem destino,
   * continua um bloco de texto: não há para onde ir.
   */
  return notificacao.href ? (
    <AvisoClicavel id={notificacao.id} href={notificacao.href} className={classe}>
      {conteudo}
    </AvisoClicavel>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}
