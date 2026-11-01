"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Avatar, Button, CampoDeBusca, Chip, EmptyState, SectionTitle } from "@/design/components";

/** Mês e ano: o dia exato de quando alguém entrou não interessa a ninguém. */
function mesEAno(data: Date) {
  return data.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}
import { alternarSeguirMembro, convidarParaModerar, tirarDaModeracao } from "./actions";
import type { FiltroDeMembros, MembroNaComunidade } from "@/lib/data/membros";

const FILTROS: { id: FiltroDeMembros; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "moderacao", rotulo: "Moderação" },
  { id: "novos", rotulo: "Novos" },
];

/**
 * A aba Membros da comunidade.
 *
 * Existe para **conhecer gente**, que é a promessa da cadeia do Hub:
 * interesse → comunidade → tópico → resposta → afinidade. Por isso o botão
 * que importa aqui é Seguir, e não Remover — remover vive na moderação, que
 * é outra tela com outro propósito.
 *
 * O filtro e a busca ficam na URL, como na lista de tópicos: o endereço
 * fica compartilhável e o botão voltar funciona.
 */
export function MembrosDaComunidade({
  slug,
  communityId,
  total,
  membros,
  filtro,
  termo,
  souModerador,
  souMembro,
}: {
  slug: string;
  communityId: string;
  /** O total da comunidade, que pode ser maior do que a página mostra. */
  total: number;
  membros: MembroNaComunidade[];
  filtro: FiltroDeMembros;
  termo: string;
  souModerador: boolean;
  souMembro: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [procurado, setProcurado] = useState(termo);

  function irPara(mudar: (p: URLSearchParams) => void) {
    const novos = new URLSearchParams(params.toString());
    novos.set("aba", "membros");
    mudar(novos);
    router.push(`/c/${slug}?${novos}`);
  }

  // Mesmo atraso da busca de tópicos: a tecla seguinte cancela a ida ao
  // servidor, em vez de somar uma requisição por letra.
  useEffect(() => {
    const atual = procurado.trim();
    if (atual === termo.trim()) return;

    const espera = setTimeout(() => {
      irPara((p) => {
        if (atual) p.set("pessoa", atual);
        else p.delete("pessoa");
      });
    }, 350);

    return () => clearTimeout(espera);
    // `irPara` é recriada a cada render e não muda de comportamento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procurado, termo, params, router, slug]);

  const [convidando, setConvidando] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      {/*
        O botão vai na `acao` do `SectionTitle`, e não numa linha montada à
        mão: a linha à mão era `flex-wrap` e o botão saía da borda direita
        numa janela estreita — foi o print de "+ Conv…" cortado.

        Convidar é copiar o endereço da comunidade: quem abrir vê a capa, o
        nome e a pergunta, e entra com um toque (RN16). Só para quem
        participa — convidar para um lugar onde você não está é estranho.
      */}
      <div className="flex flex-col gap-1">
        <SectionTitle
          contagem={total}
          acao={
            souMembro ? (
              <Button
                size="sm"
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(`${window.location.origin}/c/${slug}`)
                    .then(() => setConvidando(true))
                    .catch(() => setConvidando(false));
                }}
              >
                {convidando ? "Link copiado" : "Convidar"}
              </Button>
            ) : undefined
          }
        >
          Membros
        </SectionTitle>
        <p className="text-caption text-inkMuted">
          Siga pessoas para ver o que elas fazem no seu Início.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1" role="group" aria-label="Filtrar membros">
          {FILTROS.map((opcao) => (
            <Chip
              formato="pilula"
              key={opcao.id}
              label={opcao.rotulo}
              selected={filtro === opcao.id}
              onClick={() =>
                irPara((p) => {
                  if (opcao.id === "todos") p.delete("filtro");
                  else p.set("filtro", opcao.id);
                })
              }
            />
          ))}
        </div>

        <CampoDeBusca
          rotulo="Buscar pessoas na comunidade"
          atalho
          placeholder="Buscar pessoas"
          className="min-w-0 flex-1"
          value={procurado}
          onChange={(evento) => setProcurado(evento.target.value)}
        />
      </div>

      {membros.length === 0 ? (
        <EmptyState
          title={termo ? `Ninguém encontrado para "${termo}"` : "Ninguém por aqui ainda"}
          description={termo ? "Tente outro nome ou @." : "Seja a primeira pessoa a entrar."}
        />
      ) : (
        <ul className="flex flex-col gap-1">
          {membros.map((membro) => (
            <LinhaDeMembro
              key={membro.id}
              membro={membro}
              slug={slug}
              communityId={communityId}
              souModerador={souModerador}
              souMembro={souMembro}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function LinhaDeMembro({
  membro,
  slug,
  communityId,
  souModerador,
  souMembro,
}: {
  membro: MembroNaComunidade;
  slug: string;
  communityId: string;
  souModerador: boolean;
  souMembro: boolean;
}) {
  const [sigo, setSigo] = useState(membro.sigo ?? false);
  const [convite, setConvite] = useState<"nenhum" | "enviado" | "erro">("nenhum");
  const [pendente, iniciar] = useTransition();

  function seguir() {
    const antes = sigo;
    setSigo(!antes);
    iniciar(async () => {
      try {
        await alternarSeguirMembro(membro.id, slug, antes);
      } catch {
        setSigo(antes);
      }
    });
  }

  function convidar() {
    iniciar(async () => {
      const { erro } = await convidarParaModerar(communityId, slug, membro.id);
      setConvite(erro ? "erro" : "enviado");
    });
  }

  function tirar() {
    iniciar(async () => {
      const { erro } = await tirarDaModeracao(communityId, slug, membro.id);
      if (erro) setConvite("erro");
    });
  }

  /*
   * Um selo só por pessoa, e o mais específico ganha. Dois selos lado a
   * lado fazem procurar diferença entre eles — e quem criou também modera,
   * então "Criadora, Moderação" seria redundância escrita.
   */
  const selo = membro.criador
    ? { texto: "Criadora", cor: "bg-sun" }
    : membro.moderador
      ? { texto: "Moderação", cor: "bg-lavender" }
      : membro.novato
        ? { texto: "Entrou esta semana", cor: "bg-line" }
        : null;

  return (
    <li className="bg-paper flex items-center gap-2 rounded-sm p-2">
      <Link href={`/${membro.handle}`} className="flex min-w-0 flex-1 items-center gap-2">
        <Avatar nome={membro.nome} url={membro.avatarUrl} tamanho="lg" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1">
            <span className="text-bodyStrong text-ink truncate">
              {membro.nome}
              {membro.souEu ? " (você)" : ""}
            </span>
            {selo ? (
              <span
                className={`${selo.cor} text-ink text-caption rounded-pill shrink-0 px-2 font-bold`}
              >
                {selo.texto}
              </span>
            ) : null}
          </span>
          <span className="text-caption text-inkMuted block truncate">
            @{membro.handle} · entrou em {mesEAno(membro.desde)} ·{" "}
            {/* RN28: resposta ou tópico criado, nesta comunidade. */}
            {membro.contribuicoes.toLocaleString("pt-BR")}{" "}
            {membro.contribuicoes === 1 ? "contribuição" : "contribuições"}
          </span>
        </span>
      </Link>

      {/*
        As ações num grupo `shrink-0`: a coluna do nome é que encolhe, e
        ela já trunca. Sem isto, o botão comprido — "Convidar para
        moderar" — ia sendo comido pela borda letra a letra.
      */}
      <div className="flex shrink-0 items-center gap-1">
        {membro.souEu || membro.sigo === null ? null : (
          <Button
            size="sm"
            variant={sigo ? "secondary" : "primary"}
            onClick={seguir}
            disabled={pendente}
            disabledHint="Aguarde um instante"
          >
            {sigo ? "Seguindo" : "Seguir"}
          </Button>
        )}

        {/*
        RN06: o convite, nunca a promoção direta. Quem já modera não recebe
        botão, e quem criou a comunidade também não — já é moderadora.
      */}
        {souModerador && souMembro && !membro.moderador && !membro.souEu ? (
          convite === "enviado" ? (
            <span className="text-caption text-inkMuted">Convite enviado</span>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={convidar}
              disabled={pendente}
              disabledHint="Aguarde um instante"
            >
              Convidar para moderar
            </Button>
          )
        ) : null}

        {/*
        RN33: tirar a moderação, junto de quem a dá. Quem criou a
        comunidade não aparece aqui — a recusa existe no servidor, mas
        oferecer o botão seria prometer o que vai dar erro.
      */}
        {souModerador && souMembro && membro.moderador && !membro.criador && !membro.souEu ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={tirar}
            disabled={pendente}
            disabledHint="Aguarde um instante"
          >
            Tirar moderação
          </Button>
        ) : null}

        {convite === "erro" ? (
          <span role="alert" className="text-caption text-error">
            Não deu para convidar
          </span>
        ) : null}
      </div>
    </li>
  );
}
