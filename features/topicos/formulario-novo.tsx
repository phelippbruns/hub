"use client";

import { useActionState } from "react";
import { Button, Input, TextField } from "@/design/components";
import { GifIcon, ImageIcon } from "@/design/icons";
import { criarTopico, type EstadoDaCriacao } from "./actions";

/**
 * O corpo da criação de tópico (tela 16), dentro da janela de
 * [CriarTopico](./criar.tsx).
 *
 * O aviso do limite aparece **antes** de escrever, e não como recusa depois:
 * descobrir que não pode publicar hoje com a pergunta já escrita é o pior
 * momento possível.
 *
 * **"Título" e "Abertura"**, e não "Nome" e "Descrição". Os rótulos vêm do
 * protótipo v6: o segundo campo não descreve o tópico, ele começa a
 * conversa — é o texto do cartão escuro no topo da tela do tópico. A RN08
 * continua exigindo os dois, com os mesmos 80 e 240 caracteres.
 */
export function FormularioNovoTopico({
  comunidadeSlug,
  nomeDaComunidade,
  jaUsouODia,
  nomeSugerido = "",
}: {
  comunidadeSlug: string;
  nomeDaComunidade: string;
  jaUsouODia: boolean;
  /**
   * Vem de Primeiros passos, na tela da comunidade. É `defaultValue`, não
   * valor controlado: a sugestão abre o campo preenchido e quem escreve
   * continua dono dele.
   */
  nomeSugerido?: string;
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
        label="Título"
        name="name"
        required
        contador
        maxLength={80}
        autoComplete="off"
        placeholder="Sobre o que você quer conversar?"
        defaultValue={nomeSugerido}
        disabled={jaUsouODia}
        error={estado.erros?.name}
      />

      <TextField
        label="Abertura"
        name="description"
        maxLength={240}
        tall
        required
        placeholder="Comece a conversa: o que te fez abrir este tópico?"
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

      {/*
        Um botão, à direita, e nada de "Cancelar" empilhado: o X da janela
        já fecha, e dois botões do mesmo tamanho fazem procurar diferença
        entre eles. Print do PO de 31 de outubro.
      */}
      <div className="flex justify-end">
        <Button type="submit" disabled={pendente || jaUsouODia}>
          Criar tópico
        </Button>
      </div>
    </form>
  );
}
