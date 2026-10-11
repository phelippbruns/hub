"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@/design/components";

/**
 * As abas do perfil, com a escolha na URL.
 *
 * Na URL e não em estado local, como a ordem na comunidade e no Universo: o
 * endereço fica compartilhável e o botão voltar funciona.
 */
export function AbasDoPerfil({
  base,
  atual,
  comColecao,
}: {
  base: string;
  atual: string;
  comColecao: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const abas = [
    { id: "respostas", label: "Respostas" },
    { id: "comunidades", label: "Comunidades" },
    // RN27: a Coleção é privada. Para visitante a aba nem existe.
    ...(comColecao ? [{ id: "colecao", label: "Coleção" }] : []),
  ];

  return (
    <Tabs
      label="Seções do perfil"
      tabs={abas}
      activeId={atual}
      onSelect={(id) => {
        const novos = new URLSearchParams(params.toString());
        novos.set("aba", id);
        router.push(`${base}?${novos}`);
      }}
    />
  );
}
