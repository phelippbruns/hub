"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Input, TextField } from "@/design/components";
import { ImageIcon } from "@/design/icons";
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

  return (
    <form action={acao} className="flex flex-col gap-3">
      {/*
        Enviar capa aqui é da F20. Até lá a comunidade nasce com a capa padrão
        do Hub, e quem modera troca depois pelo menu de três pontos.
      */}
      <div className="bg-lavender min-h-cover text-ink grid place-items-center rounded-sm">
        <span className="flex flex-col items-center gap-1">
          <ImageIcon decorative className="size-iconLg" />
          <span className="text-caption">A capa pode ser trocada depois de criar</span>
        </span>
      </div>

      <Input
        label="Nome"
        name="name"
        required
        maxLength={60}
        autoComplete="off"
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

      <p className="text-caption text-inkMuted">
        A comunidade fica disponível na aba Explorar ao atingir 20 membros. Enquanto isso, pode ser
        encontrada pela busca.
      </p>

      {estado.erro ? (
        <p role="alert" className="text-caption text-error">
          {estado.erro}
        </p>
      ) : null}

      <Button type="submit" disabled={pendente}>
        Criar comunidade
      </Button>
    </form>
  );
}
