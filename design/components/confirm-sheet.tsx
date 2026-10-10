"use client";

import { BottomSheet } from "./bottom-sheet";
import { Button } from "./button";

/**
 * Confirmação de uma ação que a pessoa pode se arrepender (tela 14, sair).
 *
 * O texto diz o que ela perde **e o que continua** — "seus tópicos e respostas
 * continuam na comunidade" é o que impede a saída de parecer apagar tudo.
 *
 * O botão de continuar vem primeiro na ordem de foco: quem abriu sem querer
 * sai do caminho com um Tab, não com um clique no botão destrutivo.
 */
export function ConfirmSheet({
  open,
  titulo,
  descricao,
  confirmar,
  cancelar = "Cancelar",
  onConfirm,
  onCancel,
  pendente = false,
  id,
}: {
  open: boolean;
  titulo: string;
  descricao: string;
  confirmar: string;
  cancelar?: string;
  onConfirm: () => void;
  onCancel: () => void;
  pendente?: boolean;
  id?: string;
}) {
  return (
    <div id={id}>
      <BottomSheet title={titulo} open={open}>
        <p className="text-body text-inkMuted">{descricao}</p>
        <div className="flex flex-col gap-1">
          <Button variant="secondary" onClick={onCancel}>
            {cancelar}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={pendente}>
            {confirmar}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
