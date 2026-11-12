"use client";

import { useState, useTransition } from "react";
import { Button } from "@/design/components";
import { CabinNavIcon } from "@/design/icons";
import { abrirConversa } from "../actions";

/**
 * "Conversar sobre isso em Cabine", no pé do post, para quem não escreveu.
 *
 * **Reaproveita o fluxo que já existe**: `abrirConversa` é a mesma ação do
 * botão de Cabine no topo do perfil, e o servidor é quem decide o destino
 * — conversa que já existe, conversa que começa agora porque as duas
 * pessoas se seguem (RN20), ou Cabine nova com convite pendente.
 *
 * O post **não viaja junto**. A conversa é com a pessoa, e mandar o título
 * como primeira mensagem escreveria em nome de quem clicou.
 */
export function ConversarSobreOPost({
  profileId,
  nome,
  titulo,
}: {
  profileId: string;
  nome: string;
  titulo: string;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <div className="border-line mt-3 flex flex-col gap-2 border-t pt-3">
      <Button
        variant="secondary"
        disabled={pendente}
        aria-label={`Conversar com ${nome} sobre ${titulo}`}
        onClick={() => {
          setErro(null);
          iniciar(async () => {
            const resultado = await abrirConversa(profileId);
            if (resultado?.erro) setErro(resultado.erro);
          });
        }}
      >
        <CabinNavIcon decorative className="size-icon" />
        Conversar sobre isso em Cabine
      </Button>

      {erro ? (
        <p role="alert" className="text-caption text-error">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
