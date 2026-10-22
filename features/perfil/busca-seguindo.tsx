"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/design/components";
import { SearchIcon } from "@/design/icons";
import { OlhoDeSeguir } from "./acoes-do-perfil";

type Seguida = {
  id: string;
  nome: string;
  handle: string;
  avatarUrl: string | null;
  /** Se **eu** sigo esta pessoa. Na lista de seguidores pode ser falso. */
  euSigo: boolean;
};

/**
 * A lista de pessoas, com busca (telas 23 e seguidores).
 *
 * Serve às duas listas porque elas são a mesma coisa vista de dois lados, e
 * duas cópias divergiriam no dia em que uma ganhasse um detalhe. O que muda
 * é o texto e o estado do olho: na lista de seguidores eu posso não seguir
 * de volta.
 *
 * A busca é no cliente, sobre a lista que já veio: são listas curtas por
 * natureza, e uma ida ao servidor a cada tecla seria gasto sem ganho.
 */
export function ListaDeSeguindo({
  pessoas,
  ehSeguidores = false,
}: {
  pessoas: Seguida[];
  ehSeguidores?: boolean;
}) {
  const [termo, setTermo] = useState("");

  const busca = termo.trim().toLowerCase();
  const visiveis = busca
    ? pessoas.filter(
        (p) => p.nome.toLowerCase().includes(busca) || p.handle.toLowerCase().includes(busca),
      )
    : pessoas;

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-paper border-inkMuted box-border flex items-center gap-2 rounded-sm border-2 px-2">
        <SearchIcon decorative className="size-iconSm text-inkMuted shrink-0" />
        <input
          type="search"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          aria-label={ehSeguidores ? "Buscar quem segue você" : "Buscar pessoas que você segue"}
          placeholder={ehSeguidores ? "Buscar quem segue você" : "Buscar pessoas que você segue"}
          className="text-body text-ink min-w-0 flex-1 border-0 bg-transparent py-2 outline-none"
        />
      </div>

      {/* RN27: a lista é privada, e a tela diz isso. */}
      <p className="text-caption text-inkMuted">Só você vê esta lista.</p>

      {visiveis.length === 0 ? (
        <p className="text-body text-inkMuted">
          {busca
            ? `Ninguém encontrado para "${termo.trim()}".`
            : ehSeguidores
              ? "Ninguém segue você ainda."
              : "Você ainda não segue ninguém."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {visiveis.map((pessoa) => (
            <div key={pessoa.id} className="bg-paper flex items-center gap-3 rounded-sm p-3">
              <Link href={`/${pessoa.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar nome={pessoa.nome} url={pessoa.avatarUrl} tamanho="sm" />
                <span className="min-w-0">
                  <span className="text-bodyStrong text-ink block truncate">{pessoa.nome}</span>
                  <span className="text-caption text-inkMuted block">@{pessoa.handle}</span>
                </span>
              </Link>

              <OlhoDeSeguir
                profileId={pessoa.id}
                handle={pessoa.handle}
                nome={pessoa.nome}
                seguindoInicial={pessoa.euSigo}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
