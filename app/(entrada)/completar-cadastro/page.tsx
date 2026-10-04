import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CompletarCadastroForm } from "@/features/autenticacao/completar-cadastro-form";
import { getAuthUser } from "@/lib/auth/session";
import { getProfileByAuthId, suggestAvailableHandle } from "@/lib/data/profiles";

export const metadata: Metadata = { title: "Complete seu cadastro · Hub" };

export default async function CompletarCadastroPage() {
  const user = await getAuthUser();
  // Só chega aqui quem autenticou no Google e ainda não tem perfil.
  if (!user) redirect("/entrar");
  if (await getProfileByAuthId(user.id)) redirect("/inicio");

  const name = (user.user_metadata?.full_name as string | undefined) ?? "";
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null;

  return (
    <main className="flex flex-col gap-4 py-4">
      <h1 className="text-title text-ink">Complete seu cadastro</h1>
      <CompletarCadastroForm
        defaultName={name}
        defaultHandle={await suggestAvailableHandle(name || "pessoa")}
        avatarUrl={avatarUrl}
      />
    </main>
  );
}
