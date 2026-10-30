"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@/design/components";
import type { AbaDaComunidade } from "./shared";

/**
 * As abas da comunidade, presas no topo ao rolar.
 *
 * **A escolha vai na URL como `?aba=`, e não num segmento de rota.** Um
 * `/c/<slug>/membros` seria irmão estático de `/c/<slug>/[topico]`, e o
 * Next casa estático antes de dinâmico: um tópico chamado "Membros"
 * ficaria inalcançável para sempre, sem erro nenhum. Já existem duas rotas
 * assim (`novo` e `moderar`), e esta rodada fechou o buraco em vez de
 * aumentá-lo.
 *
 * Presa sem animação e sem título entrando, como o PO pediu: o que a barra
 * precisa fazer é continuar alcançável, não se anunciar.
 */
export function AbasDaComunidade({ base, atual }: { base: string; atual: AbaDaComunidade }) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <div className="bg-surfacePage sticky top-0 z-10 -mx-1 px-1">
      <Tabs
        label="Seções da comunidade"
        tabs={[
          { id: "inicio", label: "Início" },
          { id: "membros", label: "Membros" },
        ]}
        activeId={atual}
        onSelect={(id) => {
          const novos = new URLSearchParams(params.toString());
          if (id === "inicio") {
            novos.delete("aba");
          } else {
            novos.set("aba", id);
          }
          /*
           * A busca e o filtro da lista de tópicos não sobrevivem à troca
           * de aba: voltar ao Início com um termo antigo filtrando a lista
           * parece tela quebrada.
           */
          novos.delete("q");

          const consulta = novos.toString();
          router.push(consulta ? `${base}?${consulta}` : base);
        }}
      />
    </div>
  );
}
