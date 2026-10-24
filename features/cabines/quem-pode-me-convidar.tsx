"use client";

import { useTransition } from "react";
import { SwitchRow } from "@/design/components";
import { salvarQuemPodeConvidar } from "./actions";

/**
 * RN23: quem pode te convidar para uma Cabine.
 *
 * São só dois estados, então é um interruptor e não uma lista: convidar já
 * exige comunidade em comum (RN21), então a escolha real é entre o padrão e
 * fechar a porta. Uma lista de duas opções daria a impressão de que existe
 * um "todo mundo" escondido.
 */
export function QuemPodeMeConvidar({ atual }: { atual: "community_members" | "nobody" }) {
  const [pendente, iniciar] = useTransition();

  function trocar(ligado: boolean) {
    const formulario = new FormData();
    formulario.set("invitePolicy", ligado ? "community_members" : "nobody");
    iniciar(() => salvarQuemPodeConvidar(formulario));
  }

  return (
    <SwitchRow
      nome="Aceitar convites de Cabine"
      descricao={
        atual === "community_members"
          ? "Pessoas das suas comunidades podem te convidar para conversar."
          : "Ninguém pode te convidar. Você continua podendo convidar outras pessoas."
      }
      checked={atual === "community_members"}
      onToggle={() => {
        if (!pendente) trocar(atual !== "community_members");
      }}
    />
  );
}
