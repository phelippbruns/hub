/**
 * Os endereços do Hub que mais de um lugar precisa montar.
 *
 * **Sem `"use client"`, de propósito**, e sem importar nada: isto é
 * chamado por Server Components, pela camada de dados e por componentes
 * de cliente. Qualquer dependência aqui atravessaria as três fronteiras.
 *
 * Existe porque **catorze lugares** montavam o endereço de tópico à mão —
 * cinco no Início, a comunidade, o perfil, a Coleção, Explorar, a busca,
 * as notificações duas vezes, a Cabine e o redirecionamento depois de
 * criar. Trocar catorze strings e torcer é como este tipo de mudança
 * falha: a décima quinta nasce errada na feature seguinte, e um link para
 * o lugar errado não quebra nada — ele só leva a pessoa para outra tela,
 * em silêncio.
 *
 * `lib/data/rotas-de-topico.test.ts` varre o código e reprova quem montar
 * à mão.
 */

/** A comunidade. */
export function enderecoDaComunidade(comunidade: string): string {
  return `/c/${comunidade}`;
}

/**
 * **Navegar** até um tópico: a comunidade com o painel aberto ao lado.
 *
 * Desde 6 de novembro de 2026 a tela cheia do tópico não existe mais —
 * decisão do PO. Todo clique dentro do Hub vem parar aqui.
 */
export function enderecoDoTopico(comunidade: string, topico: string): string {
  return `/c/${comunidade}?t=${encodeURIComponent(topico)}`;
}

/**
 * **Compartilhar** um tópico: o endereço canônico, com o tópico no
 * caminho.
 *
 * **Este não mudou, e não pode mudar.** É ele que carrega a prévia do
 * link (capa, nome, pergunta) e a tela de convite para quem abre sem
 * conta — a porta de entrada do Hub. Quem tem sessão e abre este
 * endereço é levado ao painel; quem não tem vê o convite.
 *
 * Colapsar os dois numa função só foi a primeira ideia, e quebraria o
 * compartilhamento inteiro.
 */
export function enderecoParaCompartilharTopico(comunidade: string, topico: string): string {
  return `/c/${comunidade}/${topico}`;
}

/**
 * O perfil de alguém — **e o seu tem endereço próprio**.
 *
 * `/perfil` e `/<handle>` mostram a mesma tela, e quem abre o próprio @ é
 * redirecionado para `/perfil`. Essa é a razão desta função existir: um
 * link do dono para `/<handle>?post=x` passa pelo redirecionamento, que
 * **não leva os parâmetros junto** — o painel sumia e ninguém entendia por
 * quê. Aconteceu, e está no `faustao.md`.
 */
export function enderecoDoPerfil(handle: string, souEu: boolean): string {
  return souEu ? "/perfil" : `/${handle}`;
}

/**
 * **Navegar** até um post: o perfil com o painel aberto ao lado.
 *
 * O mesmo par de funções do tópico, pelo mesmo motivo — e a diferença
 * entre elas importa tanto quanto lá. Todo clique dentro do Hub vem parar
 * aqui.
 *
 * `perfil` é o endereço da tela, de `enderecoDoPerfil()`: `/perfil` quando
 * é o seu, `/<handle>` quando é de outra pessoa. O slug já é limpo, mas o
 * parâmetro é público — um `&` nele viraria outro parâmetro na URL.
 */
export function enderecoDoPost(perfil: string, post: string): string {
  return `${perfil}?post=${encodeURIComponent(post)}`;
}

/**
 * **Compartilhar** um post: o endereço canônico, com o post no caminho.
 *
 * É ele que carrega a prévia do link e o que se cola numa conversa. Quem
 * tem sessão e abre este endereço é levado ao painel; quem não tem vê o
 * convite, como no tópico.
 *
 * O endereço é `/<handle>/<post>` e não `/blog/<id>`: o post é da pessoa,
 * e o perfil já mora na raiz. Um primeiro nível novo custaria um @
 * reservado a mais e deixaria quem tivesse `@blog` inalcançável.
 */
export function enderecoParaCompartilharPost(handle: string, post: string): string {
  return `/${handle}/${post}`;
}
