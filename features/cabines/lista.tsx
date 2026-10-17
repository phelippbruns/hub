"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/design/cn";
import { EndOfList } from "@/design/components";
import { CreateIcon } from "@/design/icons";
import { ConviteEnviado } from "./convite-enviado";

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

  return (
    <section
      aria-label="Suas Cabines"
      className="border-line w-cabinList sticky top-0 flex h-screen shrink-0 flex-col gap-3 overflow-y-auto border-r px-3 pb-3"
      style={{ paddingTop: "max(var(--spacing-5), env(safe-area-inset-top))" }}
    >
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-title text-ink">Cabine</h1>
        <Link
          href="/cabines/nova"
          aria-label="Nova Cabine"
          className="bg-lavender text-ink size-controlSm rounded-pill grid shrink-0 place-items-center"
        >
          <CreateIcon decorative className="size-icon" />
        </Link>
      </div>

      {convites.length > 0 ? (
        <>
          <Secao>Convites</Secao>
          <ul className="flex flex-col gap-2">
            {convites.map((convite) => (
              <li key={convite.id} className="bg-paper flex flex-col gap-2 rounded-sm p-2">
                <span className="flex items-center gap-2">
                  <Foto nome={convite.nome} avatarUrl={convite.avatarUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="text-bodyStrong text-ink block truncate">{convite.nome}</span>
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

      {enviados.length > 0 ? (
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

      <Secao>Conversas</Secao>

      {conversas.length === 0 ? (
        <p className="text-body text-inkMuted px-1 text-center">Nenhuma conversa ainda</p>
      ) : (
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
                      <span className="text-caption text-inkMuted shrink-0">{conversa.quando}</span>
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
      )}
    </section>
  );
}

function Secao({ children }: { children: string }) {
  return <h2 className="text-label text-inkMuted px-1 font-semibold">{children}</h2>;
}

/** A foto de quem convidou, ou o lugar dela. */
function Foto({ nome, avatarUrl }: { nome: string; avatarUrl: string | null }) {
  return (
    <span
      aria-hidden="true"
      className="size-avatarMd rounded-pill bg-lavender text-ink text-label grid shrink-0 place-items-center bg-cover bg-center font-bold"
      style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
    >
      {avatarUrl ? null : nome.slice(0, 1)}
    </span>
  );
}
