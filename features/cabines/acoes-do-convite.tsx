"use client";

import { useState, useTransition } from "react";
import { Button, ConfirmSheet } from "@/design/components";
import { aceitarConvite, bloquearDaCabine, recusarConvite } from "./actions";

/**
 * Tela 19: Aceitar e Recusar lado a lado, em tamanho normal.
 *
 * O protótipo manda os dois do mesmo tamanho e centralizados — nenhum dos
 * dois é o caminho "certo". Recusar não é desistir de nada: a RN22 diz que
 * a recusa é silenciosa, e a tela diz isso em voz alta, porque quem está
 * decidindo precisa saber que ninguém vai ficar sabendo.
 */
export function AcoesDoConvite({
  inviteId,
  quemId,
  primeiroNome,
}: {
  inviteId: string;
  quemId: string;
  primeiroNome: string;
}) {
  const [pendente, iniciar] = useTransition();
  const [confirmandoBloqueio, setConfirmandoBloqueio] = useState(false);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full justify-center gap-2">
        <Button
          disabled={pendente}
          onClick={() => iniciar(() => aceitarConvite(inviteId))}
          className="flex-1"
        >
          Aceitar
        </Button>
        <Button
          variant="secondary"
          disabled={pendente}
          onClick={() => iniciar(() => recusarConvite(inviteId))}
          className="flex-1"
        >
          Recusar
        </Button>
      </div>

      <p className="text-caption text-inkMuted text-center">
        O convite fica aberto até você responder. {primeiroNome} não é avisado se você recusar.
      </p>

      <Button variant="danger" size="sm" onClick={() => setConfirmandoBloqueio(true)}>
        Bloquear
      </Button>

      <ConfirmSheet
        open={confirmandoBloqueio}
        titulo={`Bloquear ${primeiroNome}?`}
        descricao="Vocês param de se ver no Hub, e esta pessoa sai das Cabines que vocês dividem. Ela não é avisada."
        confirmar="Bloquear"
        pendente={pendente}
        onConfirm={() => iniciar(() => bloquearDaCabine(quemId))}
        onCancel={() => setConfirmandoBloqueio(false)}
      />
    </div>
  );
}
