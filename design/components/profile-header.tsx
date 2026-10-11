import type { ReactNode } from "react";

function numero(valor: number) {
  return valor.toLocaleString("pt-BR");
}

/**
 * O topo do perfil: foto, nome, @, seguidores e descrição (RN27).
 *
 * Na web fica centralizado, como as telas 21 e 24 mostram.
 *
 * **Seguidores é texto, não link** (RN28). O escopo diz por quê: evitar
 * comparação entre perfis. O número de pessoas seguidas só aparece no perfil
 * próprio — por isso `seguindo` é opcional, e ausente quer dizer "não é da
 * sua conta", não "zero".
 */
export function ProfileHeader({
  nome,
  handle,
  bio,
  avatarUrl,
  seguidores,
  seguindo,
  acoes,
  comoTitulo = false,
}: {
  nome: string;
  handle: string;
  bio: string | null;
  avatarUrl: string | null;
  seguidores: number;
  seguindo?: ReactNode;
  acoes?: ReactNode;
  /**
   * Quando o nome **é** o título da tela.
   *
   * No perfil de outra pessoa o protótipo não repete o nome num título
   * acima: o nome já é o título. Mas a tela precisa de um `h1`, senão quem
   * usa leitor de tela perde a âncora da página.
   */
  comoTitulo?: boolean;
}) {
  const Nome = comoTitulo ? "h1" : "span";
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span
        aria-hidden="true"
        className="size-avatarLg rounded-pill bg-lavender block bg-cover bg-center"
        style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
      />

      <span>
        <Nome className="text-title text-ink block">{nome}</Nome>
        <span className="text-caption text-inkMuted block">@{handle}</span>
      </span>

      <span className="text-caption text-inkMuted flex items-center gap-3">
        <span>
          {numero(seguidores)} {seguidores === 1 ? "seguidor" : "seguidores"}
        </span>
        {seguindo}
      </span>

      {bio ? <p className="text-body text-ink max-w-contentColumn">{bio}</p> : null}

      {acoes ? <div className="flex w-full gap-2">{acoes}</div> : null}
    </div>
  );
}

/**
 * Os três contadores, em caixas iguais (RN28).
 *
 * Iguais de propósito: nenhum deles é mais importante que o outro, e todos
 * medem participação — respostas, comunidades e dias ativos. Não há
 * popularidade aqui.
 */
export function ProfileCounters({
  respostas,
  comunidades,
  diasAtivos,
}: {
  respostas: number;
  comunidades: number;
  diasAtivos: number;
}) {
  const caixas = [
    { valor: respostas, rotulo: respostas === 1 ? "resposta" : "respostas" },
    { valor: comunidades, rotulo: comunidades === 1 ? "comunidade" : "comunidades" },
    { valor: diasAtivos, rotulo: diasAtivos === 1 ? "dia ativo" : "dias ativos" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {caixas.map(({ valor, rotulo }) => (
        <div key={rotulo} className="bg-paper flex flex-col items-center rounded-sm p-2">
          <span className="text-subtitle text-ink">{numero(valor)}</span>
          <span className="text-caption text-inkMuted">{rotulo}</span>
        </div>
      ))}
    </div>
  );
}
