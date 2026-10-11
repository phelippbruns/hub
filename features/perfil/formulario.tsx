"use client";

import { useActionState, useRef, useState } from "react";
import { Button, Input, TextField } from "@/design/components";
import { acharLink } from "@/lib/texto/links";
import { problemaNaImagem } from "@/lib/midia/limites";
import { salvarPerfil, type EstadoDoPerfil } from "./actions";

/**
 * Editar o perfil numa tela só (tela 22).
 *
 * Foto, nome, @ e descrição. A foto só muda quando uma nova é escolhida —
 * salvar o nome não pode apagar a foto.
 */
export function FormularioDePerfil({
  nome,
  handle,
  bio,
  avatarUrl,
}: {
  nome: string;
  handle: string;
  bio: string | null;
  avatarUrl: string | null;
}) {
  const [estado, acao, pendente] = useActionState<EstadoDoPerfil, FormData>(salvarPerfil, {});
  const [descricao, setDescricao] = useState(bio ?? "");
  const [previa, setPrevia] = useState<string | null>(null);
  const [problemaDaFoto, setProblemaDaFoto] = useState<string | null>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);

  // RN16: o aviso cita o trecho, como no campo de resposta.
  const link = descricao.trim() ? acharLink(descricao) : null;

  return (
    <form action={acao} className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => arquivoRef.current?.click()}
          aria-label="Trocar a foto do perfil"
          className="rounded-pill cursor-pointer"
        >
          <span
            aria-hidden="true"
            className="size-avatarLg rounded-pill bg-lavender block bg-cover bg-center"
            style={
              (previa ?? avatarUrl) ? { backgroundImage: `url(${previa ?? avatarUrl})` } : undefined
            }
          />
        </button>
        <span className="text-caption text-inkMuted">Toque na foto para trocar</span>

        <input
          ref={arquivoRef}
          type="file"
          name="foto"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Escolher foto do perfil"
          onChange={(evento) => {
            const escolhido = evento.target.files?.[0] ?? null;
            // O servidor confere de novo; isto evita um envio cortado no
            // caminho, que chegaria como erro sem explicação.
            setProblemaDaFoto(escolhido ? problemaNaImagem(escolhido) : null);
            if (previa) URL.revokeObjectURL(previa);
            setPrevia(escolhido ? URL.createObjectURL(escolhido) : null);
          }}
        />
      </div>

      <Input
        label="Nome"
        name="name"
        defaultValue={nome}
        required
        maxLength={80}
        error={estado.erros?.name}
      />

      <Input
        label="@"
        name="handle"
        defaultValue={handle}
        required
        maxLength={20}
        autoCapitalize="none"
        spellCheck={false}
        hint="Único no Hub."
        error={estado.erros?.handle}
      />

      <TextField
        label="Descrição"
        name="bio"
        maxLength={120}
        tall
        value={descricao}
        onValueChange={setDescricao}
        className="w-full"
        error={link ? `Tire o endereço: "${link.trecho}"` : estado.erros?.bio}
      />

      {problemaDaFoto ? (
        <p role="alert" className="text-caption text-error">
          {problemaDaFoto}
        </p>
      ) : null}

      {estado.erro ? (
        <p role="alert" className="text-caption text-error">
          {estado.erro}
        </p>
      ) : null}

      <Button type="submit" disabled={pendente || link !== null || problemaDaFoto !== null}>
        {pendente ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
