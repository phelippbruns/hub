"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { Button, CommunityCover, Input, TextField } from "@/design/components";
import { TAMANHO_MAXIMO_EM_MB, problemaNaImagem } from "@/lib/midia/limites";
import { criarComunidade, type EstadoDaCriacao } from "./actions";

/**
 * Tela 13: criar comunidade.
 *
 * O aviso do corte de 20 membros fica visível desde antes de criar, e não
 * depois: quem acaba de criar uma comunidade e não a encontra em Explorar
 * acha que deu errado.
 */
export function FormularioNovaComunidade() {
  const [estado, acao, pendente] = useActionState<EstadoDaCriacao, FormData>(criarComunidade, {});
  const [previa, setPrevia] = useState<string | null>(null);
  const [nomeDoArquivo, setNomeDoArquivo] = useState<string | null>(null);
  const [problemaDaCapa, setProblemaDaCapa] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const arquivoRef = useRef<HTMLInputElement>(null);

  return (
    <form action={acao} className="flex flex-col gap-3">
      {/*
        A capa entra já na criação.

        Antes a comunidade nascia com a capa padrão e só quem modera trocava
        depois, pelo menu de três pontos — ou seja, quem acabou de criar
        precisava descobrir um menu para terminar o que estava fazendo. O
        caminho é o mesmo da tela de trocar capa: prévia aqui, conferência
        pelos bytes e remoção da localização no servidor.
      */}
      <CommunityCover name={nome || "Sua comunidade"} coverUrl={previa} />

      {/*
        O controle de arquivo do navegador vem em inglês e não há como
        traduzi-lo. Fica escondido do olho, não do teclado nem do leitor de
        tela, e quem aparece é um botão nosso.
      */}
      <input
        ref={arquivoRef}
        type="file"
        name="imagem"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Escolher a capa"
        onChange={(evento) => {
          const escolhido = evento.target.files?.[0] ?? null;
          setProblemaDaCapa(escolhido ? problemaNaImagem(escolhido) : null);
          setNomeDoArquivo(escolhido?.name ?? null);
          if (previa) URL.revokeObjectURL(previa);
          setPrevia(escolhido ? URL.createObjectURL(escolhido) : null);
        }}
      />

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => arquivoRef.current?.click()}>
          Escolher capa
        </Button>
        <span className="text-caption text-inkMuted min-w-0 flex-1 truncate">
          {nomeDoArquivo ?? "Sem capa, o Hub usa a padrão"}
        </span>
      </div>

      {problemaDaCapa ? (
        <p role="alert" className="text-caption text-error">
          {problemaDaCapa}
        </p>
      ) : (
        <p className="text-caption text-inkMuted">
          JPEG, PNG ou WebP, até {TAMANHO_MAXIMO_EM_MB} MB. A localização que a foto carrega é
          removida antes de guardar.
        </p>
      )}

      <Input
        label="Nome"
        name="name"
        required
        maxLength={60}
        autoComplete="off"
        value={nome}
        onChange={(evento) => setNome(evento.target.value)}
        error={estado.erros?.name}
      />

      {estado.jaExiste ? (
        <p role="alert" className="text-caption text-error">
          Já existe{" "}
          <Link href={`/c/${estado.jaExiste.slug}`} className="underline">
            {estado.jaExiste.name}
          </Link>
          . Entre nela ou escolha outro nome.
        </p>
      ) : null}

      <TextField
        label="Intro"
        name="intro"
        maxLength={240}
        tall
        required
        error={estado.erros?.intro}
        className="w-full"
      />

      {estado.erro ? (
        <p role="alert" className="text-caption text-error">
          {estado.erro}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pendente || problemaDaCapa !== null}
        disabledHint={problemaDaCapa ?? undefined}
      >
        Criar comunidade
      </Button>
    </form>
  );
}
