"use client";

import { useState } from "react";
import { Button } from "@/design/components";
import { NotificationsNavIcon } from "@/design/icons";
import { concluir } from "./actions";

/**
 * Tela 5, último estado: "Não perca nada".
 *
 * RN34: as notificações já vêm ligadas por padrão no perfil; o que se pede
 * aqui é a permissão do **navegador**, que só pode ser solicitada a partir de
 * um clique da pessoa.
 *
 * **Recusar não bloqueia nada** — é critério de aceite. Os dois botões levam
 * ao mesmo lugar; muda só o que fica registrado.
 */
export function Notificacoes() {
  const [pedindo, setPedindo] = useState(false);

  async function pedirPermissao(event: React.MouseEvent<HTMLButtonElement>) {
    if (typeof Notification === "undefined") return;

    event.preventDefault();
    setPedindo(true);
    try {
      await Notification.requestPermission();
    } catch {
      // Navegador que recusa o pedido não pode travar o onboarding.
    }
    // Segue para a action, tendo a pessoa aceitado ou não no navegador.
    event.currentTarget.form?.requestSubmit(event.currentTarget);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 text-center">
      <div className="flex-1" />

      <div className="flex justify-center">
        <NotificationsNavIcon decorative className="size-iconLg text-ink" />
      </div>

      <h1 className="text-question text-ink">Não perca nada</h1>
      <p className="text-body text-inkMuted">
        Avisamos sobre novidades nos seus tópicos, convites de Cabine e atualizações em comunidades
        que você segue.
      </p>

      <div className="flex-1" />

      <form action={concluir} className="flex flex-col gap-2">
        <Button
          type="submit"
          name="aceitou"
          value="sim"
          onClick={pedirPermissao}
          disabled={pedindo}
        >
          Ativar notificações
        </Button>
        <Button type="submit" name="aceitou" value="nao" variant="secondary">
          Agora não
        </Button>
      </form>
    </div>
  );
}
