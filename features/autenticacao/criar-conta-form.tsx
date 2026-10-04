"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Checkbox, Input, PasswordInput, Steps } from "@/design/components";
import { criarConta, verificarHandle } from "./actions";
import type { ActionState } from "./shared";
import { GoogleButton } from "./google-button";
import { useEffect, useState } from "react";

/**
 * Tela 3, versão Criar conta.
 *
 * A caixa de aceite e a data de nascimento são obrigatórias **no servidor**
 * (RN29). O que está aqui é conveniência: desmarcar no navegador não cria conta.
 */
export function CriarContaForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(criarConta, {});
  const [accepted, setAccepted] = useState(false);

  const [handle, setHandle] = useState("");
  const [emUso, setEmUso] = useState(false);

  const valor = handle.trim();
  // Derivado na renderização, não guardado em estado: é função pura do que
  // está digitado, e mantê-lo em estado abriria espaço para os dois
  // discordarem.
  const formatoInvalido = valor.length > 0 && !/^[a-z0-9_]{2,20}$/.test(valor);

  /*
   * Avisa que o @ está em uso enquanto a pessoa digita, em vez de só ao
   * enviar — descobrir no fim, depois de preencher tudo, é o pior momento.
   *
   * A espera evita uma consulta por tecla. Isto é conveniência: quem decide é
   * o servidor, que confere de novo e tem o índice único por trás.
   */
  useEffect(() => {
    if (!valor || formatoInvalido) return;

    let cancelado = false;
    const espera = setTimeout(async () => {
      const { livre } = await verificarHandle(valor);
      if (!cancelado) setEmUso(!livre);
    }, 400);

    return () => {
      cancelado = true;
      clearTimeout(espera);
    };
  }, [valor, formatoInvalido]);

  const avisoDoHandle = formatoInvalido
    ? "O @ aceita de 2 a 20 letras minúsculas, números e _"
    : emUso
      ? "Esse @ já está em uso"
      : undefined;

  return (
    <div className="flex flex-col gap-3">
      <Steps total={3} current={2} />

      <form action={action} className="flex flex-col gap-3">
        <Input
          label="Nome completo"
          name="name"
          autoComplete="name"
          required
          error={state.fieldErrors?.name}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          error={state.fieldErrors?.email}
        />
        <Input
          label="@ (opcional)"
          name="handle"
          value={handle}
          onChange={(evento) => {
            setHandle(evento.target.value.toLowerCase());
            setEmUso(false);
          }}
          autoComplete="username"
          hint="Como as pessoas vão te encontrar. Em branco, criamos um a partir do seu nome."
          error={state.fieldErrors?.handle ?? avisoDoHandle}
        />
        <PasswordInput
          label="Senha"
          name="password"
          autoComplete="new-password"
          required
          hint="Mínimo de 8 caracteres"
          error={state.fieldErrors?.password}
        />

        {/* RN29: verificação de idade, sem autodeclaração. A data é pista para
            o verificador, nunca a prova. */}
        <div className="bg-paper flex flex-col gap-1 rounded-sm p-2">
          <p className="text-bodyStrong text-ink">Verificar idade</p>
          <p className="text-caption text-inkMuted">O Hub é para maiores de 18 anos.</p>
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
        {/* A caixa só chega ao servidor quando marcada — é assim que o aceite
            vira obrigatório lá, e não só aqui. */}
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
          {pending ? "Criando…" : "Continuar"}
        </Button>
      </form>

      {googleEnabled ? (
        <>
          <p className="text-caption text-inkMuted text-center">ou</p>
          <GoogleButton />
        </>
      ) : null}

      <p className="text-caption text-inkMuted text-center">
        Já tenho conta.{" "}
        <Link href="/entrar" className="underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
