"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import {
  BottomSheet,
  Button,
  ConfirmSheet,
  FollowButton,
  RoundIconButton,
} from "@/design/components";
import { CabinNavIcon } from "@/design/icons";
import { MoreOptionsIcon } from "@/design/icons";
import { alternarBloqueio, alternarSeguir, alternarSilencio } from "./actions";

/**
 * Seguir, Cabine e o menu, no perfil de outra pessoa (tela 24).
 *
 * Seguir e Cabine dividem a linha, como o protótipo mostra: são as duas
 * coisas que alguém quer fazer depois de ler uma resposta que gostou.
 */
export function AcoesDoPerfil({
  profileId,
  handle,
  nome,
  seguindoInicial,
  bloqueadoInicial,
  silenciadoInicial,
}: {
  profileId: string;
  handle: string;
  nome: string;
  seguindoInicial: boolean;
  bloqueadoInicial: boolean;
  silenciadoInicial: boolean;
}) {
  const [seguindo, setSeguindo] = useState(seguindoInicial);
  const [aberto, setAberto] = useState<"nenhum" | "menu" | "bloquear">("nenhum");
  const [pendente, iniciar] = useTransition();
  const idDoMenu = useId();

  function alternar() {
    const estava = seguindo;
    setSeguindo(!estava);

    iniciar(async () => {
      try {
        await alternarSeguir(profileId, handle, estava);
      } catch {
        setSeguindo(estava);
      }
    });
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-2">
        {/*
          Bloqueado: seguir deixa de fazer sentido, e o botão some em vez de
          aparecer desativado — ele não voltaria a funcionar sem desbloquear.
        */}
        {bloqueadoInicial ? (
          <Button
            variant="secondary"
            className="flex-1"
            disabled={pendente}
            onClick={() => iniciar(() => alternarBloqueio(profileId, handle, true))}
          >
            Desbloquear
          </Button>
        ) : (
          <>
            <Button
              variant={seguindo ? "secondary" : "primary"}
              className="flex-1"
              disabled={pendente}
              onClick={alternar}
            >
              {seguindo ? "Seguindo" : "Seguir"}
            </Button>

            {/* A Cabine chega na F13; o botão já leva à tela dela. */}
            <Link href={`/cabines/nova?com=${handle}`} className="flex-1">
              <Button variant="secondary" className="w-full">
                <CabinNavIcon decorative className="size-icon" /> Cabine
              </Button>
            </Link>
          </>
        )}

        <RoundIconButton
          label={`Mais opções sobre ${nome}`}
          ativo={aberto === "menu"}
          controla={idDoMenu}
          onClick={() => setAberto((a) => (a === "menu" ? "nenhum" : "menu"))}
        >
          <MoreOptionsIcon decorative className="size-icon" />
        </RoundIconButton>
      </div>

      <div id={idDoMenu}>
        <BottomSheet title={nome} open={aberto === "menu"}>
          <div className="flex flex-col gap-1">
            {/* Denunciar chega na F16, com o fluxo de moderação. */}
            <Link href={`/denuncia?perfil=${handle}`}>
              <Button variant="secondary" className="w-full">
                Denunciar perfil
              </Button>
            </Link>

            <Button
              variant="secondary"
              disabled={pendente}
              onClick={() => {
                setAberto("nenhum");
                iniciar(() => alternarSilencio(profileId, handle, silenciadoInicial));
              }}
            >
              {silenciadoInicial ? "Deixar de silenciar" : "Silenciar no Início"}
            </Button>
            <p className="text-caption text-inkMuted">
              Silenciar tira {nome} do seu Início. Ela continua te vendo normalmente e não fica
              sabendo.
            </p>

            <Button variant="danger" onClick={() => setAberto("bloquear")}>
              {bloqueadoInicial ? "Desbloquear" : "Bloquear"}
            </Button>
          </div>
        </BottomSheet>
      </div>

      <ConfirmSheet
        open={aberto === "bloquear"}
        titulo={bloqueadoInicial ? `Desbloquear ${nome}?` : `Bloquear ${nome}?`}
        descricao={
          bloqueadoInicial
            ? "Vocês voltam a se ver no Hub. Seguir de novo é escolha sua."
            : `Vocês param de se ver no Hub, nos dois sentidos, e deixam de se seguir. ${nome} não fica sabendo.`
        }
        confirmar={bloqueadoInicial ? "Desbloquear" : "Bloquear"}
        pendente={pendente}
        onConfirm={() => {
          setAberto("nenhum");
          iniciar(() => alternarBloqueio(profileId, handle, bloqueadoInicial));
        }}
        onCancel={() => setAberto("nenhum")}
      />
    </div>
  );
}

/** O olho de seguir, usado na lista de pessoas seguidas. */
export function OlhoDeSeguir({
  profileId,
  handle,
  nome,
  seguindoInicial,
}: {
  profileId: string;
  handle: string;
  nome: string;
  seguindoInicial: boolean;
}) {
  const [seguindo, setSeguindo] = useState(seguindoInicial);
  const [pendente, iniciar] = useTransition();

  return (
    <FollowButton
      seguindo={seguindo}
      oQue={nome}
      onToggle={
        pendente
          ? undefined
          : () => {
              const estava = seguindo;
              setSeguindo(!estava);
              iniciar(async () => {
                try {
                  await alternarSeguir(profileId, handle, estava);
                } catch {
                  setSeguindo(estava);
                }
              });
            }
      }
    />
  );
}
