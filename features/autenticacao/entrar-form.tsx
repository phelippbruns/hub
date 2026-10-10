"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Input, PasswordInput } from "@/design/components";
import { entrar } from "./actions";
import type { ActionState } from "./shared";
import { GoogleButton } from "./google-button";

/** Tela 3, versão Entrar. */
export function EntrarForm({ next, googleEnabled }: { next?: string; googleEnabled: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(entrar, {});

  return (
    <div className="flex flex-col gap-3">
      <form action={action} className="flex flex-col gap-3">
        {next ? <input type="hidden" name="next" value={next} /> : null}

        {/*
          Um campo só para os dois. Dois campos obrigariam a pessoa a decidir
          antes de digitar o que o servidor descobre sozinho olhando o texto.

          `type="text"`, e não `email`: com `email` o navegador recusaria um @
          do Hub antes mesmo de enviar.
        */}
        <Input
          label="Email ou @"
          name="identificador"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
        <PasswordInput label="Senha" name="password" autoComplete="current-password" required />

        <Link href="/senha" className="text-caption text-ink self-end underline">
          Esqueci a senha
        </Link>

        {state.error ? (
          <p role="alert" className="text-caption text-error">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      {googleEnabled ? (
        <>
          <p className="text-caption text-inkMuted text-center">ou</p>
          <GoogleButton next={next} />
        </>
      ) : null}

      <p className="text-caption text-inkMuted text-center">
        Não tem conta?{" "}
        <Link href="/criar-conta" className="underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
