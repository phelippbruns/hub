import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/session";
import { jaFezOnboarding } from "@/lib/data/onboarding";
import { sair } from "@/features/autenticacao/actions";

/**
 * Destino de quem entrou. O Início de verdade é a F11; aqui fica o mínimo para
 * a F03 ter para onde levar a pessoa, e para dar como sair.
 */
export default async function InicioPage() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") redirect("/entrar");
  // RN31: sem onboarding, o Início não tem comunidade de onde tirar conteúdo.
  if (!(await jaFezOnboarding(viewer.profileId))) redirect("/boas-vindas");

  return (
    <main className="max-w-contentColumn mx-auto flex flex-col gap-3 px-4 py-4">
      <h1 className="text-title text-ink">Início</h1>
      <p className="text-body text-inkMuted">
        Você entrou. O Início com Hot Topics e tópicos seguidos chega na F11.
      </p>
      <form action={sair}>
        <button
          type="submit"
          className="rounded-pill text-ink text-bodyStrong border-ink box-border border-2 px-3 py-2 font-semibold"
        >
          Sair
        </button>
      </form>
    </main>
  );
}
