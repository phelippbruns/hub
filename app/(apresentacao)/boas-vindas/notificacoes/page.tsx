import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Notificacoes } from "@/features/onboarding/notificacoes";
import { getViewer } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Notificações · Hub" };

export default async function NotificacoesPage() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") redirect("/entrar");

  /* A coluna estreita das telas de entrada: aqui é um pedido só, não um card. */
  return (
    <div className="max-w-authColumn flex w-full flex-1 flex-col">
      <Notificacoes />
    </div>
  );
}
