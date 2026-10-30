"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, Input, TextField } from "@/design/components";
import { criarComunidade, type EstadoDaCriacao } from "./actions";
import { CapaEditavel } from "./capa-editavel";

/**
 * Tela 13: criar comunidade.
 *
 * O aviso do corte de 20 membros fica visível desde antes de criar, e não
 * depois: quem acaba de criar uma comunidade e não a encontra em Explorar
 * acha que deu errado.
 */
export function FormularioNovaComunidade() {
  const [estado, acao, pendente] = useActionState<EstadoDaCriacao, FormData>(criarComunidade, {});
  const [nome, setNome] = useState("");

  return (
    <form action={acao} className="flex flex-col gap-3">
      {/*
        A capa entra já na criação, e o ajuste acontece dentro do próprio
        retângulo dela — o mesmo componente da tela da comunidade e a mesma
        mecânica da foto de perfil. Virou padrão de sistema na F20.

        Antes a comunidade nascia com a capa padrão e só quem modera trocava
        depois, pelo menu de três pontos: quem acabou de criar precisava
        descobrir um menu para terminar o que estava fazendo.

        Aqui o OK só fecha o ajuste. Não há para onde enviar a imagem ainda:
        a comunidade nasce no envio do formulário, e subir o arquivo antes
        de o nome ser validado desperdiçaria um arquivo a cada nome repetido.
      */}
      <CapaEditavel nome={nome || "Sua comunidade"} capaAtual={null} rotulo="Escolher a capa" />

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

      <Button type="submit" disabled={pendente}>
        Criar comunidade
      </Button>
    </form>
  );
}
