"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useId, useRef, useState, useTransition } from "react";
import {
  Avatar,
  Button,
  CommunityDoor,
  ConfirmSheet,
  Janela,
  MenuSuspenso,
  RoundIconButton,
} from "@/design/components";
import { BackIcon, MoreOptionsIcon } from "@/design/icons";
import { alternarMembro, trocarCapaDaComunidade } from "./actions";
import { CapaEditavel } from "./capa-editavel";
import { Compartilhar, type PessoaParaCompartilhar } from "@/features/convite/compartilhar";
import { JanelaDeModeracao } from "@/features/moderacao/janela";
import { JanelaDeEntrada } from "./janela-de-entrada";
import type { ReactNode } from "react";
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
 * Os estados — menu, convidar, sair, regras e moderar — moram aqui juntos
 * porque são **excludentes**: abrir um fecha os outros. Separados em
 * componentes diferentes, dois poderiam ficar abertos ao mesmo tempo.
 *
 * O menu abre como **drop**, logo abaixo do botão que o abriu, e não como
 * folha subindo do rodapé: pedido do PO em 29 de outubro, e o mesmo
 * `MenuSuspenso` que o perfil e a Cabine já usam.
 *
 * **O canto de cima tem um botão só.** Tinha três — compartilhar, moderar e
 * o menu — e o PO corrigiu em 31 de outubro: Moderar foi para o canto de
 * baixo da capa, e compartilhar virou dois itens do menu ("Copiar link da
 * comunidade" e "Convidar pessoas").
 */
export function CabecalhoDaComunidade({
  comunidade,
  paraCompartilhar,
  denunciasPendentes = 0,
  filaDeDenuncias,
}: {
  comunidade: PaginaDaComunidade;
  /** Quem pode receber o link (F14). Vem pronto do servidor. */
  paraCompartilhar: PessoaParaCompartilhar[];
  /** Zero para quem não modera: o número nem é calculado para os demais. */
  denunciasPendentes?: number;
  /**
   * A fila, desenhada no servidor e entregue pronta.
   *
   * Vem por propriedade porque depende de permissão, e permissão se
   * confere no servidor. Nula para quem não modera — e aí o botão de
   * moderar nem aparece.
   */
  filaDeDenuncias?: ReactNode;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState<
    "nenhum" | "convidar" | "sair" | "menu" | "regras" | "moderar"
  >("nenhum");
  /*
   * O estado da porta é otimista — o clique muda a marca antes de o
   * servidor responder —, mas **acompanha a propriedade** quando ela muda.
   *
   * Sem acompanhar, entrar pela janela de entrada deixava a porta dizendo
   * "Entrar em" depois de a pessoa já ser membro: a janela chama
   * `router.refresh()`, que renderiza o servidor de novo e manda
   * `souMembro: true` — e `useState` ignora, porque ele só lê o valor
   * inicial na montagem. O cabeçalho não remonta numa navegação de
   * cliente. Uma jornada pegou, e é o mesmo erro que a janela de criar
   * tópico teve no PR anterior.
   *
   * O ajuste é o padrão do React para estado que segue propriedade:
   * comparar com o visto da última vez, na renderização.
   */
  const [visto, setVisto] = useState(comunidade.souMembro);
  const [membro, setMembro] = useState(comunidade.souMembro);
  const [membros, setMembros] = useState(comunidade.membersCount);
  if (visto !== comunidade.souMembro) {
    setVisto(comunidade.souMembro);
    setMembro(comunidade.souMembro);
    setMembros(comunidade.membersCount);
  }
  const [pendente, iniciar] = useTransition();
  const [estadoDaCapa, trocarCapa] = useActionState(trocarCapaDaComunidade, {});
  const formularioDaCapa = useRef<HTMLFormElement>(null);

  const idDoMenu = useId();
  const [linkCopiado, setLinkCopiado] = useState(false);

  function copiarLink() {
    void navigator.clipboard
      ?.writeText(`${window.location.origin}/c/${comunidade.slug}`)
      .then(() => setLinkCopiado(true));
  }

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
            /*
              Um botão só no canto de cima: os três pontos.

              Eram três — compartilhar, moderar e o menu —, e o PO corrigiu
              em 31 de outubro: Moderar desceu para o canto de baixo da
              capa (`inferiorDireita`) e compartilhar virou item do menu,
              como "Copiar link da comunidade". O canto de cima de uma capa
              não é lugar de barra de ferramentas.

              O `relative` é do botão, e não do bloco: é dele que o drop se
              pendura.
            */
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
                    <Button variant="secondary" onClick={copiarLink}>
                      {linkCopiado ? "Link copiado" : "Copiar link da comunidade"}
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={() => {
                        setLinkCopiado(false);
                        abrir("convidar");
                      }}
                    >
                      Convidar pessoas
                    </Button>

                    {/*
                      Sair pelo menu, e não só pela marca #. É onde as
                      pessoas procuram esse tipo de coisa, e o caminho é o
                      mesmo `tocarNaPorta`: as duas exceções, a última
                      pessoa (RN35) e quem modera (RN06), continuam
                      pedindo confirmação.
                    */}
                    {membro && !comunidade.estouBanida ? (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setAberto("nenhum");
                          tocarNaPorta();
                        }}
                        disabled={pendente}
                      >
                        Sair da comunidade
                      </Button>
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
          }
          /*
            "Moderar N" no canto de baixo da capa, na linha do nome, como o
            protótipo v6 mostra. O número de denúncias esperando decisão vai
            junto: escondido num menu, quem modera só descobria que havia
            fila ao procurar.
          */
          inferiorDireita={
            comunidade.souModerador ? (
              <Button size="sm" variant="claro" onClick={() => abrir("moderar")}>
                Moderar
                {denunciasPendentes > 0 ? (
                  <span className="bg-error text-paper text-caption rounded-pill px-1 font-bold">
                    {denunciasPendentes}
                  </span>
                ) : null}
              </Button>
            ) : undefined
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
      <p className="text-body text-ink wrap-anywhere">{comunidade.intro}</p>

      <div className="flex flex-wrap items-center gap-2">
        {/*
          Avatares sobrepostos, sem iniciais: aqui eles são a textura de
          "tem gente aqui", não um crachá. O nome de cada um não cabe nem
          interessa nesta linha, e por isso o bloco inteiro é decorativo —
          o número ao lado é que carrega a informação.
        */}
        {comunidade.primeirosMembros.length > 0 ? (
          <span aria-hidden="true" className="flex">
            {/* Cinco aqui, embora a consulta traga doze: sobrepostos, mais
                que isso vira uma mancha. A grade da coluna da direita usa
                os doze, onde eles têm espaço. */}
            {comunidade.primeirosMembros.slice(0, 5).map((pessoa, i) => (
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
          {/*
            "N membros" leva à aba Membros. Era texto morto ao lado de
            avatares que convidam a clicar — e quem clica num rosto quer
            exatamente a lista de gente.
          */}
          {/*
            `min-h-controlSm` com `inline-flex`: como texto solto o link
            tinha 14 px de altura, abaixo do mínimo de 24 que a jornada de
            alvos de toque guarda. É o mesmo defeito que o "Ver todos" do
            resumo já tinha tido — e o comentário dele estava a três linhas
            de onde eu copiei este.
          */}
          <Link
            href={`/c/${comunidade.slug}?aba=membros`}
            className="min-h-controlSm inline-flex items-center underline underline-offset-2"
          >
            {numero(membros)} {membros === 1 ? "membro" : "membros"}
          </Link>{" "}
          ·{" "}
          {/*
            Um número de contribuições, e não "N tópicos · N contribuições".
            Pela RN28 contribuição é resposta **ou** tópico criado, então os
            dois lado a lado contariam cada tópico duas vezes na mesma
            frase. A contagem de tópicos continua no título da seção.
          */}
          {numero(comunidade.contribuicoesCount)}{" "}
          {comunidade.contribuicoesCount === 1 ? "contribuição" : "contribuições"} ·{" "}
          {/*
            Com movimento, o número de hoje; parada, a data de nascimento.
            "0 hoje" anuncia o vazio de quem acabou de chegar.
          */}
          {comunidade.contribuicoesHoje > 0
            ? `${numero(comunidade.contribuicoesHoje)} hoje`
            : `criada em ${mesEAno(comunidade.criadaEm)}`}
        </p>
      </div>

      {/*
        Convidar pessoas, que era o botão de compartilhar no canto da capa.

        Numa `Janela` e não num drop: a busca de pessoas tem campo, lista e
        um botão de enviar, e isso não cabe pendurado num canto. Montada só
        quando abre — a busca é uma ida ao servidor, e ninguém paga por ela
        sem ter pedido.
      */}
      <Janela
        titulo={`Convidar para ${comunidade.name}`}
        aberta={aberto === "convidar"}
        onFechar={() => setAberto("nenhum")}
      >
        {aberto === "convidar" ? (
          <Compartilhar
            tipo="comunidade"
            id={comunidade.id}
            nome={comunidade.name}
            endereco={`/c/${comunidade.slug}`}
            pessoas={paraCompartilhar}
            aoFechar={() => setAberto("nenhum")}
          />
        ) : null}
      </Janela>

      {/*
        A janela de entrada, agora um componente só
        ([janela-de-entrada.tsx](./janela-de-entrada.tsx)): ela abre daqui,
        das enquetes, dos eventos e do seguir. Era deste arquivo, e as
        outras telas desabilitavam o botão em vez de convidar.
      */}
      <JanelaDeEntrada
        comunidade={{
          id: comunidade.id,
          slug: comunidade.slug,
          name: comunidade.name,
          intro: comunidade.intro,
          regras: comunidade.regras,
        }}
        aberta={aberto === "regras"}
        onFechar={() => setAberto("nenhum")}
      />

      {comunidade.souModerador && filaDeDenuncias ? (
        <JanelaDeModeracao
          aberta={aberto === "moderar"}
          onFechar={() => setAberto("nenhum")}
          slug={comunidade.slug}
          communityId={comunidade.id}
          nome={comunidade.name}
          intro={comunidade.intro}
          about={comunidade.about}
          regras={comunidade.regras.join("\n")}
          pendentes={denunciasPendentes}
          denuncias={filaDeDenuncias}
        />
      ) : null}

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
