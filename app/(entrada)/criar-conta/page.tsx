import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CriarContaForm } from "@/features/autenticacao/criar-conta-form";
import { getViewer } from "@/lib/auth/session";
import { isGoogleEnabled } from "@/lib/auth/google";

export const metadata: Metadata = { title: "Criar conta · Hub" };

export default async function CriarContaPage() {
  const viewer = await getViewer();
  if (viewer.kind === "member") redirect("/inicio");

  return (
    <main className="flex flex-col gap-4 py-4">
      <h1 className="text-title text-ink">Criar conta</h1>
      <CriarContaForm googleEnabled={isGoogleEnabled()} />
    </main>
  );
}
