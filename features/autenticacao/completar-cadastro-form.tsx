"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { Button, Checkbox, Input, Steps } from "@/design/components";
import { completarCadastro } from "./actions";
import type { ActionState } from "./shared";

/**
 * Tela 3, versão "Complete seu cadastro".
 *
 * Nome e foto vêm do Google e são editáveis; o @ vem sugerido. A verificação
 * de idade e o aceite acontecem aqui igual a quem veio por email — RN29: o
 * Google não substitui nenhum dos dois.
 */
export function CompletarCadastroForm({
  defaultName,
  defaultHandle,
  avatarUrl,
}: {
  defaultName: string;
  defaultHandle: string;
  avatarUrl: string | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(completarCadastro, {});
  const [accepted, setAccepted] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-3">
      <Steps total={3} current={2} />

      <div className="flex flex-col items-center gap-1">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="Sua foto, vinda do Google"
            width={72}
            height={72}
            className="size-avatarLg rounded-pill"
          />
        ) : (
          <span
            aria-hidden="true"
            className="size-avatarLg rounded-pill bg-lavender inline-block"
          />
        )}
        <p className="text-caption text-inkMuted">
          Foto e nome vieram do Google. Você pode trocar.
        </p>
      </div>

      <input type="hidden" name="avatarUrl" value={avatarUrl ?? ""} />

      <Input
        label="Nome completo"
        name="name"
        defaultValue={defaultName}
        required
        error={state.fieldErrors?.name}
      />
      <Input
        label="@"
        name="handle"
        defaultValue={defaultHandle}
        required
        error={state.fieldErrors?.handle}
      />

      <div className="bg-paper flex flex-col gap-1 rounded-sm p-2">
        <p className="text-bodyStrong text-ink">Verificar idade</p>
        <p className="text-caption text-inkMuted">O Hub é para maiores de 16 anos.</p>
        <Input
          label="Data de nascimento"
          name="birthDate"
          type="date"
          required
          error={state.fieldErrors?.birthDate}
        />
      </div>

      <Checkbox
        checked={accepted}
        onToggle={() => setAccepted((v) => !v)}
        label="Li e concordo com os Termos de uso e a Política de privacidade."
      />
      {accepted ? <input type="hidden" name="acceptedTerms" value="on" /> : null}

      {state.fieldErrors?.acceptedTerms ? (
        <p role="alert" className="text-caption text-error">
          {state.fieldErrors.acceptedTerms}
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-caption text-error">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Salvando…" : "Continuar"}
      </Button>
    </form>
  );
}
