import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ContentColumn, PageTitle, PaginaCarregando } from "@/design/components";
import { CampoDeMensagem } from "@/features/cabines/campo-de-mensagem";
import { Conversa, type MensagemNaTela } from "@/features/cabines/conversa";
import { MenuDaCabine } from "@/features/cabines/menu";
import { getViewer } from "@/lib/auth/session";
import { cabinePorId, listMessages, marcarCabineComoLida } from "@/lib/data/cabins";
import { ForbiddenError, NotFoundError } from "@/lib/data/errors";
import { haQuantoTempo } from "@/lib/tempo";

type Params = Promise<{ cabine: string }>;

export const metadata: Metadata = { title: "Cabine · Hub" };

/**
 * Tela 20: a conversa.
 *
 * Sem `loading.tsx`: esta rota chama `notFound()`, e `loading.tsx` começa a
 * transmitir a resposta **antes** de a página rodar — o 404 de uma Cabine
 * que não é sua viraria 200. As mensagens, que são a parte lenta, ficam num
 * `<Suspense>` depois da conferência.
 */
export default async function CabinePage({ params }: { params: Params }) {
  const { cabine: cabinId } = await params;
  const viewer = await getViewer();

  let cabine;
  try {
    cabine = await cabinePorId(viewer, cabinId);
  } catch (erro) {
    /*
     * Não participa? 404, não 403.
     *
     * "Você não tem permissão" confirmaria que a Cabine existe — e a RN20
     * diz que ela é privada. Quem está de fora não deve nem descobrir isso.
     */
    if (erro instanceof NotFoundError || erro instanceof ForbiddenError) notFound();
    throw erro;
  }

  // Abrir zera o contador. Sem `await`: marcar não pode atrasar a tela, e se
  // falhar o pior que acontece é o número continuar lá na próxima visita.
  void marcarCabineComoLida(viewer, cabinId);

  return (
    <ContentColumn larga>
      <div className="flex items-center justify-between gap-2">
        <PageTitle>{cabine.nome}</PageTitle>
        <MenuDaCabine
          cabinId={cabine.id}
          participantes={cabine.participantes.map((p) => ({
            id: p.id,
            nome: p.nome,
            handle: p.handle,
            souEu: p.souEu,
          }))}
        />
      </div>

      <Suspense
        fallback={<PaginaCarregando titulo={false} linhas={2} label="Carregando a conversa" />}
      >
        <Mensagens cabinId={cabine.id} />
      </Suspense>

      {cabine.encerrada ? (
        <p className="text-caption text-inkMuted">
          Esta Cabine foi encerrada. Não dá mais para enviar mensagens.
        </p>
      ) : (
        <CampoDeMensagem cabinId={cabine.id} />
      )}
    </ContentColumn>
  );
}

/** As mensagens, que são a consulta cara: uma assinatura por imagem. */
async function Mensagens({ cabinId }: { cabinId: string }) {
  const viewer = await getViewer();
  const mensagens = await listMessages(viewer, cabinId);
  const meuId = viewer.kind === "member" ? viewer.profileId : "";

  const naTela: MensagemNaTela[] = mensagens.map((mensagem) => ({
    id: mensagem.id,
    texto: mensagem.text,
    imagem: mensagem.mediaHref,
    tipoDaMidia: mensagem.mediaKind,
    quando: haQuantoTempo(mensagem.createdAt),
    souAutor: mensagem.authorId === meuId,
    autor: mensagem.author ? { nome: mensagem.author.name, handle: mensagem.author.handle } : null,
    compartilhado: mensagem.compartilhado,
  }));

  return <Conversa cabinId={cabinId} iniciais={naTela} meuId={meuId} />;
}
