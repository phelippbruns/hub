"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Input, LevelMark, TextField } from "@/design/components";
import { ImageIcon } from "@/design/icons";
import { criarComunidade, type EstadoDaCriacao } from "./actions";

/**
 * Tela 13: criar comunidade.
 *
 * O aviso do corte de 20 membros fica visível desde antes de criar, e não
 * depois: quem acaba de criar uma comunidade e não a encontra em Explorar
 * acha que deu errado.
 */
export function FormularioNovaComunidade({
  universos,
}: {
  universos: { id: string; name: string; slug: string }[];
}) {
  const [estado, acao, pendente] = useActionState<EstadoDaCriacao, FormData>(criarComunidade, {});

  return (
    <form action={acao} className="flex flex-col gap-3">
      {/*
        Enviar capa é da F20 (uploads). Até lá a comunidade nasce com a capa
        do Universo, que é o que a RN03 manda quando não há capa enviada.
      */}
      <div className="bg-lavender min-h-cover text-ink grid place-items-center rounded-sm">
        <span className="flex flex-col items-center gap-1">
          <ImageIcon decorative className="size-iconLg" />
          <span className="text-caption">A capa do Universo é usada por enquanto</span>
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

      <div className="flex flex-col gap-1">
        <label htmlFor="universeId" className="text-caption text-inkMuted font-bold">
          Universo
        </label>
        <div className="bg-paper border-inkMuted box-border flex items-center gap-2 rounded-sm border-2 px-2">
          <LevelMark level="universe" />
          <select
            id="universeId"
            name="universeId"
            required
            defaultValue=""
            className="text-body text-ink min-w-0 flex-1 cursor-pointer border-0 bg-transparent py-2 outline-none"
          >
            <option value="" disabled>
              Escolha um Universo
            </option>
            {universos.map((universo) => (
              <option key={universo.id} value={universo.id}>
                {universo.name}
              </option>
            ))}
          </select>
        </div>
        {estado.erros?.universeId ? (
          <p role="alert" className="text-caption text-error">
            {estado.erros.universeId}
          </p>
        ) : null}
      </div>

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
