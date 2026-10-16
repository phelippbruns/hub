import { notFound } from "next/navigation";
import { SectionTitle } from "@/design/components";
import { getViewer } from "@/lib/auth/session";
import { cabinePorId } from "@/lib/data/cabins";
import { painelEstaOculto } from "@/lib/data/comunidades";
import { ForbiddenError, NotFoundError } from "@/lib/data/errors";

/**
 * O painel de participantes da Cabine (tela 20, versão web).
 *
 * Rota paralela pelo mesmo motivo do painel da comunidade: as folhas que
 * abrem sobre a conversa não podem fazer o painel sumir, e "ocultar
 * participantes" é preferência da pessoa, não estado da tela — é a mesma
 * preferência, guardada na pessoa.
 */
export default async function PainelDaCabinePage({
  params,
}: {
  params: Promise<{ cabine: string }>;
}) {
  const { cabine: cabinId } = await params;
  const viewer = await getViewer();

  let cabine;
  try {
    cabine = await cabinePorId(viewer, cabinId);
  } catch (erro) {
    // Quem não participa não vê nem o painel — e nem fica sabendo que a
    // Cabine existe (RN20).
    if (erro instanceof NotFoundError || erro instanceof ForbiddenError) notFound();
    throw erro;
  }

  if (await painelEstaOculto(viewer)) return null;

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle>Participantes</SectionTitle>

      <ul className="flex flex-col gap-2">
        {cabine.participantes.map((pessoa) => (
          <li key={pessoa.id} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-avatarMd rounded-pill bg-lavender block shrink-0 bg-cover bg-center"
              style={pessoa.avatarUrl ? { backgroundImage: `url(${pessoa.avatarUrl})` } : undefined}
            />
            <span className="min-w-0">
              <span className="text-body text-ink block truncate">
                {pessoa.souEu ? "Você" : pessoa.nome}
              </span>
              <span className="text-caption text-inkMuted block truncate">@{pessoa.handle}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="text-caption text-inkMuted">
        A Cabine é privada. Ninguém de fora vê esta conversa.
      </p>
    </div>
  );
}
