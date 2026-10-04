import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/session";

/**
 * Destino de quem acabou de criar conta. O onboarding de verdade — três
 * passos, escolha de ao menos 3 comunidades e permissão de notificações — é a
 * F04, que está fora do escopo da F03.
 */
export default async function OnboardingPage() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") redirect("/entrar");

  return (
    <main className="max-w-contentColumn mx-auto flex flex-col gap-3 px-4 py-4">
      <h1 className="text-title text-ink">Conta criada</h1>
      <p className="text-body text-inkMuted">
        O onboarding, com a escolha das suas comunidades, chega na F04.
      </p>
      <Link
        href="/inicio"
        className="rounded-pill bg-ink text-paper text-bodyStrong border-ink box-border w-fit border-2 px-3 py-2 font-semibold"
      >
        Ir para o Início
      </Link>
    </main>
  );
}
