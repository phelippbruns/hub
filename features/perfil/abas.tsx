"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@/design/components";

/**
 * As abas do perfil, com a escolha na URL.
 *
 * Na URL e não em estado local, como a ordem na comunidade e no Universo: o
 * endereço fica compartilhável e o botão voltar funciona.
 */
export function AbasDoPerfil({ base, atual }: { base: string; atual: string }) {
  const router = useRouter();
  const params = useSearchParams();

  /*
   * Blog primeiro, decisão do PO em 9 de novembro de 2026 — e é a aba que
   * abre, inclusive em perfil sem post nenhum.
   *
   * A Coleção **saiu daqui** e foi para o menu de três pontos do dono. Ela
   * era a quarta aba e só existia para uma pessoa; a fila de abas é o que
   * descreve o perfil para quem chega, e um item que só o dono vê não
   * descreve nada para ninguém.
   */
  const abas = [
    { id: "blog", label: "Blog" },
    { id: "contribuicoes", label: "Contribuições" },
    { id: "comunidades", label: "Comunidades" },
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
