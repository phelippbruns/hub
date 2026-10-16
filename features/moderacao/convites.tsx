"use client";

import { useTransition } from "react";
import { Button } from "@/design/components";
import { responderConviteDeModeracao } from "./actions";

export type ConviteDeModeracao = { id: string; comunidade: string };

/**
 * Os convites para moderar, na central de notificações.
 *
 * O aviso sozinho não bastava: ele dizia "você foi convidado" e não tinha
 * onde responder. Ninguém vira responsável por uma comunidade sem aceitar,
 * então o aceite precisa existir em algum lugar — é aqui.
 */
export function ConvitesParaModerar({ convites }: { convites: ConviteDeModeracao[] }) {
  const [pendente, iniciar] = useTransition();
  if (convites.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {convites.map((convite) => (
        <div key={convite.id} className="bg-lavender flex flex-col gap-1 rounded-sm p-3">
          <p className="text-body text-ink">
            Você foi convidado para moderar {convite.comunidade}. Moderar é atender denúncias e
            responder pela comunidade.
          </p>
          <div className="flex gap-1">
            <Button
              size="sm"
              disabled={pendente}
              onClick={() => iniciar(() => responderConviteDeModeracao(convite.id, true))}
            >
              Aceitar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={pendente}
              onClick={() => iniciar(() => responderConviteDeModeracao(convite.id, false))}
            >
              Recusar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
