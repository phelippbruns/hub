"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import {
  BottomSheet,
  Button,
  CommunityCover,
  CommunityDoor,
  ConfirmSheet,
  CoverButton,
} from "@/design/components";
import { BackIcon, MoreOptionsIcon, ShareIcon } from "@/design/icons";
import { alternarMembro, alternarPainel } from "./actions";
import type { PaginaDaComunidade } from "@/lib/data/comunidades";

function numero(valor: number) {
  return valor.toLocaleString("pt-BR");
}

/**
 * A capa da comunidade e tudo que se abre a partir dela (tela 14).
 *
 * Os três estados — compartilhar, sair e o menu — moram aqui juntos porque
 * são **excludentes**: abrir um fecha os outros. Separados em componentes
 * diferentes, dois poderiam ficar abertos ao mesmo tempo.
 */
export function CabecalhoDaComunidade({
  comunidade,
  painelOculto,
}: {
  comunidade: PaginaDaComunidade;
  painelOculto: boolean;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState<"nenhum" | "compartilhar" | "sair" | "menu">("nenhum");
  const [membro, setMembro] = useState(comunidade.souMembro);
  const [membros, setMembros] = useState(comunidade.membersCount);
  const [pendente, iniciar] = useTransition();

  const idDoMenu = useId();
  const idDeCompartilhar = useId();

  function abrir(qual: typeof aberto) {
    setAberto((atual) => (atual === qual ? "nenhum" : qual));
  }

  /** Entrar é direto; sair passa pela confirmação. */
  function tocarNaPorta() {
    if (membro) {
      abrir("sair");
      return;
    }

    setMembro(true);
    setMembros(membros + 1);
    iniciar(async () => {
      try {
        await alternarMembro(comunidade.id, comunidade.slug, false);
      } catch {
        setMembro(false);
        setMembros(membros);
      }
    });
  }

  function confirmarSaida() {
    const tinha = membros;
    setMembro(false);
    setMembros(tinha - 1);
    setAberto("nenhum");

    iniciar(async () => {
      try {
        await alternarMembro(comunidade.id, comunidade.slug, true);
      } catch {
        setMembro(true);
        setMembros(tinha);
      }
    });
  }

  const moderadores = comunidade.moderadores;
  const quemModera =
    moderadores.length === 0
      ? "Ainda sem moderação"
      : moderadores.length === 1
        ? `Moderada por ${moderadores[0]!.name}`
        : `Moderada por ${moderadores[0]!.name} e mais ${moderadores.length - 1} ${
            moderadores.length - 1 === 1 ? "moderador" : "moderadores"
          }`;

  return (
    <div className="flex flex-col gap-3">
      <CommunityCover
        name={comunidade.name}
        coverUrl={comunidade.coverUrl}
        esquerda={
          <CoverButton label="Voltar" onClick={() => router.back()}>
            <BackIcon decorative className="size-icon" />
          </CoverButton>
        }
        direita={
          <>
            <CoverButton
              label={`Compartilhar ${comunidade.name}`}
              ativo={aberto === "compartilhar"}
              controla={idDeCompartilhar}
              onClick={() => abrir("compartilhar")}
            >
              <ShareIcon decorative className="size-icon" />
            </CoverButton>
            <CoverButton
              label="Mais opções"
              ativo={aberto === "menu"}
              controla={idDoMenu}
              onClick={() => abrir("menu")}
            >
              <MoreOptionsIcon decorative className="size-icon" />
            </CoverButton>
          </>
        }
      >
        <CommunityDoor
          member={membro}
          oQue={comunidade.name}
          onToggle={pendente ? undefined : tocarNaPorta}
        />
        <span className="text-caption text-paper">
          {numero(membros)} {membros === 1 ? "membro" : "membros"}
        </span>
      </CommunityCover>

      <div id={idDeCompartilhar}>
        <BottomSheet title={`Compartilhar ${comunidade.name}`} open={aberto === "compartilhar"}>
          {/* Enviar para pessoas é da F14; copiar o link já serve hoje. */}
          <p className="text-body text-inkMuted">
            Enviar para pessoas do Hub chega na F14. Por enquanto, copie o endereço da página.
          </p>
          <Button variant="secondary" onClick={() => setAberto("nenhum")}>
            Fechar
          </Button>
        </BottomSheet>
      </div>

      <div id={idDoMenu}>
        <BottomSheet title={comunidade.name} open={aberto === "menu"}>
          <p className="text-body text-inkMuted">{quemModera}</p>

          <div className="flex flex-col gap-1">
            {comunidade.souModerador ? (
              <Link href={`/c/${comunidade.slug}/moderar`}>
                <Button variant="secondary" className="w-full">
                  Moderar
                </Button>
              </Link>
            ) : null}

            <Link href={`/denuncia?comunidade=${comunidade.slug}`}>
              <Button variant="secondary" className="w-full">
                Denunciar comunidade
              </Button>
            </Link>

            <Button
              variant="secondary"
              onClick={() => {
                setAberto("nenhum");
                iniciar(() => alternarPainel(!painelOculto));
              }}
            >
              {painelOculto ? "Mostrar painel lateral" : "Ocultar painel lateral"}
            </Button>
          </div>
        </BottomSheet>
      </div>

      <ConfirmSheet
        open={aberto === "sair"}
        titulo={`Sair de ${comunidade.name}?`}
        descricao="Você deixa de ver os Hot Topics dela no Início. Seus tópicos e respostas continuam na comunidade. Se você modera, a moderação passa para o membro mais ativo."
        confirmar="Sair"
        cancelar="Continuar membro"
        pendente={pendente}
        onConfirm={confirmarSaida}
        onCancel={() => setAberto("nenhum")}
      />
    </div>
  );
}
