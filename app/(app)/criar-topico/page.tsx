import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ContentColumn, EmptyState, PageTitle } from "@/design/components";
import { getViewer } from "@/lib/auth/session";
import { minhasComunidades } from "@/lib/data/comunidades";

export const metadata: Metadata = { title: "Criar tópico · Hub" };

/**
 * Em qual comunidade criar o tópico.
 *
 * O botão da barra de navegação funciona de qualquer tela, mas tópico precisa
 * de uma comunidade. Perguntar custa um toque e deixa claro onde o tópico vai
 * nascer — adivinhar pela última comunidade aberta criaria tópicos em lugares
 * que a pessoa só descobriria depois de publicar.
 *
 * Com uma comunidade só, não há o que perguntar.
 */
export default async function CriarTopicoPage() {
  const viewer = await getViewer();
  const comunidades = await minhasComunidades(viewer);

  if (comunidades.length === 1) redirect(`/c/${comunidades[0]!.slug}/novo`);

  return (
    <ContentColumn>
      <PageTitle>Criar tópico</PageTitle>

      {comunidades.length === 0 ? (
        <EmptyState
          title="Você ainda não está em nenhuma comunidade"
          description="Tópico nasce dentro de uma comunidade. Use Explorar para entrar numa, ou crie a sua."
        />
      ) : (
        <>
          <p className="text-body text-ink">Em qual comunidade?</p>
          <div className="flex flex-col gap-2">
            {comunidades.map((comunidade) => (
              <Link
                key={comunidade.id}
                href={`/c/${comunidade.slug}/novo`}
                className="bg-paper flex items-center gap-3 rounded-sm p-3"
              >
                <span
                  aria-hidden="true"
                  className="size-thumb bg-lavender shrink-0 rounded-sm bg-cover bg-center"
                  style={
                    comunidade.coverUrl
                      ? { backgroundImage: `url(${comunidade.coverUrl})` }
                      : undefined
                  }
                />
                <span className="text-bodyStrong text-ink min-w-0 truncate">{comunidade.name}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </ContentColumn>
  );
}
