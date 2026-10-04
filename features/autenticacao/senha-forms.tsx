"use client";

import { useActionState, useState } from "react";
import { Button, CodeInput, Input, PasswordInput, SuccessMessage } from "@/design/components";
import { definirNovaSenha, pedirCodigo } from "./actions";
import type { ActionState } from "./shared";

/** Tela 4, primeiro passo: pedir o código. */
export function PedirCodigoForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(pedirCodigo, {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-body text-inkMuted">
        Informe o email da sua conta. Enviaremos um código de 6 dígitos.
      </p>

      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
      />

      {state.error ? (
        <p role="alert" className="text-caption text-error">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Enviando…" : "Enviar código"}
      </Button>
    </form>
  );
}

/** Tela 4, segundo passo: código de 6 dígitos e nova senha. */
export function NovaSenhaForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(definirNovaSenha, {});
  const [code, setCode] = useState("");

  return (
    <form action={action} className="flex flex-col gap-3">
      <SuccessMessage>Código enviado para {email}</SuccessMessage>

      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="code" value={code} />

      <CodeInput label="Código" value={code} onChange={setCode} error={state.fieldErrors?.code} />

      <PasswordInput
        label="Nova senha"
        name="password"
        autoComplete="new-password"
        required
        hint="Mínimo de 8 caracteres"
        error={state.fieldErrors?.password}
      />

      {state.error ? (
        <p role="alert" className="text-caption text-error">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending || code.length < 6} className="w-full">
        {pending ? "Salvando…" : "Salvar e entrar"}
      </Button>
    </form>
  );
}
