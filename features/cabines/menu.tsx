"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { Button, ConfirmSheet, MenuSuspenso, RoundIconButton } from "@/design/components";
import { MoreOptionsIcon } from "@/design/icons";
import { bloquearDaCabine, sairDaCabine } from "./actions";

export type ParticipanteNoMenu = { id: string; nome: string; handle: string; souEu: boolean };

/**
 * O menu da Cabine (tela 20).
 *
 * "Ocultar participantes" só existe na web, porque é o painel da direita que
 * ele esconde — no celular não há painel. A preferência fica na pessoa, não
 * no aparelho, como a da comunidade.
 */
export function MenuDaCabine({
  cabinId,
  participantes,
}: {
  cabinId: string;
  participantes: ParticipanteNoMenu[];
}) {
  const [aberto, setAberto] = useState<"nenhum" | "menu" | "sair" | "bloquear">("nenhum");
  const [pendente, iniciar] = useTransition();
  const idDoMenu = useId();

  const outros = participantes.filter((pessoa) => !pessoa.souEu);
  const [paraBloquear, setParaBloquear] = useState<ParticipanteNoMenu | null>(null);

  return (
    /*
     * `relative`: é este contêiner que ancora o menu suspenso. Antes era
     * uma folha desenhada no fluxo da página, e abrir o "..." empurrava a
     * conversa inteira para baixo.
     */
    <div className="relative">
      <RoundIconButton
        label="Opções da Cabine"
        ativo={aberto === "menu"}
        controla={idDoMenu}
        onClick={() => setAberto((a) => (a === "menu" ? "nenhum" : "menu"))}
      >
        <MoreOptionsIcon decorative className="size-icon" />
      </RoundIconButton>

      <div id={idDoMenu}>
        <MenuSuspenso
          titulo="Cabine"
          aberto={aberto === "menu"}
          onFechar={() => setAberto("nenhum")}
        >
          <div className="flex flex-col gap-1">
            <Link href={`/cabines/nova?cabine=${cabinId}`}>
              <Button variant="secondary" className="w-full">
                Convidar pessoas
              </Button>
            </Link>

            {/*
             * Denunciar aqui é sobre **a pessoa**, nunca sobre a conversa.
             * Nem o servidor entrega mensagem de Cabine a quem não participa
             * (RN27), e abrir exceção para a moderação quebraria a promessa
             * para todo mundo — inclusive para quem nunca denunciou nada.
             */}
            {outros.map((pessoa) => (
              <Link key={`d-${pessoa.id}`} href={`/denuncia?perfil=${pessoa.handle}`}>
                <Button variant="secondary" className="w-full">
                  Denunciar {pessoa.nome}
                </Button>
              </Link>
            ))}

            {outros.map((pessoa) => (
              <Button
                key={pessoa.id}
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setParaBloquear(pessoa);
                  setAberto("bloquear");
                }}
              >
                Bloquear {pessoa.nome}
              </Button>
            ))}

            <Button variant="danger" onClick={() => setAberto("sair")}>
              Sair da Cabine
            </Button>

            {/* RN24: a consequência vem escrita, antes de a pessoa decidir. */}
            <p className="text-caption text-inkMuted">
              Se só uma pessoa ficar, a Cabine se encerra.
            </p>
          </div>
        </MenuSuspenso>
      </div>

      <ConfirmSheet
        open={aberto === "sair"}
        titulo="Sair desta Cabine?"
        descricao="Você só volta por um novo convite. Se sobrar uma pessoa, a Cabine se encerra."
        confirmar="Sair da Cabine"
        pendente={pendente}
        onConfirm={() => iniciar(() => sairDaCabine(cabinId))}
        onCancel={() => setAberto("nenhum")}
      />

      <ConfirmSheet
        open={aberto === "bloquear" && paraBloquear !== null}
        titulo={`Bloquear ${paraBloquear?.nome}?`}
        descricao="Vocês param de se ver no Hub, e esta pessoa sai das Cabines que vocês dividem. Ela não é avisada."
        confirmar="Bloquear"
        pendente={pendente}
        onConfirm={() => paraBloquear && iniciar(() => bloquearDaCabine(paraBloquear.id))}
        onCancel={() => setAberto("nenhum")}
      />
    </div>
  );
}
