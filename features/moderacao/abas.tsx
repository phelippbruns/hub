"use client";

import { useRouter } from "next/navigation";
import { Tabs } from "@/design/components";

/** As abas da moderação, com a escolha na URL — como as do perfil. */
export function AbasDaModeracao({ base, atual }: { base: string; atual: string }) {
  const router = useRouter();

  return (
    <Tabs
      label="Seções da moderação"
      tabs={[
        { id: "denuncias", label: "Denúncias" },
        { id: "membros", label: "Membros" },
        { id: "moderadores", label: "Moderadores" },
      ]}
      activeId={atual}
      onSelect={(id) => router.push(`${base}?aba=${id}`)}
    />
  );
}
