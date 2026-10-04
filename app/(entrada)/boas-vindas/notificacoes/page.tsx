import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Notificacoes } from "@/features/onboarding/notificacoes";
import { getViewer } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Notificações · Hub" };

export default async function NotificacoesPage() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") redirect("/entrar");
  return <Notificacoes />;
}
