"use client";

import { useState } from "react";
import { Button, EmptyState, SectionTitle } from "@/design/components";
import { CartaoDoEvento } from "./cartao";
import { FormularioDeEvento } from "./formulario";
import type { ParaEntrar } from "@/features/comunidades/janela-de-entrada";
import type { EventoNaTela } from "@/lib/data/eventos";

/**
 * A aba Eventos da comunidade (RN38).
 *
 * Dividida em próximos e anteriores, como o protótipo v6 mostra. A
 * separação é a hora de começar, e não um campo de "encerrado" que
 * alguém esqueceria de virar.
 *
 * **Não existe "Adicionar à agenda"**, por escolha do PO.
 */
export function ListaDeEventos({
  slug,
  communityId,
  eventos,
  souMembro,
  paraEntrar,
}: {
  slug: string;
  communityId: string;
  eventos: EventoNaTela[];
  souMembro: boolean;
  /** O que a janela de entrada precisa saber, para quem não participa. */
  paraEntrar: ParaEntrar;
}) {
  const [criando, setCriando] = useState(false);

  const proximos = eventos.filter((e) => !e.passou);
  const anteriores = eventos.filter((e) => e.passou).reverse();

  return (
    <div className="flex flex-col gap-3">
      {/*
        O botão vai na `acao` do `SectionTitle`, como nas outras abas, e não
        numa linha montada à mão. O protótipo v6 põe "+ Criar evento" na
        linha do título, e a linha à mão deixava o título e o subtítulo
        empurrando o botão — era o print de "Criar evento deslocado".
      */}
      <div className="flex flex-col gap-1">
        <SectionTitle
          contagem={eventos.length}
          acao={
            souMembro ? (
              <Button size="sm" onClick={() => setCriando(true)}>
                Criar evento
              </Button>
            ) : undefined
          }
        >
          Eventos
        </SectionTitle>
        <p className="text-caption text-inkMuted">Eventos online e presenciais da comunidade.</p>
      </div>

      <FormularioDeEvento
        slug={slug}
        communityId={communityId}
        aberto={criando}
        aoFechar={() => setCriando(false)}
      />

      {eventos.length === 0 ? (
        <EmptyState
          title="Nenhum evento marcado"
          description="Um evento online é o jeito mais rápido de as pessoas se conhecerem."
        />
      ) : null}

      {proximos.length > 0 ? (
        <>
          <h3 className="text-label text-inkMuted">PRÓXIMOS</h3>
          <div className="flex flex-col gap-2">
            {proximos.map((evento) => (
              <CartaoDoEvento
                key={evento.id}
                evento={evento}
                slug={slug}
                souMembro={souMembro}
                paraEntrar={paraEntrar}
              />
            ))}
          </div>
        </>
      ) : null}

      {anteriores.length > 0 ? (
        <>
          <h3 className="text-label text-inkMuted">ANTERIORES</h3>
          <div className="flex flex-col gap-2">
            {anteriores.map((evento) => (
              <CartaoDoEvento
                key={evento.id}
                evento={evento}
                slug={slug}
                souMembro={souMembro}
                paraEntrar={paraEntrar}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
