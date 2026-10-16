import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentColumn, PageTitle } from "@/design/components";
import { FormularioDeDenuncia } from "@/features/denuncia/formulario";
import { getViewer } from "@/lib/auth/session";
import { alvoPelaUrl, MOTIVOS } from "@/lib/data/moderacao";

export const metadata: Metadata = { title: "Denúncia e bloqueio · Hub" };

/**
 * Tela 26: denúncia e bloqueio.
 *
 * O alvo vem pelo endereço, nos mesmos parâmetros que os botões das outras
 * telas já usavam desde a F11. Endereço sem alvo que exista dá 404 — e por
 * isso esta rota **não tem** `loading.tsx` (veja o CLAUDE.md).
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    resposta?: string;
    perfil?: string;
    comunidade?: string;
    bloquear?: string;
    voltar?: string;
  }>;
}) {
  const params = await searchParams;
  const viewer = await getViewer();
  const alvo = await alvoPelaUrl(viewer, params);
  if (!alvo) notFound();

  return (
    <ContentColumn>
      <PageTitle>{alvo.titulo}</PageTitle>

      {/* O que está sendo denunciado, em contexto: decidir às cegas é como
          se perde a denúncia certa e se manda a errada. */}
      {alvo.trecho || alvo.onde ? (
        <div className="bg-paper flex flex-col gap-1 rounded-sm p-3">
          {alvo.onde ? <p className="text-caption text-inkMuted">{alvo.onde}</p> : null}
          {alvo.trecho ? <p className="text-body text-ink">{alvo.trecho}</p> : null}
        </div>
      ) : null}

      <FormularioDeDenuncia
        tipo={alvo.alvo.tipo}
        id={alvo.alvo.id}
        motivos={MOTIVOS.map((motivo) => ({ id: motivo.id, label: motivo.rotulo }))}
        pessoa={alvo.pessoa ? { id: alvo.pessoa.id, nome: alvo.pessoa.nome } : null}
        voltar={params.voltar ?? "/inicio"}
        focoNoBloqueio={alvo.focoNoBloqueio}
      />
    </ContentColumn>
  );
}
