"use client";

import { useTransition } from "react";
import { Switch } from "@/design/components";
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
    <div className="flex flex-col gap-1">
      <Switch
        label="Aceitar convites de Cabine"
        checked={atual === "community_members"}
        onToggle={() => {
          if (!pendente) trocar(atual !== "community_members");
        }}
      />
      <p className="text-caption text-inkMuted">
        {atual === "community_members"
          ? "Pessoas das suas comunidades podem te convidar para conversar."
          : "Ninguém pode te convidar. Você continua podendo convidar outras pessoas."}
      </p>
    </div>
  );
}
