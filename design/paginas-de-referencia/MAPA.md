# Mapa das telas do Hub

Gerado em 2026-11-25, do commit `e57ef00`. **Não edite à mão** — rode `npm run referencia`.

> Cada tela lista os componentes **no caminho da rota**, não os visíveis naquele estado: um ramo condicional pode não estar na tela capturada. Para mexer em algo, a lista é suficiente; para afirmar que algo aparece, confira o retrato.

40 telas, 62 componentes do design system.

## Entrada e cadastro

### A porta do Hub

- **retrato:** `retratos/abertura.png`
- **rota:** `/`
- **desenha em:** `app/(entrada)/page.tsx`
- **layouts:** `app/(entrada)/layout.tsx` → `app/layout.tsx`
- **estado:** Sem sessão. A marca em 88 px, dois botões, link para os termos.
- **componentes (1):** `LevelMark`

### Entrar

- **retrato:** `retratos/entrar.png`
- **rota:** `/entrar`
- **desenha em:** `app/(entrada)/entrar/page.tsx`
- **layouts:** `app/(entrada)/layout.tsx` → `app/layout.tsx`
- **estado:** Campo único de email ou @. O botão do Google aparece se configurado.
- **componentes (3):** `Button`, `Input`, `PasswordInput`

### Criar conta

- **retrato:** `retratos/criar-conta.png`
- **rota:** `/criar-conta`
- **desenha em:** `app/(entrada)/criar-conta/page.tsx`
- **layouts:** `app/(entrada)/layout.tsx` → `app/layout.tsx`
- **estado:** Formulário vazio, com o aviso de idade mínima.
- **componentes (5):** `Button`, `Checkbox`, `Input`, `PasswordInput`, `Steps`

### Criar conta, preenchida

- **retrato:** `retratos/criar-conta-preenchida.png`
- **rota:** `/criar-conta`
- **desenha em:** `app/(entrada)/criar-conta/page.tsx`
- **layouts:** `app/(entrada)/layout.tsx` → `app/layout.tsx`
- **estado:** Todos os campos preenchidos e os termos aceitos, antes de enviar.
- **componentes (5):** `Button`, `Checkbox`, `Input`, `PasswordInput`, `Steps`

### Recuperar senha

- **retrato:** `retratos/senha.png`
- **rota:** `/senha`
- **desenha em:** `app/(entrada)/senha/page.tsx`
- **layouts:** `app/(entrada)/layout.tsx` → `app/layout.tsx`
- **estado:** Pedido do código por email.
- **componentes (11):** `Button`, `CodeInput`, `EmptyState`, `EndOfList`, `ErrorState`, `Input`, `LoadingBlock`, `PaginaCarregando`, `PasswordInput`, `Skeleton`, `SuccessMessage`

### Código de seis dígitos

- **retrato:** `retratos/senha-codigo.png`
- **rota:** `/senha/codigo?email=…`
- **desenha em:** `app/(entrada)/senha/codigo/page.tsx`
- **layouts:** `app/(entrada)/layout.tsx` → `app/layout.tsx`
- **estado:** Campo de código vazio. Sem o parâmetro de email a rota redireciona.
- **componentes (11):** `Button`, `CodeInput`, `EmptyState`, `EndOfList`, `ErrorState`, `Input`, `LoadingBlock`, `PaginaCarregando`, `PasswordInput`, `Skeleton`, `SuccessMessage`

### Termos e privacidade

- **retrato:** `retratos/termos.png`
- **rota:** `/termos`
- **desenha em:** `app/(entrada)/termos/page.tsx`
- **layouts:** `app/(entrada)/layout.tsx` → `app/layout.tsx`
- **estado:** Texto de espaço reservado: o conteúdo real chega na F18.
- **componentes (0):** 

## Primeiros passos

### Apresentação, primeiro card

- **retrato:** `retratos/boas-vindas-primeiro-card.png`
- **rota:** `/boas-vindas`
- **desenha em:** `app/(apresentacao)/boas-vindas/page.tsx`
- **layouts:** `app/(apresentacao)/layout.tsx` → `app/layout.tsx`
- **estado:** Conta nova, nenhum card visto. Largura cheia, sem barra de navegação.
- **componentes (4):** `Button`, `Chip`, `LevelMark`, `Paginador`

### Escolher três comunidades

- **retrato:** `retratos/boas-vindas-comunidades.png`
- **rota:** `/boas-vindas`
- **desenha em:** `app/(apresentacao)/boas-vindas/page.tsx`
- **layouts:** `app/(apresentacao)/layout.tsx` → `app/layout.tsx`
- **estado:** Último card. Três comunidades marcadas, botão de concluir ativo (RN31).
- **componentes (4):** `Button`, `Chip`, `LevelMark`, `Paginador`

### Pedir notificações

- **retrato:** `retratos/boas-vindas-notificacoes.png`
- **rota:** `/boas-vindas/notificacoes`
- **desenha em:** `app/(apresentacao)/boas-vindas/notificacoes/page.tsx`
- **layouts:** `app/(apresentacao)/layout.tsx` → `app/layout.tsx`
- **estado:** Pedido de permissão, antes de responder.
- **componentes (1):** `Button`

## Início

### Início sem comunidade nenhuma

- **retrato:** `retratos/inicio-vazio.png`
- **rota:** `/inicio`
- **desenha em:** `app/(app)/inicio/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Conta nova, nada seguido. Cartão de convite e até três sugestões. **Capturado antes de criar conteúdo** — depois este estado não volta.
- **componentes (35):** `ActivityRow`, `AjusteDeImagem`, `AppShell`, `Avatar`, `BottomSheet`, `Button`, `CampoDeBusca`, `CommunityCover`, `CommunityDoor`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `FollowButton`, `HomeRow`, `HotTopicCard`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `SectionTitle`, `Select`, `Skeleton`, `SuccessMessage`, `SuggestionRow`, `TextField`, `TopicName`

### Início com conteúdo

- **retrato:** `retratos/inicio-cheio.png`
- **rota:** `/inicio`
- **desenha em:** `app/(app)/inicio/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Hot Topic eleito, tópicos seguidos com novas, interações de quem sigo, e o fim da lista.
- **componentes (35):** `ActivityRow`, `AjusteDeImagem`, `AppShell`, `Avatar`, `BottomSheet`, `Button`, `CampoDeBusca`, `CommunityCover`, `CommunityDoor`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `FollowButton`, `HomeRow`, `HotTopicCard`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `SectionTitle`, `Select`, `Skeleton`, `SuccessMessage`, `SuggestionRow`, `TextField`, `TopicName`

## Descoberta

### Explorar

- **retrato:** `retratos/explorar.png`
- **rota:** `/comunidades`
- **desenha em:** `app/(app)/comunidades/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Comunidades em alta, tópicos em alta e Para você.
- **componentes (31):** `AjusteDeImagem`, `AppShell`, `BottomSheet`, `Button`, `CampoDeBusca`, `CommunityCover`, `CommunityDoor`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `FollowButton`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `SectionTitle`, `Segmented`, `Select`, `Skeleton`, `SuccessMessage`, `TextField`, `TopicName`

### Busca com resultado

- **retrato:** `retratos/busca.png`
- **rota:** `/busca?q=…`
- **desenha em:** `app/(app)/busca/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Termo que acha comunidade, tópico e pessoa ao mesmo tempo.
- **componentes (31):** `AjusteDeImagem`, `AppShell`, `BottomSheet`, `Button`, `CampoDeBusca`, `CommunityCover`, `CommunityDoor`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `FollowButton`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `SectionTitle`, `Segmented`, `Select`, `Skeleton`, `SuccessMessage`, `TextField`, `TopicName`

### Minhas comunidades

- **retrato:** `retratos/minhas-comunidades.png`
- **rota:** `/comunidades/minhas`
- **desenha em:** `app/(app)/comunidades/minhas/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Com fixadas e com a lista de A a Z.
- **componentes (28):** `AjusteDeImagem`, `AppShell`, `BottomSheet`, `Button`, `CampoDeBusca`, `CommunityCover`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `NavRail`, `PageTitle`, `PaginaCarregando`, `PinButton`, `Rotulo`, `RoundIconButton`, `SectionTitle`, `Select`, `Skeleton`, `SuccessMessage`, `TextField`

### Criar comunidade

- **retrato:** `retratos/comunidade-nova.png`
- **rota:** `/comunidades/nova`
- **desenha em:** `app/(app)/comunidades/nova/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Formulário vazio, com o campo de capa e o contador do nome.
- **componentes (26):** `AjusteDeImagem`, `AppShell`, `BottomSheet`, `Button`, `CampoDeBusca`, `CommunityCover`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `Select`, `Skeleton`, `SuccessMessage`, `TextField`

## Comunidade

### Comunidade recém-criada

- **retrato:** `retratos/comunidade-vazia.png`
- **rota:** `/c/<slug>`
- **desenha em:** `app/(app)/c/[comunidade]/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Um membro, nenhum tópico. O vazio de 'Nenhum tópico ainda'. **Capturado antes de criar tópico.**
- **componentes (44):** `AjusteDeImagem`, `AlcaDoPainel`, `AnswerCard`, `AppShell`, `Avatar`, `BottomSheet`, `Button`, `CampoDeBusca`, `Chip`, `CommunityChip`, `CommunityCover`, `CommunityDoor`, `ConfirmSheet`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `FollowButton`, `HandleLink`, `HotTopicCard`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `MenuSuspenso`, `MidiaDaContribuicao`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `SectionTitle`, `Select`, `Skeleton`, `StarButton`, `SuccessMessage`, `Tabs`, `TextField`, `TopicCard`, `TopicName`, `TopicOpening`

### Comunidade com tópicos

- **retrato:** `retratos/comunidade-cheia.png`
- **rota:** `/c/<slug>`
- **desenha em:** `app/(app)/c/[comunidade]/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Capa, Hot Topic fixado na primeira linha, lista de tópicos, coluna da direita.
- **componentes (44):** `AjusteDeImagem`, `AlcaDoPainel`, `AnswerCard`, `AppShell`, `Avatar`, `BottomSheet`, `Button`, `CampoDeBusca`, `Chip`, `CommunityChip`, `CommunityCover`, `CommunityDoor`, `ConfirmSheet`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `FollowButton`, `HandleLink`, `HotTopicCard`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `MenuSuspenso`, `MidiaDaContribuicao`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `SectionTitle`, `Select`, `Skeleton`, `StarButton`, `SuccessMessage`, `Tabs`, `TextField`, `TopicCard`, `TopicName`, `TopicOpening`

### Aba de enquetes

- **retrato:** `retratos/comunidade-enquetes.png`
- **rota:** `/c/<slug>?aba=enquetes`
- **desenha em:** `app/(app)/c/[comunidade]/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Uma enquete esperando voto e uma com resultado (RN37).
- **componentes (44):** `AjusteDeImagem`, `AlcaDoPainel`, `AnswerCard`, `AppShell`, `Avatar`, `BottomSheet`, `Button`, `CampoDeBusca`, `Chip`, `CommunityChip`, `CommunityCover`, `CommunityDoor`, `ConfirmSheet`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `FollowButton`, `HandleLink`, `HotTopicCard`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `MenuSuspenso`, `MidiaDaContribuicao`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `SectionTitle`, `Select`, `Skeleton`, `StarButton`, `SuccessMessage`, `Tabs`, `TextField`, `TopicCard`, `TopicName`, `TopicOpening`

### Aba de eventos

- **retrato:** `retratos/comunidade-eventos.png`
- **rota:** `/c/<slug>?aba=eventos`
- **desenha em:** `app/(app)/c/[comunidade]/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Um evento futuro com presença confirmada.
- **componentes (44):** `AjusteDeImagem`, `AlcaDoPainel`, `AnswerCard`, `AppShell`, `Avatar`, `BottomSheet`, `Button`, `CampoDeBusca`, `Chip`, `CommunityChip`, `CommunityCover`, `CommunityDoor`, `ConfirmSheet`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `FollowButton`, `HandleLink`, `HotTopicCard`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `MenuSuspenso`, `MidiaDaContribuicao`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `SectionTitle`, `Select`, `Skeleton`, `StarButton`, `SuccessMessage`, `Tabs`, `TextField`, `TopicCard`, `TopicName`, `TopicOpening`

### Aba de membros

- **retrato:** `retratos/comunidade-membros.png`
- **rota:** `/c/<slug>?aba=membros`
- **desenha em:** `app/(app)/c/[comunidade]/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Lista com moderadora e membros, com o filtro de papel.
- **componentes (44):** `AjusteDeImagem`, `AlcaDoPainel`, `AnswerCard`, `AppShell`, `Avatar`, `BottomSheet`, `Button`, `CampoDeBusca`, `Chip`, `CommunityChip`, `CommunityCover`, `CommunityDoor`, `ConfirmSheet`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `FollowButton`, `HandleLink`, `HotTopicCard`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `MenuSuspenso`, `MidiaDaContribuicao`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `SectionTitle`, `Select`, `Skeleton`, `StarButton`, `SuccessMessage`, `Tabs`, `TextField`, `TopicCard`, `TopicName`, `TopicOpening`

### Janela de criar tópico

- **retrato:** `retratos/comunidade-janela-novo-topico.png`
- **rota:** `/c/<slug>?novo=1`
- **desenha em:** `app/(app)/c/[comunidade]/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Janela aberta sobre a comunidade. Desenhada por portal: no HTML congelado ela é o último filho do body, longe de onde o componente é escrito.
- **componentes (44):** `AjusteDeImagem`, `AlcaDoPainel`, `AnswerCard`, `AppShell`, `Avatar`, `BottomSheet`, `Button`, `CampoDeBusca`, `Chip`, `CommunityChip`, `CommunityCover`, `CommunityDoor`, `ConfirmSheet`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `FollowButton`, `HandleLink`, `HotTopicCard`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `MenuSuspenso`, `MidiaDaContribuicao`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `SectionTitle`, `Select`, `Skeleton`, `StarButton`, `SuccessMessage`, `Tabs`, `TextField`, `TopicCard`, `TopicName`, `TopicOpening`

## Tópico e convite

### Tópico aberto no painel

- **retrato:** `retratos/topico-no-painel.png`
- **rota:** `/c/<slug>?t=<topico>`
- **desenha em:** `app/(app)/c/[comunidade]/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Painel à direita com a abertura em cartão escuro, contribuições com imagem, GIF e estrelas. É a tela mais usada do Hub.
- **componentes (44):** `AjusteDeImagem`, `AlcaDoPainel`, `AnswerCard`, `AppShell`, `Avatar`, `BottomSheet`, `Button`, `CampoDeBusca`, `Chip`, `CommunityChip`, `CommunityCover`, `CommunityDoor`, `ConfirmSheet`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `FollowButton`, `HandleLink`, `HotTopicCard`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `MenuSuspenso`, `MidiaDaContribuicao`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `SectionTitle`, `Select`, `Skeleton`, `StarButton`, `SuccessMessage`, `Tabs`, `TextField`, `TopicCard`, `TopicName`, `TopicOpening`

### Convite: comunidade sem conta

- **retrato:** `retratos/convite-comunidade.png`
- **rota:** `/c/<slug>`
- **desenha em:** `app/(app)/c/[comunidade]/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Sem sessão. Capa, nome, membros e intro — sem barra de navegação.
- **componentes (44):** `AjusteDeImagem`, `AlcaDoPainel`, `AnswerCard`, `AppShell`, `Avatar`, `BottomSheet`, `Button`, `CampoDeBusca`, `Chip`, `CommunityChip`, `CommunityCover`, `CommunityDoor`, `ConfirmSheet`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `FollowButton`, `HandleLink`, `HotTopicCard`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `MenuSuspenso`, `MidiaDaContribuicao`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `SectionTitle`, `Select`, `Skeleton`, `StarButton`, `SuccessMessage`, `Tabs`, `TextField`, `TopicCard`, `TopicName`, `TopicOpening`

### Convite: tópico sem conta

- **retrato:** `retratos/convite-topico.png`
- **rota:** `/c/<slug>/<topico>`
- **desenha em:** `app/(app)/c/[comunidade]/[topico]/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Sem sessão. A pergunta aparece; **o texto das respostas nunca** (RN16).
- **componentes (27):** `AjusteDeImagem`, `AppShell`, `BottomSheet`, `Button`, `CampoDeBusca`, `CommunityCover`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `Select`, `Skeleton`, `SuccessMessage`, `TextField`, `TopicName`

## Perfil e blog

### Meu perfil, aba Blog

- **retrato:** `retratos/perfil-dono-blog.png`
- **rota:** `/perfil`
- **desenha em:** `app/(app)/perfil/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Dono: com status, posts, Coleção no menu e contador de seguindo (RN27).
- **componentes (37):** `AjusteDeImagem`, `AlcaDoPainel`, `AppShell`, `Avatar`, `BottomSheet`, `Button`, `CampoDeBusca`, `CommunityCover`, `ConfirmSheet`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `FollowButton`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `MenuSuspenso`, `NavRail`, `PageTitle`, `PaginaCarregando`, `PerfilLinks`, `PostRow`, `ProfileHeader`, `Rotulo`, `RoundIconButton`, `SectionTitle`, `Select`, `Skeleton`, `SuccessMessage`, `Tabs`, `TextField`, `TopicName`

### Post aberto no painel

- **retrato:** `retratos/perfil-post-no-painel.png`
- **rota:** `/perfil?post=<post>`
- **desenha em:** `app/(app)/perfil/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Painel irmão do painel do tópico, com cookie de largura próprio.
- **componentes (37):** `AjusteDeImagem`, `AlcaDoPainel`, `AppShell`, `Avatar`, `BottomSheet`, `Button`, `CampoDeBusca`, `CommunityCover`, `ConfirmSheet`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `FollowButton`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `MenuSuspenso`, `NavRail`, `PageTitle`, `PaginaCarregando`, `PerfilLinks`, `PostRow`, `ProfileHeader`, `Rotulo`, `RoundIconButton`, `SectionTitle`, `Select`, `Skeleton`, `SuccessMessage`, `Tabs`, `TextField`, `TopicName`

### Perfil de outra pessoa

- **retrato:** `retratos/perfil-visitante.png`
- **rota:** `/<handle>`
- **desenha em:** `app/(app)/[handle]/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Visitante: seguir, Cabine e menu de denunciar. Sem Coleção.
- **componentes (37):** `AjusteDeImagem`, `AlcaDoPainel`, `AppShell`, `Avatar`, `BottomSheet`, `Button`, `CampoDeBusca`, `CommunityCover`, `ConfirmSheet`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `FollowButton`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `MenuSuspenso`, `NavRail`, `PageTitle`, `PaginaCarregando`, `PerfilLinks`, `PostRow`, `ProfileHeader`, `Rotulo`, `RoundIconButton`, `SectionTitle`, `Select`, `Skeleton`, `SuccessMessage`, `Tabs`, `TextField`, `TopicName`

### Editar perfil

- **retrato:** `retratos/perfil-editar.png`
- **rota:** `/perfil/editar`
- **desenha em:** `app/(app)/perfil/editar/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Formulário preenchido, com as 8 cores de fundo.
- **componentes (29):** `AjusteDeImagem`, `AppShell`, `Avatar`, `BottomSheet`, `Button`, `CampoDeBusca`, `CommunityCover`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `SectionTitle`, `Select`, `Skeleton`, `SuccessMessage`, `Switch`, `TextField`

### Seguindo e seguidores

- **retrato:** `retratos/perfil-seguindo.png`
- **rota:** `/perfil/seguindo`
- **desenha em:** `app/(app)/perfil/seguindo/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Com pessoas nas duas abas.
- **componentes (31):** `AjusteDeImagem`, `AppShell`, `Avatar`, `BottomSheet`, `Button`, `CampoDeBusca`, `CommunityCover`, `ConfirmSheet`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `FollowButton`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `MenuSuspenso`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `Select`, `Skeleton`, `SuccessMessage`, `Tabs`, `TextField`

## Cabine

### Cabines sem nenhuma conversa

- **retrato:** `retratos/cabines-vazia.png`
- **rota:** `/cabines`
- **desenha em:** `app/(app)/cabines/(lista)/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Conta nova. Lista vazia e o painel direito em 'Escolha uma conversa'.
- **componentes (27):** `AjusteDeImagem`, `AppShell`, `Avatar`, `BottomSheet`, `Button`, `CampoDeBusca`, `CommunityCover`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `Select`, `Skeleton`, `SuccessMessage`, `TextField`

### Cabine em conversa

- **retrato:** `retratos/cabine-conversa.png`
- **rota:** `/cabines/<id>`
- **desenha em:** `app/(app)/cabines/[cabine]/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Seis mensagens dos dois lados, balões em lavanda e em paper.
- **componentes (29):** `AjusteDeImagem`, `AppShell`, `Avatar`, `BottomSheet`, `Button`, `CampoDeBusca`, `CommunityCover`, `ConfirmSheet`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `MenuSuspenso`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `Select`, `Skeleton`, `SuccessMessage`, `TextField`

### Convidar para a Cabine

- **retrato:** `retratos/cabine-nova.png`
- **rota:** `/cabines/nova`
- **desenha em:** `app/(app)/cabines/nova/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Pessoa escolhida e mensagem do convite escrita.
- **componentes (27):** `AjusteDeImagem`, `AppShell`, `BottomSheet`, `Button`, `CampoDeBusca`, `Chip`, `CommunityCover`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `Select`, `Skeleton`, `SuccessMessage`, `TextField`

## Moderação

### Denunciar

- **retrato:** `retratos/denuncia.png`
- **rota:** `/denuncia?resposta=<id>`
- **desenha em:** `app/(app)/denuncia/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Com o trecho denunciado em contexto e os motivos.
- **componentes (27):** `AjusteDeImagem`, `AppShell`, `BottomSheet`, `Button`, `CampoDeBusca`, `CommunityCover`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `NavRail`, `PageTitle`, `PaginaCarregando`, `RadioGroup`, `Rotulo`, `RoundIconButton`, `Select`, `Skeleton`, `SuccessMessage`, `TextField`

### Moderar: fila de denúncias

- **retrato:** `retratos/moderar-denuncias.png`
- **rota:** `/c/<slug>/moderar`
- **desenha em:** `app/(app)/c/[comunidade]/moderar/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Uma denúncia pendente. Quem não modera recebe 404, não 403.
- **componentes (29):** `AjusteDeImagem`, `AppShell`, `BottomSheet`, `Button`, `CampoDeBusca`, `CommunityCover`, `ConfirmSheet`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `HandleLink`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `Select`, `Skeleton`, `SuccessMessage`, `Tabs`, `TextField`

### Moderar: membros

- **retrato:** `retratos/moderar-membros.png`
- **rota:** `/c/<slug>/moderar?aba=membros`
- **desenha em:** `app/(app)/c/[comunidade]/moderar/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Lista com busca e ações de moderação.
- **componentes (29):** `AjusteDeImagem`, `AppShell`, `BottomSheet`, `Button`, `CampoDeBusca`, `CommunityCover`, `ConfirmSheet`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `HandleLink`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `Select`, `Skeleton`, `SuccessMessage`, `Tabs`, `TextField`

## Sistema

### Notificações sem nada

- **retrato:** `retratos/notificacoes-vazia.png`
- **rota:** `/notificacoes`
- **desenha em:** `app/(app)/notificacoes/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Conta nova. O vazio de 'Nada por aqui'.
- **componentes (28):** `AjusteDeImagem`, `AppShell`, `Avatar`, `BottomSheet`, `Button`, `CampoDeBusca`, `CommunityCover`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `SectionTitle`, `Select`, `Skeleton`, `SuccessMessage`, `TextField`

### Notificações com avisos

- **retrato:** `retratos/notificacoes-cheia.png`
- **rota:** `/notificacoes`
- **desenha em:** `app/(app)/notificacoes/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** 'Só para te avisar' em lavanda e 'Essa semana' abaixo (RN34).
- **componentes (28):** `AjusteDeImagem`, `AppShell`, `Avatar`, `BottomSheet`, `Button`, `CampoDeBusca`, `CommunityCover`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `SectionTitle`, `Select`, `Skeleton`, `SuccessMessage`, `TextField`

### Configurações

- **retrato:** `retratos/configuracoes.png`
- **rota:** `/configuracoes`
- **desenha em:** `app/(app)/configuracoes/page.tsx`
- **layouts:** `app/(app)/layout.tsx` → `app/layout.tsx`
- **estado:** Privacidade (RN23), notificações (RN34) e o aviso da F17.
- **componentes (29):** `AjusteDeImagem`, `AppShell`, `BottomSheet`, `Button`, `CampoDeBusca`, `CommunityCover`, `ContentColumn`, `ControleDeslizante`, `Eixo`, `EmptyState`, `EndOfList`, `ErrorState`, `EscolherGif`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `NavRail`, `PageTitle`, `PaginaCarregando`, `Rotulo`, `RoundIconButton`, `SectionTitle`, `Select`, `Skeleton`, `SuccessMessage`, `Switch`, `SwitchRow`, `TextField`

### A galeria do design system

- **retrato:** `retratos/design-galeria.png`
- **rota:** `/design`
- **desenha em:** `app/design/page.tsx`
- **layouts:** `app/layout.tsx`
- **estado:** Estados do sistema, paleta, tipografia e os componentes. Fora de todos os grupos de layout.
- **componentes (55):** `ActivityRow`, `AjusteDeImagem`, `AlcaDoPainel`, `AnswerCard`, `Avatar`, `BottomSheet`, `Button`, `CampoDeBusca`, `Checkbox`, `Chip`, `CodeInput`, `CommunityChip`, `CommunityCover`, `CommunityDoor`, `CommunityRow`, `ConfirmSheet`, `ControleDeslizante`, `EmptyState`, `EndOfList`, `ErrorState`, `FollowButton`, `HandleLink`, `HomeRow`, `HotTopicCard`, `Input`, `Janela`, `LevelMark`, `LoadingBlock`, `MenuSuspenso`, `MidiaDaContribuicao`, `PaginaCarregando`, `Paginador`, `PasswordInput`, `PerfilLinks`, `PinButton`, `PostRow`, `ProfileHeader`, `RadioGroup`, `RoundIconButton`, `SectionTitle`, `Segmented`, `Select`, `Skeleton`, `StarButton`, `Steps`, `SuccessMessage`, `SuggestionRow`, `Switch`, `SwitchRow`, `Tabs`, `TextField`, `TopicCard`, `TopicName`, `TopicOpening`, `TopicRow`

## Componente → telas

Para mexer num componente, estas são as telas em que conferir. É o índice que transforma um pedido de redesenho numa lista de arquivos.

| Componente | Arquivo | Telas |
| --- | --- | --- |
| `ActivityRow` | `design/components/home-rows.tsx` | 3: inicio-vazio, inicio-cheio, design-galeria |
| `AjusteDeImagem` | `design/components/ajuste-de-imagem.tsx` | 30: inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes, design-galeria |
| `AlcaDoPainel` | `design/components/alca-do-painel.tsx` | 12: comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, design-galeria |
| `AnswerCard` | `design/components/answer-card.tsx` | 9: comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, design-galeria |
| `AppShell` | `design/components/app-shell.tsx` | 29: inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes |
| `Avatar` | `design/components/avatar.tsx` | 20: inicio-vazio, inicio-cheio, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, notificacoes-vazia, notificacoes-cheia, design-galeria |
| `BottomSheet` | `design/components/bottom-sheet.tsx` | 30: inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes, design-galeria |
| `Button` | `design/components/button.tsx` | 38: entrar, criar-conta, criar-conta-preenchida, senha, senha-codigo, boas-vindas-primeiro-card, boas-vindas-comunidades, boas-vindas-notificacoes, inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes, design-galeria |
| `CampoDeBusca` | `design/components/campo-de-busca.tsx` | 30: inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes, design-galeria |
| `Checkbox` | `design/components/checkbox.tsx` | 3: criar-conta, criar-conta-preenchida, design-galeria |
| `Chip` | `design/components/chip.tsx` | 12: boas-vindas-primeiro-card, boas-vindas-comunidades, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, cabine-nova, design-galeria |
| `CodeInput` | `design/components/code-input.tsx` | 3: senha, senha-codigo, design-galeria |
| `CommunityChip` | `design/components/community-chip.tsx` | 9: comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, design-galeria |
| `CommunityCover` | `design/components/community-cover.tsx` | 30: inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes, design-galeria |
| `CommunityDoor` | `design/components/community-door.tsx` | 13: inicio-vazio, inicio-cheio, explorar, busca, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, design-galeria |
| `CommunityRow` | `design/components/community-row.tsx` | 1: design-galeria |
| `ConfirmSheet` | `design/components/confirm-sheet.tsx` | 16: comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-seguindo, cabine-conversa, moderar-denuncias, moderar-membros, design-galeria |
| `ContentColumn` | `design/components/app-shell.tsx` | 29: inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes |
| `ControleDeslizante` | `design/components/controle-deslizante.tsx` | 30: inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes, design-galeria |
| `Eixo` | `design/components/nav-rail.tsx` | 29: inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes |
| `EmptyState` | `design/components/states.tsx` | 32: senha, senha-codigo, inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes, design-galeria |
| `EndOfList` | `design/components/states.tsx` | 32: senha, senha-codigo, inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes, design-galeria |
| `ErrorState` | `design/components/states.tsx` | 32: senha, senha-codigo, inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes, design-galeria |
| `EscolherGif` | `design/components/escolher-gif.tsx` | 29: inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes |
| `FollowButton` | `design/components/follow-button.tsx` | 17: inicio-vazio, inicio-cheio, explorar, busca, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-seguindo, design-galeria |
| `HandleLink` | `design/components/handle-link.tsx` | 11: comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, moderar-denuncias, moderar-membros, design-galeria |
| `HomeRow` | `design/components/home-rows.tsx` | 3: inicio-vazio, inicio-cheio, design-galeria |
| `HotTopicCard` | `design/components/hot-topic-card.tsx` | 11: inicio-vazio, inicio-cheio, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, design-galeria |
| `Input` | `design/components/input.tsx` | 35: entrar, criar-conta, criar-conta-preenchida, senha, senha-codigo, inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes, design-galeria |
| `Janela` | `design/components/janela.tsx` | 30: inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes, design-galeria |
| `LevelMark` | `design/components/level-mark.tsx` | 33: abertura, boas-vindas-primeiro-card, boas-vindas-comunidades, inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes, design-galeria |
| `LoadingBlock` | `design/components/states.tsx` | 32: senha, senha-codigo, inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes, design-galeria |
| `MenuSuspenso` | `design/components/menu-suspenso.tsx` | 14: comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-seguindo, cabine-conversa, design-galeria |
| `MidiaDaContribuicao` | `design/components/midia-da-contribuicao.tsx` | 9: comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, design-galeria |
| `NavRail` | `design/components/nav-rail.tsx` | 29: inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes |
| `PageTitle` | `design/components/app-shell.tsx` | 29: inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes |
| `PaginaCarregando` | `design/components/states.tsx` | 32: senha, senha-codigo, inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes, design-galeria |
| `Paginador` | `design/components/paginador.tsx` | 3: boas-vindas-primeiro-card, boas-vindas-comunidades, design-galeria |
| `PasswordInput` | `design/components/password-input.tsx` | 6: entrar, criar-conta, criar-conta-preenchida, senha, senha-codigo, design-galeria |
| `PerfilLinks` | `design/components/profile-header.tsx` | 4: perfil-dono-blog, perfil-post-no-painel, perfil-visitante, design-galeria |
| `PinButton` | `design/components/pin-button.tsx` | 2: minhas-comunidades, design-galeria |
| `PostRow` | `design/components/post-row.tsx` | 4: perfil-dono-blog, perfil-post-no-painel, perfil-visitante, design-galeria |
| `ProfileHeader` | `design/components/profile-header.tsx` | 4: perfil-dono-blog, perfil-post-no-painel, perfil-visitante, design-galeria |
| `RadioGroup` | `design/components/radio-group.tsx` | 2: denuncia, design-galeria |
| `Rotulo` | `design/components/nav-rail.tsx` | 29: inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes |
| `RoundIconButton` | `design/components/community-cover.tsx` | 30: inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes, design-galeria |
| `SectionTitle` | `design/components/section-title.tsx` | 21: inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, notificacoes-vazia, notificacoes-cheia, configuracoes, design-galeria |
| `Segmented` | `design/components/segmented.tsx` | 3: explorar, busca, design-galeria |
| `Select` | `design/components/select.tsx` | 30: inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes, design-galeria |
| `Skeleton` | `design/components/states.tsx` | 32: senha, senha-codigo, inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes, design-galeria |
| `StarButton` | `design/components/star-button.tsx` | 9: comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, design-galeria |
| `Steps` | `design/components/steps.tsx` | 3: criar-conta, criar-conta-preenchida, design-galeria |
| `SuccessMessage` | `design/components/states.tsx` | 32: senha, senha-codigo, inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes, design-galeria |
| `SuggestionRow` | `design/components/home-rows.tsx` | 3: inicio-vazio, inicio-cheio, design-galeria |
| `Switch` | `design/components/switch.tsx` | 3: perfil-editar, configuracoes, design-galeria |
| `SwitchRow` | `design/components/switch-row.tsx` | 2: configuracoes, design-galeria |
| `Tabs` | `design/components/tabs.tsx` | 15: comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-seguindo, moderar-denuncias, moderar-membros, design-galeria |
| `TextField` | `design/components/text-field.tsx` | 30: inicio-vazio, inicio-cheio, explorar, busca, minhas-comunidades, comunidade-nova, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, perfil-editar, perfil-seguindo, cabines-vazia, cabine-conversa, cabine-nova, denuncia, moderar-denuncias, moderar-membros, notificacoes-vazia, notificacoes-cheia, configuracoes, design-galeria |
| `TopicCard` | `design/components/topic-card.tsx` | 9: comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, design-galeria |
| `TopicName` | `design/components/topic-name.tsx` | 17: inicio-vazio, inicio-cheio, explorar, busca, comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, convite-topico, perfil-dono-blog, perfil-post-no-painel, perfil-visitante, design-galeria |
| `TopicOpening` | `design/components/topic-opening.tsx` | 9: comunidade-vazia, comunidade-cheia, comunidade-enquetes, comunidade-eventos, comunidade-membros, comunidade-janela-novo-topico, topico-no-painel, convite-comunidade, design-galeria |
| `TopicRow` | `design/components/topic-row.tsx` | 1: design-galeria |

## Telas fora da pasta, e por quê

- **`/completar-cadastro`** — Só é alcançável no retorno do OAuth do Google, que exige um cliente configurado no Google Cloud. Capturar um estado de erro e chamar de tela seria pior do que a ausência.
- **`/cabines/convite`** — O convite é aceito pela lista em /cabines, que é o caminho de quem usa. A rota direta existe para link, e o desenho é o mesmo cartão da lista.
- **`/criar-topico e /topico/[id] e /c/<slug>/novo`** — Redirecionam. Capturar um redirecionamento é capturar o destino com o nome errado.
