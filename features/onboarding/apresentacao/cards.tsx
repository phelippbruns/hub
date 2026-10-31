import type { ReactNode } from "react";
import { LevelMark } from "@/design/components";
import {
  BlockIcon,
  CabinNavIcon,
  CommunitiesNavIcon,
  ConfirmedIcon,
  ExploreNavIcon,
  HomeNavIcon,
  ProfileNavIcon,
} from "@/design/icons";
import {
  Apoio,
  Avatar,
  BotaoFalso,
  Linha,
  Nome,
  Nota,
  Painel,
  Passos,
  Pilha,
  RotuloDoPainel,
  Toque,
} from "./pecas";

/**
 * Os seis primeiros cards da apresentação: texto à esquerda, demonstração à
 * direita.
 *
 * O conteúdo das demonstrações é **fixo**. Nenhum dado real entra aqui: a
 * história precisa durar os mesmos 10 segundos para todo mundo, e uma
 * comunidade vazia contaria a história errada justamente para quem está
 * chegando.
 */

export type Card = {
  /** Vai para o `aria-label` do card e para o contador. */
  titulo: string;
  copy: ReactNode;
  demo: ReactNode;
};

/** O quadrado lavanda da sobrancelha, quando o símbolo é um ícone e não uma marca de nível. */
function Marca({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="bg-lavender text-ink size-mark grid shrink-0 place-items-center rounded-sm"
    >
      {children}
    </span>
  );
}

function Sobrancelha({ marca, texto }: { marca: ReactNode; texto: string }) {
  return (
    <div className="flex items-center gap-2">
      {marca}
      <span className="text-label text-ink">{texto}</span>
    </div>
  );
}

function Titulo({ children }: { children: ReactNode }) {
  return <h2 className="text-title text-ink">{children}</h2>;
}

function Texto({ children }: { children: ReactNode }) {
  return <p className="text-body text-ink">{children}</p>;
}

export const CARDS: Card[] = [
  // ------------------------------------------------------------------ 1
  {
    titulo: "O que é o Hub",
    copy: (
      <>
        <Titulo>Uma rede social feita para conectar, não para prender.</Titulo>
        <Texto>
          O Hub conecta pessoas em comunidades criadas por interesses em comum. Um espaço para
          trocar ideias, descobrir perspectivas e participar de conversas que fazem sentido.
        </Texto>
        <Texto>Sem competição por atenção e sem feed infinito.</Texto>
        <Texto>
          Aqui, você participa no seu tempo. Responde ao que desperta sua curiosidade e acompanha o
          que acontece sem precisar estar online o tempo todo.
        </Texto>
      </>
    ),
    demo: (
      <Painel className="items-center justify-center gap-3">
        {/* A marca do Hub: o mesmo `{` do sistema, no tamanho de abertura. */}
        <LevelMark level="universe" tamanho="lg" className="hub-anima hub-logo" />
        <span aria-hidden="true" className="text-brand text-ink">
          Hub
        </span>
      </Painel>
    ),
  },

  // ------------------------------------------------------------------ 2
  {
    titulo: "Comunidades",
    copy: (
      <>
        <Sobrancelha marca={<LevelMark level="community" />} texto="Comunidades" />
        <Titulo>Encontrar o que você gosta nunca foi tão fácil</Titulo>
        <Texto>Comunidades reúnem pessoas pelo mesmo interesse.</Texto>
        <Passos
          itens={[
            <>
              <b className="font-semibold">Para entrar,</b> abra a comunidade e toque no ícone de
              &quot;#&quot;.
            </>,
            <>
              <b className="font-semibold">Para criar,</b> toque em Criar comunidade. Dê um nome,
              uma capa e introduza seu assunto.
            </>,
          ]}
        />
      </>
    ),
    demo: (
      <Painel>
        <RotuloDoPainel>Comunidade</RotuloDoPainel>
        <Linha>
          <span className="min-w-0 flex-1">
            <Nome>Música Eletrônica</Nome>
            <Pilha>
              <Apoio className="hub-anima hub-antes">3.412 membros</Apoio>
              <Apoio className="hub-anima hub-depois">3.413 membros, incluindo você</Apoio>
            </Pilha>
          </span>
          <Pilha className="text-caption">
            <span className="hub-anima hub-antes text-inkMuted">Entrar</span>
            <span className="hub-anima hub-depois text-ink font-bold">Membro</span>
          </Pilha>
          <span className="size-navItem relative grid shrink-0 place-items-center">
            <Pilha>
              <span className="border-lavender text-ink size-mark grid place-items-center rounded-sm border-2 font-extrabold">
                <span className="hub-anima hub-antes text-subtitle">#</span>
              </span>
              <LevelMark level="community" className="hub-anima hub-depois" />
            </Pilha>
            <Toque nome="hub-toque-a" />
          </span>
        </Linha>

        <div className="flex items-center justify-between gap-2">
          <Apoio>Não achou a sua?</Apoio>
          <span className="relative">
            <BotaoFalso className="hub-anima hub-aperta">Criar comunidade</BotaoFalso>
            <Toque nome="hub-toque-b" />
          </span>
        </div>

        <Linha className="hub-anima hub-nova">
          <LevelMark level="community" />
          <span className="min-w-0 flex-1">
            <Nome>Synth Modular</Nome>
            <Apoio>Comunidade nova, 1 membro</Apoio>
          </span>
        </Linha>
      </Painel>
    ),
  },

  // ------------------------------------------------------------------ 3
  {
    titulo: "Tópicos",
    copy: (
      <>
        <Sobrancelha marca={<LevelMark level="topic" />} texto="Tópicos" />
        <Titulo>A mágica acontece nos tópicos</Titulo>
        <Texto>
          Dentro de cada comunidade ficam os tópicos. Cada um tem um nome e uma abertura que provoca
          respostas.
        </Texto>
        <Passos
          itens={[
            <>
              {/*
                Não prometa editar: a RN14 diz que resposta não se edita —
                para corrigir, apaga e responde de novo. O card prometia
                "editar por 5 minutos" desde que nasceu, e não existia
                código nenhum por trás disso.
              */}
              <b className="font-semibold">Para participar,</b> acesse o tópico e deixe sua
              contribuição.
            </>,
            <>
              <b className="font-semibold">Para criar,</b> toque em Criar tópico, dê um nome e
              escreva a abertura.
            </>,
            <>
              <b className="font-semibold">Hot Topic:</b> o tópico com mais pessoas contribuindo no
              dia ocupa o topo da comunidade no dia seguinte.
            </>,
          ]}
        />
        <Nota>
          Cada comunidade tem moderação. Contribuições que quebram as regras podem ser removidas.
        </Nota>
      </>
    ),
    demo: (
      <Painel>
        <RotuloDoPainel>Hot Topic em Música Eletrônica</RotuloDoPainel>

        <div className="bg-ink flex flex-col gap-2 rounded-md p-3">
          <p className="text-question text-paper">
            Como foi a primeira festa que te fez gostar de música eletrônica?
          </p>
          <Pilha className="text-caption text-paper">
            <span className="hub-anima hub-antes">86 pessoas, 112 contribuições</span>
            <span className="hub-anima hub-depois">87 pessoas, 113 contribuições</span>
          </Pilha>
          <BotaoFalso tom="highlight" className="self-stretch">
            Contribuir
            <Toque nome="hub-toque-a" />
          </BotaoFalso>
        </div>

        <div className="hub-anima hub-campo bg-paper flex items-center gap-2 rounded-sm p-2">
          <span className="text-body text-ink flex min-w-0 flex-1 items-center whitespace-nowrap">
            <span className="hub-anima hub-digita inline-block overflow-hidden">
              Um galpão em Curitiba, 2019.
            </span>
            <span className="hub-anima hub-cursor bg-ink h-icon ml-px inline-block w-px" />
          </span>
          <BotaoFalso>
            Enviar
            <Toque nome="hub-toque-b" />
          </BotaoFalso>
        </div>

        <Linha>
          <LevelMark level="topic" />
          <span className="min-w-0 flex-1">
            <Nome>sets longos</Nome>
            <Apoio>41 pessoas, 57 respostas</Apoio>
          </span>
        </Linha>

        <div className="hub-anima hub-aviso bg-paper text-label text-success absolute right-3 bottom-3 left-3 flex items-center gap-2 rounded-sm p-2">
          <ConfirmedIcon decorative className="size-iconSm" />
          Resposta enviada
        </div>
      </Painel>
    ),
  },

  // ------------------------------------------------------------------ 4
  {
    titulo: "Cabine",
    copy: (
      <>
        <Sobrancelha
          marca={
            <Marca>
              <CabinNavIcon decorative className="size-icon" />
            </Marca>
          }
          texto="Cabine"
        />
        <Titulo>Feita para aprofundar conexões</Titulo>
        <Texto>
          A Cabine é o cantinho das conversas privadas do Hub. Às vezes algum tópico toca você de um
          jeito especial e dá vontade de continuar o papo com calma. A Cabine existe para isso, um
          espaço tranquilo para transformar afinidade em amizade.
        </Texto>
        <Passos
          itens={[
            <>
              <b className="font-semibold">Convide</b> pelo perfil da pessoa. Se ela já segue você,
              a conversa abre na hora. Se não, ela recebe um convite e a conversa começa quando ela
              aceitar.
            </>,
          ]}
        />
      </>
    ),
    demo: (
      <Painel>
        <Pilha className="flex-1">
          <div className="hub-anima hub-convite bg-paper flex h-fit flex-col gap-2 self-center rounded-md p-3">
            <div className="flex items-center gap-2">
              <Avatar inicial="L" />
              <span>
                <Nome>Lia Souza</Nome>
                <Apoio>quer abrir uma Cabine com você</Apoio>
              </span>
            </div>
            <Apoio>Vocês responderam ao mesmo tópico em Música Eletrônica.</Apoio>
            <div className="flex gap-2">
              <BotaoFalso tom="secondary" className="flex-1">
                Recusar
              </BotaoFalso>
              <BotaoFalso className="hub-anima hub-aperta flex-1">
                Aceitar
                <Toque nome="hub-toque-a" />
              </BotaoFalso>
            </div>
          </div>

          <div className="hub-anima hub-conversa flex h-full flex-col gap-2">
            <div className="bg-paper flex items-center gap-2 rounded-sm p-2">
              <Avatar inicial="L" className="size-avatarSm text-caption" />
              <Nome className="text-label">Lia Souza</Nome>
            </div>
            <div className="flex flex-1 flex-col justify-end gap-2">
              <span className="hub-anima hub-balao-1 bg-paper text-body text-ink max-w-[78%] self-start rounded-sm p-2">
                Vi sua resposta sobre o galpão. Eu estava lá também!
              </span>
              <span className="hub-anima hub-balao-2 bg-lavender text-body text-ink self-end rounded-sm p-2">
                Sério? Aquele set de 6 horas?
              </span>
              <span className="hub-anima hub-balao-3 bg-ink text-sun w-composeMax grid aspect-video place-items-center self-start rounded-sm font-extrabold">
                GIF
              </span>
            </div>
            <div className="bg-paper rounded-pill text-body text-inkMuted flex items-center justify-between px-3 py-2">
              <span>Mensagem</span>
              <span className="text-caption">GIF ou imagem</span>
            </div>
          </div>
        </Pilha>
      </Painel>
    ),
  },

  // ------------------------------------------------------------------ 5
  {
    titulo: "Perfil",
    copy: (
      <>
        <Sobrancelha
          marca={
            <Marca>
              <ProfileNavIcon decorative className="size-icon" />
            </Marca>
          }
          texto="Perfil"
        />
        <Titulo>Seu perfil é sobre o que você gosta</Titulo>
        <Texto>
          Para deixar o ambiente mais leve e evitar comparações, seu perfil é focado em suas
          contribuições e comunidades.
        </Texto>
        <Passos
          itens={[
            <>
              <b className="font-semibold">Contribuições:</b> tudo o que você escreveu, com o tópico
              de origem.
            </>,
            <>
              <b className="font-semibold">Comunidades:</b> onde você é membro.
            </>,
            <>
              <b className="font-semibold">Coleção:</b> os tópicos que você segue, por comunidade ou
              data.
            </>,
          ]}
        />
      </>
    ),
    demo: (
      <Painel className="gap-1">
        <div className="flex flex-col items-center gap-1 text-center">
          <Avatar inicial="V" tom="sun" className="size-avatarMd text-subtitle" />
          <span>
            <Nome className="text-subtitle">Você</Nome>
            <Apoio>@voce</Apoio>
          </span>
          <span className="text-body text-ink">Colecionador de vinil e de sets longos.</span>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {[
            ["48", "contribuições"],
            ["6", "comunidades"],
            ["21", "dias ativos"],
          ].map(([numero, rotulo]) => (
            <span key={rotulo} className="text-center">
              <b className="text-subtitle text-ink block">{numero}</b>
              <Apoio>{rotulo}</Apoio>
            </span>
          ))}
        </div>

        <div className="border-line -mb-px flex gap-3 border-b">
          {["Contribuições", "Comunidades", "Coleção"].map((nome, i) => (
            <span
              key={nome}
              className={`hub-anima hub-aba-${i + 1} text-label -mb-px inline-flex items-center gap-1 border-b-2 border-transparent py-1`}
            >
              {nome === "Coleção" ? <BlockIcon decorative className="size-iconSm" /> : null}
              {nome}
            </span>
          ))}
        </div>

        <Pilha className="flex-1 items-start">
          <div className="hub-anima hub-painel-1 flex flex-col gap-2">
            <div className="bg-paper text-body text-ink flex flex-col gap-1 rounded-sm p-2">
              <Apoio>primeira festa, Música Eletrônica</Apoio>
              <span className="text-label">
                Como foi a primeira festa que te fez gostar de música eletrônica?
              </span>
              Um galpão em Curitiba, 2019. Inesquecível.
            </div>
          </div>

          <div className="hub-anima hub-painel-2 flex flex-col gap-2">
            {["Música Eletrônica", "Vinil"].map((nome) => (
              <Linha key={nome}>
                <LevelMark level="community" />
                <Nome>{nome}</Nome>
              </Linha>
            ))}
          </div>

          <div className="hub-anima hub-painel-3 flex flex-col gap-2">
            <span className="bg-sun rounded-pill text-caption text-ink inline-flex items-center gap-1 self-start px-2 py-1 font-semibold">
              <BlockIcon decorative className="size-iconSm" />
              Só você vê
            </span>
            {[
              ["Música Eletrônica", "4 tópicos seguidos"],
              ["Vinil", "2 tópicos seguidos"],
            ].map(([nome, quantos]) => (
              <Linha key={nome}>
                <LevelMark level="community" />
                <span className="min-w-0 flex-1">
                  <Nome>{nome}</Nome>
                  <Apoio>{quantos}</Apoio>
                </span>
              </Linha>
            ))}
          </div>
        </Pilha>
      </Painel>
    ),
  },

  // ------------------------------------------------------------------ 6
  {
    titulo: "Início e Explorar",
    copy: (
      <>
        <Sobrancelha
          marca={
            <Marca>
              <HomeNavIcon decorative className="size-icon" />
            </Marca>
          }
          texto="Início e Explorar"
        />
        <Titulo>Acompanhe e descubra</Titulo>
        <Passos
          itens={[
            <>
              <b className="font-semibold">Início</b> reúne as novidades dos tópicos, comunidades e
              pessoas que você segue.
            </>,
            <>
              <b className="font-semibold">Explorar</b> é onde você busca e descobre comunidades e
              tópicos novos.
            </>,
          ]}
        />
        <Nota>Seguir é sempre manual. Responder a um tópico não faz você segui-lo.</Nota>
      </>
    ),
    demo: (
      <Painel>
        <div className="grid h-full grid-cols-[auto_1fr] gap-2">
          <div className="bg-paper w-composeMax flex flex-col gap-0 rounded-sm p-2">
            <span className="hub-anima hub-nav-a text-caption flex items-center gap-2 rounded-sm px-2 py-1">
              <HomeNavIcon decorative className="size-iconSm" />
              Início
            </span>
            <span className="hub-anima hub-nav-b text-caption relative flex items-center gap-2 rounded-sm px-2 py-1">
              <ExploreNavIcon decorative className="size-iconSm" />
              Explorar
              <Toque nome="hub-toque-a" className="left-1/3" />
            </span>
            {[
              [CommunitiesNavIcon, "Comunidades"],
              [CabinNavIcon, "Cabine"],
              [ProfileNavIcon, "Perfil"],
            ].map(([Icone, nome]) => {
              const I = Icone as typeof HomeNavIcon;
              return (
                <span
                  key={nome as string}
                  className="text-caption text-inkMuted flex items-center gap-2 px-2 py-1"
                >
                  <I decorative className="size-iconSm" />
                  {nome as string}
                </span>
              );
            })}
          </div>

          <div className="relative">
            <div className="hub-anima hub-painel-a absolute inset-0 flex flex-col gap-2">
              <span className="text-subtitle text-ink">Início</span>
              <Linha className="hub-anima hub-linha-1 p-2">
                <LevelMark level="topic" />
                <span className="min-w-0 flex-1">
                  <Nome className="text-label">sets longos</Nome>
                  <Apoio>9 respostas novas</Apoio>
                </span>
              </Linha>
              <Linha className="hub-anima hub-linha-2 p-2">
                <LevelMark level="community" />
                <span className="min-w-0 flex-1">
                  <Nome className="text-label">Vinil</Nome>
                  <Apoio>Hot Topic de hoje</Apoio>
                </span>
              </Linha>
              <Linha className="hub-anima hub-linha-3 p-2">
                <Avatar inicial="L" className="size-avatarSm text-caption" />
                <span className="min-w-0 flex-1">
                  <Nome className="text-label">Lia Souza</Nome>
                  <Apoio>respondeu em Cinema</Apoio>
                </span>
              </Linha>
              <span className="hub-anima hub-fim text-label text-ink before:bg-line after:bg-line flex items-center justify-center gap-2 py-2 before:h-px before:flex-1 before:content-[''] after:h-px after:flex-1 after:content-['']">
                Você está em dia
              </span>
            </div>

            <div className="hub-anima hub-painel-b absolute inset-0 flex flex-col gap-2">
              <span className="text-subtitle text-ink">Explorar</span>
              <div className="bg-paper rounded-pill text-body text-ink flex items-center gap-2 px-3 py-2">
                <ExploreNavIcon decorative className="size-iconSm text-inkMuted" />
                <span className="hub-anima hub-digita inline-block overflow-hidden whitespace-nowrap">
                  synth
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {["Música Eletrônica", "Cinema", "Games", "Synth Modular"].map((nome) => (
                  <div
                    key={nome}
                    className="hub-anima hub-cartao bg-paper flex flex-col gap-1 rounded-sm p-2"
                  >
                    <LevelMark level="community" />
                    <Nome className="text-label">{nome}</Nome>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Painel>
    ),
  },
];
