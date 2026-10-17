"use client";

import { useRouter } from "next/navigation";
import { Segmented } from "@/design/components";

/**
 * A ordem das respostas (tela 15).
 *
 * A escolha vai na URL, como a ordem dos tópicos na comunidade: o endereço
 * fica compartilhável e o botão voltar funciona.
 *
 * "Mais novas" é o padrão. Quem quiser ler o tópico como conversa, do começo,
 * escolhe "Mais antigas" — por isso as duas opções têm nome, e não ícone.
 */
export function OrdemDasRespostas({ endereco, atual }: { endereco: string; atual: string }) {
  const router = useRouter();

  return (
    <Segmented
      label="Ordem das respostas"
      atual={atual}
      opcoes={[
        { id: "recentes", label: "Mais novas" },
        { id: "antigas", label: "Mais antigas" },
      ]}
      onSelect={(id) => router.push(id === "recentes" ? endereco : `${endereco}?ordem=${id}`)}
    />
  );
}
