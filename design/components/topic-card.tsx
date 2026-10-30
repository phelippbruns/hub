import type { ReactNode } from "react";
import { Avatar } from "./avatar";
import { TopicStarInline } from "../icons/marks";

/**
 * O cartão de um tópico na lista da comunidade.
 *
 * Diferente do [TopicRow](./topic-row.tsx), que é uma linha de índice: aqui
 * aparece **a última contribuição**, com quem a escreveu. Sem ela o cartão
 * era um nome e dois números, e a lista inteira parecia um sumário — não
 * dava para saber do que se estava falando sem abrir um por um.
 *
 * O texto da contribuição é cortado em duas linhas. Ele é sempre texto,
 * nunca HTML (regra de segurança 8).
 *
 * Mantém a promessa da RN15: **nunca um placar**. Os números dizem quantas
 * pessoas e quantas contribuições, e não quem ganhou.
 */
export function TopicCard({
  name,
  people,
  answers,
  when,
  following = false,
  novas = 0,
  ultima,
  action,
}: {
  name: string;
  people: number;
  answers: number;
  /** "há 2 h", já escrito. */
  when?: string;
  following?: boolean;
  /** Contribuições desde a última visita. Zero não desenha selo. */
  novas?: number;
  ultima?: {
    texto: string;
    autorNome: string;
    autorHandle: string;
    avatarUrl: string | null;
  } | null;
  action?: ReactNode;
}) {
  return (
    <div className="bg-paper flex flex-col gap-2 rounded-sm p-3">
      <div className="flex items-start gap-2">
        <span className="text-bodyStrong text-ink min-w-0 flex-1 truncate">
          <TopicStarInline className="text-ink mr-1" />
          {name}
        </span>

        {/*
          O selo de novidades leva o número, e não só a cor: "3 novas" diz
          se vale abrir agora; um ponto colorido não diz nada.
        */}
        {novas > 0 ? (
          <span className="bg-sun text-ink text-caption rounded-pill shrink-0 px-2 py-1 font-semibold">
            {novas} {novas === 1 ? "nova" : "novas"}
          </span>
        ) : null}

        {action}
      </div>

      {ultima ? (
        <div className="flex items-start gap-2">
          <Avatar nome={ultima.autorNome} url={ultima.avatarUrl} tamanho="sm" />
          <p className="text-caption text-inkMuted line-clamp-2 min-w-0 flex-1">
            <span className="text-ink font-semibold">@{ultima.autorHandle}</span>{" "}
            {ultima.texto || "enviou uma imagem"}
          </p>
        </div>
      ) : (
        <p className="text-caption text-inkMuted">
          Ainda sem contribuições. Seja a primeira pessoa a contribuir.
        </p>
      )}

      <span className="text-caption text-inkMuted">
        {people} {people === 1 ? "pessoa" : "pessoas"} · {answers}{" "}
        {answers === 1 ? "contribuição" : "contribuições"}
        {when ? ` · ${when}` : ""}
        {following ? " · Seguindo" : ""}
      </span>
    </div>
  );
}
