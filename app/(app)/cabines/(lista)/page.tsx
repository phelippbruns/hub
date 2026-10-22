import type { Metadata } from "next";
import { ListaDeCabines } from "@/features/cabines/lista";
import { getViewer } from "@/lib/auth/session";
import { listarCabines } from "@/lib/data/cabins";
import { haQuantoTempo } from "@/lib/tempo";

export const metadata: Metadata = { title: "Cabines · Hub" };

/**
 * Tela 17: a Cabine sem conversa aberta.
 *
 * A lista fica numa coluna fixa à esquerda, do lado de onde a conversa vai
 * abrir — é o formato que qualquer aplicativo de mensagens usa, e evita
 * sair da lista para ler e voltar para a lista para trocar de conversa.
 *
 * Convites em cima, conversas embaixo. A ordem não é estética: o convite é
 * a única coisa aqui que **espera uma resposta sua**, e a RN22 diz que ele
 * fica aberto até você responder.
 */
export default async function CabinesPage() {
  const viewer = await getViewer();
  const { convites, enviados, cabines } = await listarCabines(viewer);

  return (
    <div className="flex min-h-screen">
      <ListaDeCabines
        convites={convites.map((convite) => ({
          id: convite.id,
          nome: convite.quem.nome,
          mensagem: convite.mensagem ?? "Quer conversar com você",
          avatarUrl: convite.quem.avatarUrl,
        }))}
        enviados={enviados.map((convite) => ({
          id: convite.id,
          cabinId: convite.cabinId,
          paraQuem: convite.paraQuem,
        }))}
        conversas={cabines.map((cabine) => ({
          id: cabine.id,
          nome: cabine.nome,
          previa: cabine.previa ?? "Sem mensagens ainda",
          quando: cabine.quando ? haQuantoTempo(cabine.quando) : "",
          naoLidas: cabine.naoLidas,
        }))}
      />

      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 p-5 text-center">
        <p className="text-subtitle text-ink">Escolha uma conversa</p>
        <p className="text-body text-inkMuted">
          {/* RN20: desde a rodada de acabamento a Cabine tem dois começos, e
              este texto só contava um deles. */}
          Abra o perfil de alguém e toque na Cabine. Com quem se segue com você, a conversa começa
          na hora; com as outras, vai um convite.
        </p>
      </div>
    </div>
  );
}
