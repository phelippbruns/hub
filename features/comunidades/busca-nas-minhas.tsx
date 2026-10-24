"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CampoDeBusca } from "@/design/components";

/** Busca de Minhas Comunidades (tela 12). O termo fica na URL, como na F06. */
export function BuscaNasMinhas({ termoInicial = "" }: { termoInicial?: string }) {
  const router = useRouter();
  const [termo, setTermo] = useState(termoInicial);

  useEffect(() => {
    const atual = termo.trim();
    if (atual === termoInicial.trim()) return;

    const espera = setTimeout(() => {
      router.push(
        atual ? `/comunidades/minhas?q=${encodeURIComponent(atual)}` : "/comunidades/minhas",
      );
    }, 350);

    return () => clearTimeout(espera);
  }, [termo, termoInicial, router]);

  return (
    <CampoDeBusca
      rotulo="Buscar nas suas comunidades"
      value={termo}
      onChange={(evento) => setTermo(evento.target.value)}
    />
  );
}
