import type { Metadata } from "next";
import Link from "next/link";
import { ContentColumn, EmptyState, PageTitle, SectionTitle } from "@/design/components";
import { sizes, variants } from "@/design/components/button";
import { cn } from "@/design/cn";
import { ConviteEnviado } from "@/features/cabines/convite-enviado";
import { getViewer } from "@/lib/auth/session";
import { listarCabines } from "@/lib/data/cabins";
import { haQuantoTempo } from "@/lib/tempo";

export const metadata: Metadata = { title: "Cabines · Hub" };

/**
 * Tela 17: a lista de Cabines.
 *
 * Convites em cima, conversas embaixo. A ordem não é estética: o convite é
 * a única coisa aqui que **espera uma resposta sua**, e a RN22 diz que ele
 * fica aberto até você responder.
 */
export default async function CabinesPage() {
  const viewer = await getViewer();
  const { convites, enviados, cabines } = await listarCabines(viewer);

  return (
    <ContentColumn>
      <div className="flex items-baseline justify-between gap-2">
        <PageTitle>Cabines</PageTitle>
        <Link
          href="/cabines/nova"
          className={cn("rounded-pill inline-block", variants.primary, sizes.sm)}
        >
          Nova Cabine
        </Link>
      </div>

      {convites.length > 0 ? (
        <>
          <SectionTitle>Convites</SectionTitle>
          <div className="flex flex-col gap-2">
            {convites.map((convite) => (
              <div key={convite.id} className="bg-paper flex items-center gap-2 rounded-sm p-2">
                <span
                  aria-hidden="true"
                  className="size-avatarMd rounded-pill bg-lavender block shrink-0 bg-cover bg-center"
                  style={
                    convite.quem.avatarUrl
                      ? { backgroundImage: `url(${convite.quem.avatarUrl})` }
                      : undefined
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="text-bodyStrong text-ink block truncate">
                    {convite.quem.nome}
                  </span>
                  <span className="text-caption text-inkMuted block truncate">
                    {convite.mensagem ?? "Quer conversar com você"}
                  </span>
                </span>
                <Link
                  href={`/cabines/convite?id=${convite.id}`}
                  aria-label={`Ver o convite de ${convite.quem.nome}`}
                  className={cn("rounded-pill inline-block", variants.secondary, sizes.sm)}
                >
                  Ver
                </Link>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {/*
        RN22: o que você mandou e ainda não foi respondido. Fica separado das
        conversas porque ainda não é uma — a RN20 diz que a Cabine só começa
        com o aceite.
      */}
      {enviados.length > 0 ? (
        <>
          <SectionTitle>Convites enviados</SectionTitle>
          <div className="flex flex-col gap-2">
            {enviados.map((convite) => (
              <ConviteEnviado key={convite.id} id={convite.id} paraQuem={convite.paraQuem} />
            ))}
          </div>
        </>
      ) : null}

      <SectionTitle>Conversas</SectionTitle>

      {cabines.length === 0 ? (
        <EmptyState
          title="Nenhuma conversa ainda"
          description="A Cabine começa por convite, e só existe depois que a outra pessoa aceita."
          action={
            <Link
              href="/cabines/nova"
              className={cn("rounded-pill inline-block", variants.primary, sizes.sm)}
            >
              Nova Cabine
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {cabines.map((cabine) => (
            <Link
              key={cabine.id}
              href={`/cabines/${cabine.id}`}
              className="bg-paper flex items-center gap-2 rounded-sm p-3"
            >
              <span className="min-w-0 flex-1">
                <span className="text-bodyStrong text-ink block truncate">{cabine.nome}</span>
                <span className="text-caption text-inkMuted block truncate">
                  {cabine.previa ?? "Sem mensagens ainda"}
                </span>
              </span>

              {cabine.quando ? (
                <span className="text-caption text-inkMuted shrink-0">
                  {haQuantoTempo(cabine.quando)}
                </span>
              ) : null}

              {/*
                O número de não lidas é informação, não enfeite: por isso tem
                nome para quem usa leitor de tela, em vez de só a bolinha.
              */}
              {cabine.naoLidas > 0 ? (
                <span
                  aria-label={`${cabine.naoLidas} ${cabine.naoLidas === 1 ? "mensagem não lida" : "mensagens não lidas"}`}
                  className="bg-sun text-ink text-caption rounded-pill shrink-0 px-2 py-1 font-bold"
                >
                  {cabine.naoLidas}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </ContentColumn>
  );
}
