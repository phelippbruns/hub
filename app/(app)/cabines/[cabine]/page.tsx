import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PaginaCarregando } from "@/design/components";
import { CabecalhoDaCabine } from "@/features/cabines/cabecalho";
import { CampoDeMensagem } from "@/features/cabines/campo-de-mensagem";
import { Conversa, type MensagemNaTela } from "@/features/cabines/conversa";
import { ListaDeCabines } from "@/features/cabines/lista";
import { MenuDaCabine } from "@/features/cabines/menu";
import { getViewer } from "@/lib/auth/session";
import { cabinePorId, listarCabines, listMessages, marcarCabineComoLida } from "@/lib/data/cabins";
import { ForbiddenError, NotFoundError } from "@/lib/data/errors";
import { haQuantoTempo } from "@/lib/tempo";

type Params = Promise<{ cabine: string }>;

export const metadata: Metadata = { title: "Cabine · Hub" };

/**
 * Tela 20: a conversa, com a lista ao lado.
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

  // A lista da esquerda é a mesma da tela 17. Vem depois da conferência de
  // acesso: quem não participa nem chega aqui.
  const { convites, enviados, cabines } = await listarCabines(viewer);

  // Abrir zera o contador. Sem `await`: marcar não pode atrasar a tela, e se
  // falhar o pior que acontece é o número continuar lá na próxima visita.
  void marcarCabineComoLida(viewer, cabinId);

  return (
    <div className="flex min-h-screen">
      <ListaDeCabines
        convites={convites.map((convite) => ({
          id: convite.id,
          nome: convite.quem.nome,
          mensagem: convite.mensagem ?? "Quer conversar com você",
          avatarUrl: convite.quem.avatarUrl,
        }))}
        enviados={enviados.map((convite) => ({ id: convite.id, paraQuem: convite.paraQuem }))}
        conversas={cabines.map((daLista) => ({
          id: daLista.id,
          nome: daLista.nome,
          previa: daLista.previa ?? "Sem mensagens ainda",
          quando: daLista.quando ? haQuantoTempo(daLista.quando) : "",
          naoLidas: daLista.naoLidas,
        }))}
      />

      {/* `region` com nome: é o que separa, para quem lê a tela e para os
          testes, a conversa aberta da lista que ficou ao lado. */}
      <section aria-label="Conversa" className="flex min-w-0 flex-1 flex-col">
        <CabecalhoDaCabine
          nome={cabine.nome}
          participantes={cabine.participantes.map((p) => ({
            id: p.id,
            nome: p.nome,
            avatarUrl: p.avatarUrl,
          }))}
          menu={
            <MenuDaCabine
              cabinId={cabine.id}
              participantes={cabine.participantes.map((p) => ({
                id: p.id,
                nome: p.nome,
                handle: p.handle,
                souEu: p.souEu,
              }))}
            />
          }
        />

        <div className="flex flex-1 flex-col gap-2 px-5 py-4">
          <Suspense
            fallback={<PaginaCarregando titulo={false} linhas={2} label="Carregando a conversa" />}
          >
            <Mensagens cabinId={cabine.id} />
          </Suspense>
        </div>

        {/*
          O campo gruda no fim da janela: numa conversa comprida, descer
          para escrever e subir para ler seria o caminho de todo dia.
        */}
        <div className="bg-surfacePage sticky bottom-0 px-5 pt-3 pb-4">
          {cabine.encerrada ? (
            <p className="max-w-contentColumn text-caption text-inkMuted mx-auto text-center">
              Esta Cabine foi encerrada. Não dá mais para enviar mensagens.
            </p>
          ) : (
            <CampoDeMensagem cabinId={cabine.id} />
          )}
        </div>
      </section>
    </div>
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
    autor: mensagem.author
      ? {
          nome: mensagem.author.name,
          handle: mensagem.author.handle,
          avatarUrl: mensagem.author.avatarUrl,
        }
      : null,
    compartilhado: mensagem.compartilhado,
  }));

  return <Conversa cabinId={cabinId} iniciais={naTela} meuId={meuId} />;
}
