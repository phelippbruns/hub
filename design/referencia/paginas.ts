/**
 * **O catálogo das telas de referência.**
 *
 * Uma entrada por *estado*, não por rota: `/inicio` aparece duas vezes porque
 * o Início cheio e o Início vazio são dois desenhos diferentes, e o vazio é
 * justamente o que some de qualquer captura feita depois de criar conteúdo.
 *
 * `origem` é o `page.tsx` que desenha, e `lib/referencia/paginas.test.ts`
 * confere que cada um existe — catálogo que aponta para arquivo que saiu do
 * lugar é a primeira coisa que apodrece numa pasta gerada.
 *
 * Fora daqui, de propósito:
 *
 * - **as rotas que só redirecionam** (`/onboarding`, `/topico/[id]`,
 *   `/c/<com>/novo`, `/perfil/seguidores`, `/<handle>/<post>`): não têm
 *   desenho próprio, e capturar um redirecionamento é capturar o destino com
 *   o nome errado;
 * - **`/completar-cadastro`**, que só é alcançável no retorno do OAuth do
 *   Google. Declarada ausente em `AUSENTES`, com o motivo — ausência
 *   explicada é informação; ausência silenciosa é lacuna.
 */

export type Area =
  | "entrada"
  | "onboarding"
  | "inicio"
  | "descoberta"
  | "comunidade"
  | "topico"
  | "perfil"
  | "cabine"
  | "moderacao"
  | "sistema";

export type Pagina = {
  /** Nome do arquivo, sem extensão. Único. */
  id: string;
  area: Area;
  /** O que esta tela é, em uma linha, para o índice. */
  titulo: string;
  /** O endereço no app, com os parâmetros que produzem este estado. */
  rota: string;
  /** O `page.tsx` que desenha. */
  origem: string;
  /**
   * O estado capturado, dito em palavras. **Escrito à mão de propósito**: é
   * julgamento ("comunidade cheia, painel aberto"), não dado derivável.
   */
  estado: string;
  /** Quem está logado: `a` dona, `b` visitante, `c` conta nova, ou ninguém. */
  persona: "a" | "b" | "c" | "sem-conta";
};

/** A cadeia de layouts de cada grupo de rotas, para o inventário. */
export const LAYOUTS: Record<string, string[]> = {
  app: ["app/(app)/layout.tsx", "app/layout.tsx"],
  entrada: ["app/(entrada)/layout.tsx", "app/layout.tsx"],
  apresentacao: ["app/(apresentacao)/layout.tsx", "app/layout.tsx"],
  raiz: ["app/layout.tsx"],
};

/** Em que cadeia de layouts cada `origem` cai. Derivado do caminho. */
export function layoutsDe(origem: string): string[] {
  if (origem.startsWith("app/(app)/")) return LAYOUTS.app!;
  if (origem.startsWith("app/(entrada)/")) return LAYOUTS.entrada!;
  if (origem.startsWith("app/(apresentacao)/")) return LAYOUTS.apresentacao!;
  return LAYOUTS.raiz!;
}

export const PAGINAS: Pagina[] = [
  // ------------------------------------------------------------- entrada
  {
    id: "abertura",
    area: "entrada",
    titulo: "A porta do Hub",
    rota: "/",
    origem: "app/(entrada)/page.tsx",
    estado: "Sem sessão. A marca em 88 px, dois botões, link para os termos.",
    persona: "sem-conta",
  },
  {
    id: "entrar",
    area: "entrada",
    titulo: "Entrar",
    rota: "/entrar",
    origem: "app/(entrada)/entrar/page.tsx",
    estado: "Campo único de email ou @. O botão do Google aparece se configurado.",
    persona: "sem-conta",
  },
  {
    id: "criar-conta",
    area: "entrada",
    titulo: "Criar conta",
    rota: "/criar-conta",
    origem: "app/(entrada)/criar-conta/page.tsx",
    estado: "Formulário vazio, com o aviso de idade mínima.",
    persona: "sem-conta",
  },
  {
    id: "criar-conta-preenchida",
    area: "entrada",
    titulo: "Criar conta, preenchida",
    rota: "/criar-conta",
    origem: "app/(entrada)/criar-conta/page.tsx",
    estado: "Todos os campos preenchidos e os termos aceitos, antes de enviar.",
    persona: "sem-conta",
  },
  {
    id: "senha",
    area: "entrada",
    titulo: "Recuperar senha",
    rota: "/senha",
    origem: "app/(entrada)/senha/page.tsx",
    estado: "Pedido do código por email.",
    persona: "sem-conta",
  },
  {
    id: "senha-codigo",
    area: "entrada",
    titulo: "Código de seis dígitos",
    rota: "/senha/codigo?email=…",
    origem: "app/(entrada)/senha/codigo/page.tsx",
    estado: "Campo de código vazio. Sem o parâmetro de email a rota redireciona.",
    persona: "sem-conta",
  },
  {
    id: "termos",
    area: "entrada",
    titulo: "Termos e privacidade",
    rota: "/termos",
    origem: "app/(entrada)/termos/page.tsx",
    estado: "Texto de espaço reservado: o conteúdo real chega na F18.",
    persona: "sem-conta",
  },

  // ---------------------------------------------------------- onboarding
  {
    id: "boas-vindas-primeiro-card",
    area: "onboarding",
    titulo: "Apresentação, primeiro card",
    rota: "/boas-vindas",
    origem: "app/(apresentacao)/boas-vindas/page.tsx",
    estado: "Conta nova, nenhum card visto. Largura cheia, sem barra de navegação.",
    persona: "a",
  },
  {
    id: "boas-vindas-comunidades",
    area: "onboarding",
    titulo: "Escolher três comunidades",
    rota: "/boas-vindas",
    origem: "app/(apresentacao)/boas-vindas/page.tsx",
    estado: "Último card. Três comunidades marcadas, botão de concluir ativo (RN31).",
    persona: "a",
  },
  {
    id: "boas-vindas-notificacoes",
    area: "onboarding",
    titulo: "Pedir notificações",
    rota: "/boas-vindas/notificacoes",
    origem: "app/(apresentacao)/boas-vindas/notificacoes/page.tsx",
    estado: "Pedido de permissão, antes de responder.",
    persona: "a",
  },

  // -------------------------------------------------------------- inicio
  {
    id: "inicio-vazio",
    area: "inicio",
    titulo: "Início sem comunidade nenhuma",
    rota: "/inicio",
    origem: "app/(app)/inicio/page.tsx",
    estado:
      "Conta nova, nada seguido. Cartão de convite e até três sugestões. **Capturado antes de criar conteúdo** — depois este estado não volta.",
    persona: "c",
  },
  {
    id: "inicio-cheio",
    area: "inicio",
    titulo: "Início com conteúdo",
    rota: "/inicio",
    origem: "app/(app)/inicio/page.tsx",
    estado:
      "Hot Topic eleito, tópicos seguidos com novas, interações de quem sigo, e o fim da lista.",
    persona: "a",
  },

  // ---------------------------------------------------------- descoberta
  {
    id: "explorar",
    area: "descoberta",
    titulo: "Explorar",
    rota: "/comunidades",
    origem: "app/(app)/comunidades/page.tsx",
    estado: "Comunidades em alta, tópicos em alta e Para você.",
    persona: "a",
  },
  {
    id: "busca",
    area: "descoberta",
    titulo: "Busca com resultado",
    rota: "/busca?q=…",
    origem: "app/(app)/busca/page.tsx",
    estado: "Termo que acha comunidade, tópico e pessoa ao mesmo tempo.",
    persona: "a",
  },
  {
    id: "minhas-comunidades",
    area: "descoberta",
    titulo: "Minhas comunidades",
    rota: "/comunidades/minhas",
    origem: "app/(app)/comunidades/minhas/page.tsx",
    estado: "Com fixadas e com a lista de A a Z.",
    persona: "a",
  },
  {
    id: "comunidade-nova",
    area: "descoberta",
    titulo: "Criar comunidade",
    rota: "/comunidades/nova",
    origem: "app/(app)/comunidades/nova/page.tsx",
    estado: "Formulário vazio, com o campo de capa e o contador do nome.",
    persona: "a",
  },

  // --------------------------------------------------------- comunidade
  {
    id: "comunidade-vazia",
    area: "comunidade",
    titulo: "Comunidade recém-criada",
    rota: "/c/<slug>",
    origem: "app/(app)/c/[comunidade]/page.tsx",
    estado:
      "Um membro, nenhum tópico. O vazio de 'Nenhum tópico ainda'. **Capturado antes de criar tópico.**",
    persona: "a",
  },
  {
    id: "comunidade-cheia",
    area: "comunidade",
    titulo: "Comunidade com tópicos",
    rota: "/c/<slug>",
    origem: "app/(app)/c/[comunidade]/page.tsx",
    estado: "Capa, Hot Topic fixado na primeira linha, lista de tópicos, coluna da direita.",
    persona: "a",
  },
  {
    id: "comunidade-enquetes",
    area: "comunidade",
    titulo: "Aba de enquetes",
    rota: "/c/<slug>?aba=enquetes",
    origem: "app/(app)/c/[comunidade]/page.tsx",
    estado: "Uma enquete esperando voto e uma com resultado (RN37).",
    persona: "a",
  },
  {
    id: "comunidade-eventos",
    area: "comunidade",
    titulo: "Aba de eventos",
    rota: "/c/<slug>?aba=eventos",
    origem: "app/(app)/c/[comunidade]/page.tsx",
    estado: "Um evento futuro com presença confirmada.",
    persona: "a",
  },
  {
    id: "comunidade-evento-aberto",
    area: "comunidade",
    titulo: "Evento aberto, com os comentários",
    rota: "/c/<slug>?aba=eventos&evento=<id>",
    origem: "app/(app)/c/[comunidade]/page.tsx",
    estado:
      "O encontro no centro, com a coluna da direita ao lado, e a área de " +
      "comentários embaixo — que é o corpo do tópico com outro cabeçalho (RN38).",
    persona: "a",
  },
  {
    id: "comunidade-membros",
    area: "comunidade",
    titulo: "Aba de membros",
    rota: "/c/<slug>?aba=membros",
    origem: "app/(app)/c/[comunidade]/page.tsx",
    estado: "Lista com moderadora e membros, com o filtro de papel.",
    persona: "a",
  },
  {
    id: "comunidade-janela-novo-topico",
    area: "comunidade",
    titulo: "Janela de criar tópico",
    rota: "/c/<slug>?novo=1",
    origem: "app/(app)/c/[comunidade]/page.tsx",
    estado:
      "Janela aberta sobre a comunidade. Desenhada por portal: no HTML congelado ela é o último filho do body, longe de onde o componente é escrito.",
    persona: "a",
  },

  // -------------------------------------------------------------- topico
  {
    id: "topico-no-painel",
    area: "topico",
    titulo: "Tópico aberto no painel",
    rota: "/c/<slug>?t=<topico>",
    origem: "app/(app)/c/[comunidade]/page.tsx",
    estado:
      "Painel à direita com a abertura em cartão escuro, contribuições com imagem, GIF e estrelas. É a tela mais usada do Hub.",
    persona: "a",
  },
  {
    id: "convite-comunidade",
    area: "topico",
    titulo: "Convite: comunidade sem conta",
    rota: "/c/<slug>",
    origem: "app/(app)/c/[comunidade]/page.tsx",
    estado: "Sem sessão. Capa, nome, membros e intro — sem barra de navegação.",
    persona: "sem-conta",
  },
  {
    id: "convite-topico",
    area: "topico",
    titulo: "Convite: tópico sem conta",
    rota: "/c/<slug>/<topico>",
    origem: "app/(app)/c/[comunidade]/[topico]/page.tsx",
    estado: "Sem sessão. A pergunta aparece; **o texto das respostas nunca** (RN16).",
    persona: "sem-conta",
  },

  // -------------------------------------------------------------- perfil
  {
    id: "perfil-dono-blog",
    area: "perfil",
    titulo: "Meu perfil, aba Blog",
    rota: "/perfil",
    origem: "app/(app)/perfil/page.tsx",
    estado: "Dono: com status, posts, Coleção no menu e contador de seguindo (RN27).",
    persona: "a",
  },
  {
    id: "perfil-post-no-painel",
    area: "perfil",
    titulo: "Post aberto no painel",
    rota: "/perfil?post=<post>",
    origem: "app/(app)/perfil/page.tsx",
    estado: "Painel irmão do painel do tópico, com cookie de largura próprio.",
    persona: "a",
  },
  {
    id: "perfil-visitante",
    area: "perfil",
    titulo: "Perfil de outra pessoa",
    rota: "/<handle>",
    origem: "app/(app)/[handle]/page.tsx",
    estado: "Visitante: seguir, Cabine e menu de denunciar. Sem Coleção.",
    persona: "b",
  },
  {
    id: "perfil-editar",
    area: "perfil",
    titulo: "Editar perfil",
    rota: "/perfil/editar",
    origem: "app/(app)/perfil/editar/page.tsx",
    estado: "Formulário preenchido, com as 8 cores de fundo.",
    persona: "a",
  },
  {
    id: "perfil-seguindo",
    area: "perfil",
    titulo: "Seguindo e seguidores",
    rota: "/perfil/seguindo",
    origem: "app/(app)/perfil/seguindo/page.tsx",
    estado: "Com pessoas nas duas abas.",
    persona: "a",
  },

  // -------------------------------------------------------------- cabine
  {
    id: "cabines-vazia",
    area: "cabine",
    titulo: "Cabines sem nenhuma conversa",
    rota: "/cabines",
    origem: "app/(app)/cabines/(lista)/page.tsx",
    estado: "Conta nova. Lista vazia e o painel direito em 'Escolha uma conversa'.",
    persona: "c",
  },
  {
    id: "cabine-conversa",
    area: "cabine",
    titulo: "Cabine em conversa",
    rota: "/cabines/<id>",
    origem: "app/(app)/cabines/[cabine]/page.tsx",
    estado: "Seis mensagens dos dois lados, balões em lavanda e em paper.",
    persona: "a",
  },
  {
    id: "cabine-nova",
    area: "cabine",
    titulo: "Convidar para a Cabine",
    rota: "/cabines/nova",
    origem: "app/(app)/cabines/nova/page.tsx",
    estado: "Pessoa escolhida e mensagem do convite escrita.",
    persona: "a",
  },

  // ----------------------------------------------------------- moderacao
  {
    id: "denuncia",
    area: "moderacao",
    titulo: "Denunciar",
    rota: "/denuncia?resposta=<id>",
    origem: "app/(app)/denuncia/page.tsx",
    estado: "Com o trecho denunciado em contexto e os motivos.",
    persona: "b",
  },
  {
    id: "moderar-denuncias",
    area: "moderacao",
    titulo: "Moderar: fila de denúncias",
    rota: "/c/<slug>/moderar",
    origem: "app/(app)/c/[comunidade]/moderar/page.tsx",
    estado: "Uma denúncia pendente. Quem não modera recebe 404, não 403.",
    persona: "a",
  },
  {
    id: "moderar-membros",
    area: "moderacao",
    titulo: "Moderar: membros",
    rota: "/c/<slug>/moderar?aba=membros",
    origem: "app/(app)/c/[comunidade]/moderar/page.tsx",
    estado: "Lista com busca e ações de moderação.",
    persona: "a",
  },

  // ------------------------------------------------------------- sistema
  {
    id: "notificacoes-vazia",
    area: "sistema",
    titulo: "Notificações sem nada",
    rota: "/notificacoes",
    origem: "app/(app)/notificacoes/page.tsx",
    estado: "Conta nova. O vazio de 'Nada por aqui'.",
    persona: "c",
  },
  {
    id: "notificacoes-cheia",
    area: "sistema",
    titulo: "Notificações com avisos",
    rota: "/notificacoes",
    origem: "app/(app)/notificacoes/page.tsx",
    estado: "'Só para te avisar' em lavanda e 'Essa semana' abaixo (RN34).",
    persona: "b",
  },
  {
    id: "configuracoes",
    area: "sistema",
    titulo: "Configurações",
    rota: "/configuracoes",
    origem: "app/(app)/configuracoes/page.tsx",
    estado: "Privacidade (RN23), notificações (RN34) e o aviso da F17.",
    persona: "a",
  },
  {
    id: "design-galeria",
    area: "sistema",
    titulo: "A galeria do design system",
    rota: "/design",
    origem: "app/design/page.tsx",
    estado:
      "Estados do sistema, paleta, tipografia e os componentes. Fora de todos os grupos de layout.",
    persona: "a",
  },
];

/**
 * Telas que **não** estão na pasta, e por quê.
 *
 * Ausência explicada é informação. Ausência silenciosa é lacuna, e alguém vai
 * gastar meia hora procurando a tela que eu decidi não capturar.
 */
export const AUSENTES: { rota: string; porque: string }[] = [
  {
    rota: "/completar-cadastro",
    porque:
      "Só é alcançável no retorno do OAuth do Google, que exige um cliente configurado no Google Cloud. Capturar um estado de erro e chamar de tela seria pior do que a ausência.",
  },
  {
    rota: "/cabines/convite",
    porque:
      "O convite é aceito pela lista em /cabines, que é o caminho de quem usa. A rota direta existe para link, e o desenho é o mesmo cartão da lista.",
  },
  {
    rota: "/criar-topico e /topico/[id] e /c/<slug>/novo",
    porque: "Redirecionam. Capturar um redirecionamento é capturar o destino com o nome errado.",
  },
];
