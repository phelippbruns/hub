"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cn } from "@/design/cn";
import { Avatar, EndOfList, Input } from "@/design/components";
import { ConviteEnviado } from "./convite-enviado";
import { conversarCom, procurarParaConversar, type PessoaNaBusca } from "./actions";

export type ConviteNaLista = {
  id: string;
  nome: string;
  mensagem: string;
  avatarUrl: string | null;
};

export type ConversaNaLista = {
  id: string;
  nome: string;
  previa: string;
  quando: string;
  naoLidas: number;
};

/**
 * A coluna da esquerda da Cabine: convites e conversas.
 *
 * Fica ao lado da conversa aberta, e é a mesma em `/cabines` e em
 * `/cabines/<id>` — sair de uma conversa para outra não devia fazer a
 * lista piscar nem obrigar a voltar.
 *
 * Qual linha está aberta sai do **endereço**, não de estado: assim a
 * marcação continua certa depois de recarregar, de voltar pelo histórico e
 * de abrir um link direto.
 */
export function ListaDeCabines({
  convites,
  enviados,
  conversas,
}: {
  convites: ConviteNaLista[];
  enviados: { id: string; paraQuem: string }[];
  conversas: ConversaNaLista[];
}) {
  const caminho = usePathname();
  const [aba, setAba] = useState<"conversas" | "convites">("conversas");
  const [termo, setTermo] = useState("");
  /*
   * O resultado guarda **o termo junto**.
   *
   * Sem isso, apagar a busca exigiria limpar o estado dentro do efeito — e
   * é justamente isso que provoca renderização em cascata. É o mesmo
   * desenho da busca de quem convidar.
   */
  const [resultado, setResultado] = useState<{ termo: string; pessoas: PessoaNaBusca[] } | null>(
    null,
  );
  const [, buscar] = useTransition();
  const [abrindo, abrir] = useTransition();

  /*
   * A busca espera a pessoa parar de digitar e vai ao servidor.
   *
   * Ela procura entre **quem se segue com você**: é com essas pessoas que
   * a conversa começa no clique. Quem não te segue de volta precisa de
   * convite, e convite se faz no perfil da pessoa.
   */
  useEffect(() => {
    const procurado = termo.trim();
    if (!procurado) return;

    let valeu = true;
    const relogio = setTimeout(() => {
      buscar(async () => {
        const pessoas = await procurarParaConversar(procurado);
        if (valeu) setResultado({ termo: procurado, pessoas });
      });
    }, 250);

    return () => {
      valeu = false;
      clearTimeout(relogio);
    };
  }, [termo]);

  // Só mostra o resultado **daquilo que está escrito agora**.
  const achadas = resultado?.termo === termo.trim() ? resultado.pessoas : [];

  return (
    <section
      aria-label="Suas Cabines"
      className="border-line w-cabinList sticky top-0 flex h-screen shrink-0 flex-col border-r"
    >
      {/*
        O topo é fixo: busca e abas não rolam junto com as conversas. Quem
        desce uma lista longa não deveria ter de subir para procurar
        alguém.
      */}
      <div
        className="flex flex-col gap-2 px-3 pb-2"
        style={{ paddingTop: "max(var(--spacing-5), env(safe-area-inset-top))" }}
      >
        <h1 className="text-title text-ink">Cabine</h1>

        <Input
          label="Buscar Cabines"
          rotuloOculto
          type="search"
          autoComplete="off"
          placeholder="Buscar por nome ou @"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
        />

        {achadas.length > 0 ? (
          <ul role="group" aria-label="Pessoas para conversar" className="flex flex-col gap-1">
            {achadas.map((pessoa) => (
              <li key={pessoa.id}>
                {/*
                  Clicar abre a conversa: com quem se segue, ela começa na
                  hora, e se já existir uma vai para ela.
                */}
                <button
                  type="button"
                  disabled={abrindo}
                  onClick={() => abrir(() => conversarCom(pessoa.id))}
                  className="hover:bg-paper flex w-full cursor-pointer items-center gap-2 rounded-sm p-2 text-left"
                >
                  <Foto nome={pessoa.nome} avatarUrl={pessoa.avatarUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="text-bodyStrong text-ink block truncate">{pessoa.nome}</span>
                    <span className="text-caption text-inkMuted block truncate">
                      @{pessoa.handle}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {/*
          Duas abas, com o número de convites recebidos: eles esperam uma
          resposta sua, e no meio das conversas ficavam fáceis de ignorar.
        */}
        <div role="tablist" aria-label="Cabine" className="bg-paper rounded-pill flex gap-1 p-1">
          {(
            [
              ["conversas", "Conversas", 0],
              ["convites", "Convites", convites.length],
            ] as const
          ).map(([id, rotulo, quantos]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={aba === id}
              onClick={() => setAba(id)}
              className={cn(
                "rounded-pill text-label h-controlSm flex flex-1 cursor-pointer items-center justify-center gap-1 font-semibold",
                aba === id ? "bg-ink text-paper" : "text-inkMuted hover:text-ink",
              )}
            >
              {rotulo}
              {quantos > 0 ? (
                <span className="bg-sun text-ink text-caption rounded-pill px-2 font-bold">
                  {quantos}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto px-3 pb-3">
        {aba === "convites" && convites.length > 0 ? (
          <>
            <Secao>Recebidos</Secao>
            <ul className="flex flex-col gap-2">
              {convites.map((convite) => (
                <li key={convite.id} className="bg-paper flex flex-col gap-2 rounded-sm p-2">
                  <span className="flex items-center gap-2">
                    <Foto nome={convite.nome} avatarUrl={convite.avatarUrl} />
                    <span className="min-w-0 flex-1">
                      <span className="text-bodyStrong text-ink block truncate">
                        {convite.nome}
                      </span>
                      <span className="text-caption text-inkMuted block truncate">
                        {convite.mensagem}
                      </span>
                    </span>
                  </span>
                  {/*
                  Aceitar e recusar moram na tela do convite, onde aparece
                  por que aquela pessoa pôde convidar. Trazer os botões para
                  cá seria comportamento novo, não estilo.
                */}
                  <Link
                    href={`/cabines/convite?id=${convite.id}`}
                    aria-label={`Ver o convite de ${convite.nome}`}
                    className="border-ink text-ink text-label rounded-pill h-controlXs box-border inline-flex items-center justify-center self-start border px-3 font-semibold"
                  >
                    Ver
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {aba === "convites" && enviados.length > 0 ? (
          <>
            <Secao>Enviados</Secao>
            <ul className="flex flex-col gap-2">
              {enviados.map((convite) => (
                <li key={convite.id}>
                  <ConviteEnviado id={convite.id} paraQuem={convite.paraQuem} />
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {aba === "convites" && convites.length === 0 && enviados.length === 0 ? (
          <p className="text-body text-inkMuted px-1 text-center">Nenhum convite pendente</p>
        ) : null}

        {aba === "conversas" && conversas.length === 0 ? (
          <p className="text-body text-inkMuted px-1 text-center">Nenhuma conversa ainda</p>
        ) : null}

        {aba === "conversas" && conversas.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {conversas.map((conversa) => {
              const aberta = caminho === `/cabines/${conversa.id}`;
              return (
                <li key={conversa.id}>
                  <Link
                    href={`/cabines/${conversa.id}`}
                    aria-current={aberta ? "true" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-sm p-2",
                      aberta ? "bg-paper" : "hover:bg-paper",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-bodyStrong text-ink truncate">{conversa.nome}</span>
                        <span className="text-caption text-inkMuted shrink-0">
                          {conversa.quando}
                        </span>
                      </span>

                      <span className="flex items-center justify-between gap-2">
                        {/* Não lida fica em ink e em negrito: é o que separa
                          "tem coisa nova aqui" de "já li". */}
                        <span
                          className={cn(
                            "text-label truncate font-normal",
                            conversa.naoLidas > 0 ? "text-ink font-semibold" : "text-inkMuted",
                          )}
                        >
                          {conversa.previa}
                        </span>

                        {conversa.naoLidas > 0 ? (
                          <span
                            aria-label={`${conversa.naoLidas} ${
                              conversa.naoLidas === 1 ? "mensagem não lida" : "mensagens não lidas"
                            }`}
                            /*
                             * O número é paper sobre ink, e a cor mora aqui,
                             * na própria pílula: na referência uma regra da
                             * prévia pintava o número de ink e ele sumia no
                             * fundo escuro.
                             */
                            className="bg-ink text-paper text-caption rounded-pill shrink-0 px-2 font-bold"
                          >
                            {conversa.naoLidas}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}

            <EndOfList>Fim das conversas</EndOfList>
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function Secao({ children }: { children: string }) {
  return <h2 className="text-label text-inkMuted px-1 font-semibold">{children}</h2>;
}

/** A foto de quem convidou, ou o lugar dela. */
function Foto({ nome, avatarUrl }: { nome: string; avatarUrl: string | null }) {
  return <Avatar nome={nome} url={avatarUrl} tamanho="lg" />;
}
