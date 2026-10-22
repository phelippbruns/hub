"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { Button, ConfirmSheet, FollowButton, MenuSuspenso } from "@/design/components";
import {
  CabinNavIcon,
  FollowIcon,
  FollowingIcon,
  MoreOptionsIcon,
  SettingsIcon,
} from "@/design/icons";
import { BotaoDoCanto } from "./botao-do-canto";
import { abrirConversa, alternarBloqueio, alternarSeguir, alternarSilencio } from "./actions";

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
  const [erroDaCabine, setErroDaCabine] = useState<string | null>(null);
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
            Um clique, um destino: a conversa. Antes isto levava à tela de
            escolher pessoas — com busca e sugestões na frente de quem já
            tinha escolhido com quem falar. Quem resolve para onde ir é o
            servidor: conversa que já existe, conversa que começa agora
            (RN20) ou Cabine nova com o convite pendente.
          */}
          <BotaoDoCanto
            como="botao"
            rotulo={
              convitePendente
                ? `Continuar a conversa com ${nome}, que ainda não aceitou`
                : `Abrir uma Cabine com ${nome}`
            }
            tom="lavanda"
            aviso={convitePendente}
            desabilitado={pendente}
            onClick={() => {
              setErroDaCabine(null);
              iniciar(async () => {
                const resultado = await abrirConversa(profileId);
                if (resultado?.erro) setErroDaCabine(resultado.erro);
              });
            }}
          >
            <CabinNavIcon decorative className="size-icon" />
          </BotaoDoCanto>
        </>
      )}

      {/*
        Menu ancorado, e não folha inferior: a folha era desenhada no fluxo
        da página e **empurrava o perfil inteiro para baixo** a cada clique
        no "...". É o mesmo conserto que a Cabine já tinha recebido.

        O botão fica **dentro** do `relative`, e não ao lado: é a caixa dele
        que o menu usa como âncora. Com o `relative` numa caixa vazia ao
        lado, o menu subia e cobria os botões em vez de descer abaixo do
        "..." — a caixa tinha altura zero, e "abaixo dela" é o topo da linha.
      */}
      <div className="relative">
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
          <MenuSuspenso
            titulo={`Opções sobre ${nome}`}
            aberto={aberto === "menu"}
            onFechar={() => setAberto("nenhum")}
          >
            <Link href={`/denuncia?perfil=${handle}`} onClick={() => setAberto("nenhum")}>
              <Button variant="secondary" size="sm" className="w-full">
                Denunciar perfil
              </Button>
            </Link>

            <Button
              variant="secondary"
              size="sm"
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

            <Button variant="danger" size="sm" onClick={() => setAberto("bloquear")}>
              {bloqueadoInicial ? "Desbloquear" : "Bloquear"}
            </Button>
          </MenuSuspenso>
        </div>
      </div>

      {erroDaCabine ? (
        <p
          role="alert"
          className="bg-paper text-caption text-error top-navItem w-contextPanel absolute right-0 mt-1 rounded-sm p-2"
        >
          {erroDaCabine}
        </p>
      ) : null}

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
