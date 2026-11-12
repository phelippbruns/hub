"use client";

import { useState } from "react";
import { Button } from "@/design/components";
import { CreateIcon } from "@/design/icons";
import { EditorDePost } from "./editor";

/**
 * "Novo post", e a janela que ele abre.
 *
 * **O botão e a janela no mesmo componente**, como em `criar tópico`: o
 * estado de aberto é um só, e separá-los custaria uma volta ao servidor ou
 * um contexto para nada.
 *
 * Numa `Janela` sobre o perfil, e não numa página: a vontade de escrever
 * nasce olhando o próprio blog, e sair dele para escrever é uma ida e
 * volta que ninguém pediu. É a mesma decisão de 31 de outubro para o
 * tópico, registrada no `vacilos.md`.
 */
export function CriarPost({
  handle,
  base,
  gifLigado,
}: {
  handle: string;
  base: string;
  gifLigado: boolean;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setAberto(true)}>
        <CreateIcon decorative className="size-iconSm" />
        Novo post
      </Button>

      <EditorDePost
        aberto={aberto}
        onFechar={() => setAberto(false)}
        handle={handle}
        base={base}
        gifLigado={gifLigado}
      />
    </>
  );
}
