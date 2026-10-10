"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SearchIcon } from "@/design/icons";

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
    <div className="bg-paper border-inkMuted box-border flex items-center gap-2 rounded-sm border-2 px-2">
      <SearchIcon decorative className="size-iconSm text-inkMuted shrink-0" />
      <input
        type="search"
        value={termo}
        onChange={(evento) => setTermo(evento.target.value)}
        aria-label="Buscar nas suas comunidades"
        placeholder="Buscar nas suas comunidades"
        className="text-body text-ink min-w-0 flex-1 border-0 bg-transparent py-2 outline-none"
      />
    </div>
  );
}
