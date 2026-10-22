"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { BottomSheet, Button, ConfirmSheet, FollowButton } from "@/design/components";
import {
  CabinNavIcon,
  FollowIcon,
  FollowingIcon,
  MoreOptionsIcon,
  SettingsIcon,
} from "@/design/icons";
import { BotaoDoCanto } from "./botao-do-canto";
import { alternarBloqueio, alternarSeguir, alternarSilencio } from "./actions";

/**
 * As ações do canto superior direito do perfil.
 *
 * Botões redondos só com ícone, como a v3 pede — e por isso **todos levam
 * `aria-label`**: sem texto ao lado, o rótulo é a única coisa que diz o que
 * o botão faz.
 *
 * Para o dono é um só, a engrenagem, que abre Editar perfil. Ela toma o
 * lugar dos dois links largos que havia aqui ("Editar perfil" e
 * "Configurações"); `/configuracoes` continua a um clique, na engrenagem do
 * pé da barra lateral, onde moram conta, privacidade e notificações.
 */
export function AcoesDoPerfil({
  souEu,
  profileId,
  handle,
  nome,
  seguindoInicial,
  bloqueadoInicial,
  silenciadoInicial,
  convitePendente = false,
}: {
  souEu: boolean;
  profileId: string;
  handle: string;
  nome: string;
  seguindoInicial: boolean;
  bloqueadoInicial: boolean;
  silenciadoInicial: boolean;
  convitePendente?: boolean;
}) {
  const [seguindo, setSeguindo] = useState(seguindoInicial);
  const [aberto, setAberto] = useState<"nenhum" | "menu" | "bloquear">("nenhum");
  const [pendente, iniciar] = useTransition();
  const idDoMenu = useId();

  if (souEu) {
    return (
      <BotaoDoCanto como="link" href="/perfil/editar" rotulo="Editar perfil" tom="claro">
        <SettingsIcon decorative className="size-icon" />
      </BotaoDoCanto>
    );
  }

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

  /*
   * Bloqueado: seguir e Cabine deixam de fazer sentido, e os botões somem em
   * vez de aparecerem desativados — eles não voltariam a funcionar sem
   * desbloquear, e um botão desativado sem explicação é pior que nenhum.
   */
  return (
    <div className="flex items-start gap-2">
      {bloqueadoInicial ? (
        <Button
          variant="secondary"
          size="sm"
          disabled={pendente}
          onClick={() => iniciar(() => alternarBloqueio(profileId, handle, true))}
        >
          Desbloquear
        </Button>
      ) : (
        <>
          {/*
            Seguir em sun, seguindo em ink: a forma do ícone muda junto (olho
            vira olho com tique), porque cor sozinha não pode carregar estado.
          */}
          <BotaoDoCanto
            como="botao"
            rotulo={seguindo ? `Seguindo ${nome}. Toque para deixar de seguir` : `Seguir ${nome}`}
            pressionado={seguindo}
            tom={seguindo ? "escuro" : "destaque"}
            desabilitado={pendente}
            onClick={alternar}
          >
            {seguindo ? (
              <FollowingIcon decorative className="size-icon" />
            ) : (
              <FollowIcon decorative className="size-icon" />
            )}
          </BotaoDoCanto>

          {/*
            A RN20 tem duas formas: se vocês já se seguem a conversa abre na
            hora, senão vai convite. Quem decide é a tela de Cabine — este
            botão só leva até lá, com a pessoa já escolhida.
          */}
          <BotaoDoCanto
            como="link"
            href={`/cabines/nova?com=${handle}`}
            rotulo={
              convitePendente
                ? `Convite de Cabine para ${nome} esperando resposta`
                : `Abrir uma Cabine com ${nome}`
            }
            tom="lavanda"
            aviso={convitePendente}
          >
            <CabinNavIcon decorative className="size-icon" />
          </BotaoDoCanto>
        </>
      )}

      <BotaoDoCanto
        como="botao"
        rotulo={`Mais opções sobre ${nome}`}
        tom="claro"
        expandido={aberto === "menu"}
        controla={idDoMenu}
        onClick={() => setAberto((a) => (a === "menu" ? "nenhum" : "menu"))}
      >
        <MoreOptionsIcon decorative className="size-icon" />
      </BotaoDoCanto>

      <div id={idDoMenu}>
        <BottomSheet title={nome} open={aberto === "menu"}>
          <div className="flex flex-col gap-1">
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
