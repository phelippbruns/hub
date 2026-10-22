"use client";

import Link from "next/link";
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
 *
 * O cartão **leva de volta à conversa**: desde que a Cabine nasce de um
 * clique no perfil, quem convidou já escreveu ali. Sem este caminho, a
 * conversa só se reabria indo de novo ao perfil da pessoa — e quem não
 * lembrasse disso perderia o que escreveu de vista.
 */
export function ConviteEnviado({
  id,
  cabinId,
  paraQuem,
}: {
  id: string;
  cabinId: string;
  paraQuem: string;
}) {
  const [pendente, iniciar] = useTransition();

  return (
    <div className="bg-paper flex items-center gap-2 rounded-sm p-2">
      <Link href={`/cabines/${cabinId}`} className="min-w-0 flex-1 no-underline">
        <span className="text-body text-ink block truncate">Convite para {paraQuem}</span>
        <span className="text-caption text-inkMuted block">
          A Cabine começa quando {paraQuem.split(" ")[0]} aceitar.
        </span>
      </Link>

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
