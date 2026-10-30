"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useId, useRef, useState, useTransition } from "react";
import {
  Avatar,
  BottomSheet,
  Button,
  CommunityDoor,
  ConfirmSheet,
  MenuSuspenso,
  RoundIconButton,
} from "@/design/components";
import { BackIcon, MoreOptionsIcon, ShareIcon } from "@/design/icons";
import { alternarMembro, trocarCapaDaComunidade } from "./actions";
import { CapaEditavel } from "./capa-editavel";
import { Compartilhar, type PessoaParaCompartilhar } from "@/features/convite/compartilhar";
import type { PaginaDaComunidade } from "@/lib/data/comunidades";

function numero(valor: number) {
  return valor.toLocaleString("pt-BR");
}

/** Mês e ano: o dia exato de uma comunidade não interessa a ninguém. */
function mesEAno(data: Date) {
  return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

/**
 * A capa da comunidade e tudo que se abre a partir dela (tela 14).
 *
 * Os três estados — compartilhar, sair e o menu — moram aqui juntos porque
 * são **excludentes**: abrir um fecha os outros. Separados em componentes
 * diferentes, dois poderiam ficar abertos ao mesmo tempo.
 *
 * Compartilhar e o menu abrem como **drop**, logo abaixo do botão que os
 * abriu, e não como folha subindo do rodapé: pedido do PO em 29 de outubro,
 * e o mesmo `MenuSuspenso` que o perfil e a Cabine já usam. A folha
 * continua existindo para a confirmação de saída, que é interrupção de
 * propósito.
 */
export function CabecalhoDaComunidade({
  comunidade,
  paraCompartilhar,
}: {
  comunidade: PaginaDaComunidade;
  /** Quem pode receber o link (F14). Vem pronto do servidor. */
  paraCompartilhar: PessoaParaCompartilhar[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState<"nenhum" | "compartilhar" | "sair" | "menu" | "regras">(
    "nenhum",
  );
  const [membro, setMembro] = useState(comunidade.souMembro);
  const [membros, setMembros] = useState(comunidade.membersCount);
  const [pendente, iniciar] = useTransition();
  const [estadoDaCapa, trocarCapa] = useActionState(trocarCapaDaComunidade, {});
  const formularioDaCapa = useRef<HTMLFormElement>(null);

  const idDoMenu = useId();
  const idDeCompartilhar = useId();

  function abrir(qual: typeof aberto) {
    setAberto((atual) => (atual === qual ? "nenhum" : qual));
  }

  /*
   * Quem sai sozinho leva a comunidade junto (RN35), e quem modera entrega
   * a moderação (RN06). Fora esses dois casos, **sair é um clique** —
   * decisão do PO em 29 de outubro: numa comunidade pública não há o que
   * confirmar, e a folha só atrasava quem já tinha decidido.
   */
  const ultimaPessoa = membros <= 1;
  const entregaModeracao = comunidade.souModerador && !ultimaPessoa;
  const saidaPesa = ultimaPessoa || entregaModeracao;

  /*
   * Entrar é um clique **quando não há o que ler**. Com regras escritas, a
   * folha aparece antes: concordar com uma regra que ninguém mostrou não é
   * concordar com nada, e é a moderação dessa comunidade que vai cobrar
   * depois.
   *
   * Sem regras, nada muda — pôr uma janela na frente de toda entrada seria
   * o mesmo vacilo da confirmação de sair, do outro lado da porta.
   */
  const temRegras = comunidade.regras.length > 0;

  function tocarNaPorta() {
    if (!membro) {
      if (temRegras) {
        abrir("regras");
        return;
      }
      entrar();
      return;
    }

    if (saidaPesa) {
      abrir("sair");
      return;
    }

    sair();
  }

  function entrar() {
    const tinha = membros;
    setMembro(true);
    setMembros(tinha + 1);
    setAberto("nenhum");

    iniciar(async () => {
      try {
        await alternarMembro(comunidade.id, comunidade.slug, false);
      } catch {
        setMembro(false);
        setMembros(tinha);
      }
    });
  }

  function sair() {
    const tinha = membros;
    setMembro(false);
    setMembros(tinha - 1);
    setAberto("nenhum");

    iniciar(async () => {
      try {
        const { comunidadeApagada } = await alternarMembro(comunidade.id, comunidade.slug, true);
        // A comunidade deixou de existir: ficar aqui mostraria um 404.
        if (comunidadeApagada) router.push("/comunidades/minhas");
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
      <form ref={formularioDaCapa} action={trocarCapa}>
        <input type="hidden" name="comunidade" value={comunidade.slug} />

        <CapaEditavel
          nome={comunidade.name}
          capaAtual={comunidade.coverUrl}
          medidasAtuais={comunidade.medidasDaCapa}
          zoomAtual={comunidade.zoomDaCapa}
          ancoraAtual={comunidade.ancoraDaCapa}
          podeEditar={comunidade.souModerador}
          // O OK aplica: aqui já existe comunidade para onde a capa vai.
          aoConfirmar={() => formularioDaCapa.current?.requestSubmit()}
          esquerda={
            <RoundIconButton label="Voltar" onClick={() => router.back()}>
              <BackIcon decorative className="size-icon" />
            </RoundIconButton>
          }
          direita={
            <>
              {/*
                O `relative` é de cada botão, e não do bloco: é dele que o
                drop se pendura. No bloco, os dois menus abririam a partir
                do mesmo canto e o de compartilhar sairia torto.
              */}
              <span className="relative">
                <RoundIconButton
                  label={`Compartilhar ${comunidade.name}`}
                  ativo={aberto === "compartilhar"}
                  controla={idDeCompartilhar}
                  onClick={() => abrir("compartilhar")}
                >
                  <ShareIcon decorative className="size-icon" />
                </RoundIconButton>

                <span id={idDeCompartilhar}>
                  <MenuSuspenso
                    titulo={`Compartilhar ${comunidade.name}`}
                    aberto={aberto === "compartilhar"}
                    onFechar={() => setAberto("nenhum")}
                  >
                    {/*
                      Montado só quando abre: a busca de pessoas é uma ida
                      ao servidor, e ninguém paga por ela sem ter pedido
                      para compartilhar.
                    */}
                    {aberto === "compartilhar" ? (
                      <Compartilhar
                        tipo="comunidade"
                        id={comunidade.id}
                        nome={comunidade.name}
                        endereco={`/c/${comunidade.slug}`}
                        pessoas={paraCompartilhar}
                        aoFechar={() => setAberto("nenhum")}
                      />
                    ) : null}
                  </MenuSuspenso>
                </span>
              </span>

              <span className="relative">
                <RoundIconButton
                  label="Mais opções"
                  ativo={aberto === "menu"}
                  controla={idDoMenu}
                  onClick={() => abrir("menu")}
                >
                  <MoreOptionsIcon decorative className="size-icon" />
                </RoundIconButton>

                <span id={idDoMenu}>
                  <MenuSuspenso
                    titulo={comunidade.name}
                    aberto={aberto === "menu"}
                    onFechar={() => setAberto("nenhum")}
                  >
                    <p className="text-body text-inkMuted">{quemModera}</p>

                    {/*
                      Navegar fecha o menu. Sem isto ele continuaria aberto
                      por cima da tela nova, porque o App Router não
                      desmonta o cabeçalho ao trocar de rota irmã.
                    */}
                    <div className="flex flex-col gap-1">
                      {comunidade.souModerador ? (
                        <Link
                          href={`/c/${comunidade.slug}/moderar`}
                          onClick={() => setAberto("nenhum")}
                        >
                          <Button variant="secondary" className="w-full">
                            Moderar
                          </Button>
                        </Link>
                      ) : null}

                      <Link
                        href={`/denuncia?comunidade=${comunidade.slug}`}
                        onClick={() => setAberto("nenhum")}
                      >
                        <Button variant="secondary" className="w-full">
                          Denunciar comunidade
                        </Button>
                      </Link>
                    </div>
                  </MenuSuspenso>
                </span>
              </span>
            </>
          }
        >
          {/* Banida: nenhuma porta. Oferecer "Entrar" a quem não pode entrar
              é pedir um clique que só devolve erro. */}
          {comunidade.estouBanida ? (
            <span className="text-bodyStrong text-paper">
              Você não pode entrar nesta comunidade.
            </span>
          ) : (
            <CommunityDoor
              member={membro}
              oQue={comunidade.name}
              onToggle={pendente ? undefined : tocarNaPorta}
            />
          )}
        </CapaEditavel>
      </form>

      {estadoDaCapa.erro ? (
        <p role="alert" className="text-caption text-error">
          {estadoDaCapa.erro}
        </p>
      ) : null}

      {/*
        A linha de informações, que antes morava no painel da direita.

        Uma linha de texto, não um placar de caixinhas — é a mesma regra que
        o perfil segue: o Hub conta participação, não popularidade.

        "Contribuições" aqui são as respostas. No perfil a palavra conta
        resposta **ou** tópico criado (RN28); somar os tópicos de novo
        contaria cada um duas vezes, já que eles estão no número ao lado.
        Alinhar a RN28 está em docs/pendencias.md.
      */}
      {/* A descrição curta, logo abaixo da capa, como o protótipo mostra. */}
      <p className="text-body text-ink">{comunidade.intro}</p>

      <div className="flex flex-wrap items-center gap-2">
        {/*
          Avatares sobrepostos, sem iniciais: aqui eles são a textura de
          "tem gente aqui", não um crachá. O nome de cada um não cabe nem
          interessa nesta linha, e por isso o bloco inteiro é decorativo —
          o número ao lado é que carrega a informação.
        */}
        {comunidade.primeirosMembros.length > 0 ? (
          <span aria-hidden="true" className="flex">
            {comunidade.primeirosMembros.map((pessoa, i) => (
              <Avatar
                key={i}
                nome={pessoa.nome}
                url={pessoa.avatarUrl}
                tamanho="sm"
                className={i > 0 ? "-ml-2" : undefined}
              />
            ))}
          </span>
        ) : null}

        <p className="text-caption text-inkMuted">
          {numero(membros)} {membros === 1 ? "membro" : "membros"} ·{" "}
          {numero(comunidade.topicosCount)} {comunidade.topicosCount === 1 ? "tópico" : "tópicos"} ·{" "}
          {/*
            Com movimento, o número de hoje; parada, a data de nascimento.
            "0 contribuições hoje" anuncia o vazio de quem acabou de chegar.
          */}
          {comunidade.contribuicoesHoje > 0
            ? `${numero(comunidade.contribuicoesHoje)} ${
                comunidade.contribuicoesHoje === 1 ? "contribuição" : "contribuições"
              } hoje`
            : `criada em ${mesEAno(comunidade.criadaEm)}`}
        </p>
      </div>

      {/*
        A folha de entrada, só para comunidade com regras escritas.

        Não é um "tem certeza?": é o texto que a pessoa precisa ter lido
        para a moderação poder cobrar depois. Por isso o botão diz "Li e
        quero entrar", e não "OK".
      */}
      <BottomSheet title={`Entrar em ${comunidade.name}`} open={aberto === "regras"}>
        <p className="text-body text-inkMuted">{comunidade.intro}</p>
        <div className="bg-surfacePage rounded-sm px-3 py-2">
          <p className="text-label text-ink">
            {comunidade.regras.length === 1
              ? "Ao entrar, você concorda com a regra:"
              : "Ao entrar, você concorda com as regras:"}
          </p>
          <ol className="text-body text-ink mt-1 flex list-decimal flex-col gap-1 pl-4">
            {comunidade.regras.map((regra) => (
              <li key={regra}>{regra}</li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col gap-1">
          <Button variant="secondary" onClick={() => setAberto("nenhum")}>
            Agora não
          </Button>
          <Button onClick={entrar} disabled={pendente} disabledHint="Aguarde um instante">
            Li e quero entrar
          </Button>
        </div>
      </BottomSheet>

      {/*
        A folha da saída só aparece nos dois casos em que sair faz mais do
        que sair. O texto diz o que acontece, e não "tem certeza?" — o que
        a pessoa precisa saber é o que ela perde.
      */}
      <ConfirmSheet
        open={aberto === "sair"}
        titulo={ultimaPessoa ? `Apagar ${comunidade.name}?` : `Sair de ${comunidade.name}?`}
        descricao={
          ultimaPessoa
            ? `Você é a última pessoa aqui. Sair apaga a comunidade, com ${
                comunidade.topicosCount === 1
                  ? "o tópico dela"
                  : `os ${numero(comunidade.topicosCount)} tópicos dela`
              }.`
            : "A moderação passa para o membro mais ativo, e isso não tem volta. Seus tópicos e respostas continuam na comunidade."
        }
        confirmar={ultimaPessoa ? "Sair e apagar" : "Sair"}
        cancelar="Continuar membro"
        pendente={pendente}
        onConfirm={sair}
        onCancel={() => setAberto("nenhum")}
      />
    </div>
  );
}
