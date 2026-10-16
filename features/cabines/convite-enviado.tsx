"use client";

import { useTransition } from "react";
import { Button } from "@/design/components";
import { cancelarMeuConvite } from "./actions";

/**
 * Um convite que você mandou e ainda não foi respondido (RN22).
 *
 * Precisa aparecer em algum lugar por dois motivos: a RN22 dá a quem
 * convidou o direito de cancelar, e sem isto não havia onde fazer isso; e
 * sem um sinal de "enviado", mandar um convite parecia não ter acontecido —
 * a conversa não aparece, porque a RN20 diz que ela ainda não começou.
 *
 * O que **não** aparece é se a pessoa já viu ou recusou: a recusa é
 * silenciosa, e um convite que some sozinho contaria a resposta.
 */
export function ConviteEnviado({ id, paraQuem }: { id: string; paraQuem: string }) {
  const [pendente, iniciar] = useTransition();

  return (
    <div className="bg-paper flex items-center gap-2 rounded-sm p-2">
      <span className="min-w-0 flex-1">
        <span className="text-body text-ink block truncate">Convite para {paraQuem}</span>
        <span className="text-caption text-inkMuted block">
          A Cabine começa quando {paraQuem.split(" ")[0]} aceitar.
        </span>
      </span>

      <Button
        variant="secondary"
        size="sm"
        disabled={pendente}
        onClick={() => iniciar(() => cancelarMeuConvite(id))}
      >
        Cancelar
      </Button>
    </div>
  );
}
