import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar, ContentColumn, PageTitle, SectionTitle } from "@/design/components";
import { AcoesDoConvite } from "@/features/cabines/acoes-do-convite";
import { getViewer } from "@/lib/auth/session";
import { convitePorId } from "@/lib/data/cabins";
import { NotFoundError } from "@/lib/data/errors";

export const metadata: Metadata = { title: "Convite para Cabine · Hub" };

/**
 * Tela 19: o convite.
 *
 * Mostra as comunidades em comum porque é o que explica **por que** aquela
 * pessoa pôde te convidar (RN21). Sem isso o convite chega do nada.
 */
export default async function ConvitePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  if (!id) notFound();

  const viewer = await getViewer();

  let convite;
  try {
    convite = await convitePorId(viewer, id);
  } catch (erro) {
    if (erro instanceof NotFoundError) notFound();
    throw erro;
  }

  return (
    <ContentColumn>
      <PageTitle>Convite</PageTitle>

      <div className="bg-paper flex flex-col items-center gap-3 rounded-md p-5 text-center">
        <Avatar nome={convite.quem.nome} url={convite.quem.avatarUrl} tamanho="xl" />

        <h2 className="text-subtitle text-ink">{convite.quem.nome} quer conversar com você</h2>

        {convite.mensagem ? <p className="text-body text-ink">{convite.mensagem}</p> : null}

        {convite.emComum.length > 0 ? (
          <div className="flex flex-col items-center gap-1">
            <SectionTitle>Comunidades em comum</SectionTitle>
            <p className="text-caption text-inkMuted">
              {convite.emComum.map((comunidade) => comunidade.name).join(", ")}
            </p>
          </div>
        ) : null}

        <AcoesDoConvite
          inviteId={convite.id}
          quemId={convite.quem.id}
          primeiroNome={convite.quem.primeiroNome}
        />
      </div>
    </ContentColumn>
  );
}
