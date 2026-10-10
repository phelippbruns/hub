"use client";

import { useActionState } from "react";
import { Button, Input, TextField } from "@/design/components";
import { GifIcon, ImageIcon } from "@/design/icons";
import { criarTopico, type EstadoDaCriacao } from "./actions";

/**
 * Tela 16: criar tópico.
 *
 * O aviso do limite aparece **antes** de escrever, e não como recusa depois:
 * descobrir que não pode publicar hoje com a pergunta já escrita é o pior
 * momento possível.
 */
export function FormularioNovoTopico({
  comunidadeSlug,
  nomeDaComunidade,
  jaUsouODia,
}: {
  comunidadeSlug: string;
  nomeDaComunidade: string;
  jaUsouODia: boolean;
}) {
  const [estado, acao, pendente] = useActionState<EstadoDaCriacao, FormData>(criarTopico, {});

  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="comunidade" value={comunidadeSlug} />

      {jaUsouODia ? (
        <p role="alert" className="text-body text-error">
          Você já criou um tópico em {nomeDaComunidade} hoje. O próximo pode ser criado depois da
          virada das 00h.
        </p>
      ) : null}

      <Input
        label="Nome"
        name="name"
        required
        maxLength={80}
        autoComplete="off"
        disabled={jaUsouODia}
        error={estado.erros?.name}
      />

      <TextField
        label="Descrição"
        name="description"
        maxLength={240}
        tall
        required
        disabled={jaUsouODia}
        error={estado.erros?.description}
        className="w-full"
      />

      {/*
        Imagem e GIF como ícones do mesmo tamanho, como a tela 16 mostra.
        Enviar arquivo é a F20; o GIF vem do GIPHY na F09. Até lá os dois
        ficam à vista e desativados, para o lugar deles já existir.
      */}
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled aria-label="Adicionar imagem (em breve)">
          <ImageIcon decorative className="size-icon" />
        </Button>
        <Button variant="secondary" size="sm" disabled aria-label="Adicionar GIF (em breve)">
          <GifIcon decorative className="size-icon" />
        </Button>
        <span className="text-caption text-inkMuted">Imagem e GIF chegam em breve</span>
      </div>

      <p className="text-caption text-inkMuted">
        Você pode criar 1 tópico por dia nesta comunidade. O tópico com mais pessoas respondendo até
        o fim do ciclo, às 00h, fica em destaque.
      </p>

      {estado.erro ? (
        <p role="alert" className="text-caption text-error">
          {estado.erro}
        </p>
      ) : null}

      <Button type="submit" disabled={pendente || jaUsouODia}>
        Criar tópico
      </Button>
    </form>
  );
}
