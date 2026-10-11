"use client";

import { useState } from "react";
import Link from "next/link";
import { SearchIcon } from "@/design/icons";
import { OlhoDeSeguir } from "./acoes-do-perfil";

type Seguida = { id: string; nome: string; handle: string; avatarUrl: string | null };

/**
 * A lista de pessoas seguidas (tela 23), com busca.
 *
 * A busca é no cliente, sobre a lista que já veio: quem você segue é uma
 * lista curta por natureza, e uma ida ao servidor a cada tecla seria gasto
 * sem ganho.
 */
export function ListaDeSeguindo({ pessoas }: { pessoas: Seguida[] }) {
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
          aria-label="Buscar pessoas que você segue"
          placeholder="Buscar pessoas que você segue"
          className="text-body text-ink min-w-0 flex-1 border-0 bg-transparent py-2 outline-none"
        />
      </div>

      {/* RN27: a lista é privada, e a tela diz isso. */}
      <p className="text-caption text-inkMuted">Só você vê esta lista.</p>

      {visiveis.length === 0 ? (
        <p className="text-body text-inkMuted">
          {busca ? `Ninguém encontrado para "${termo.trim()}".` : "Você ainda não segue ninguém."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {visiveis.map((pessoa) => (
            <div key={pessoa.id} className="bg-paper flex items-center gap-3 rounded-sm p-3">
              <Link href={`/${pessoa.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="size-avatar rounded-pill bg-lavender block shrink-0 bg-cover bg-center"
                  style={
                    pessoa.avatarUrl ? { backgroundImage: `url(${pessoa.avatarUrl})` } : undefined
                  }
                />
                <span className="min-w-0">
                  <span className="text-bodyStrong text-ink block truncate">{pessoa.nome}</span>
                  <span className="text-caption text-inkMuted block">@{pessoa.handle}</span>
                </span>
              </Link>

              <OlhoDeSeguir
                profileId={pessoa.id}
                handle={pessoa.handle}
                nome={pessoa.nome}
                seguindoInicial
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
