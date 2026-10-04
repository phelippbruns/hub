# Hub: Escopo do MVP

Oct 2, 2026 · @Phelipp Bruns

## Visão e tese

O Hub é uma rede social que transforma interesses em relações. Ele começa pelo interesse compartilhado, não pela pessoa nem pelo conteúdo que ela publica.

A cadeia que o produto sustenta é: Interesse → Comunidade → Tópico → Resposta → Afinidade → Conversa → Relação.

**Tese:** o problema não é a falta de conteúdo. É a falta de experiências sociais que transformem conteúdo em conexão.

**Resultado buscado:** participação, pertencimento, afinidade e relação. Tempo de consumo não é meta.

**Posicionamento:** o Hub não compete com Instagram ou TikTok em volume de conteúdo. Também não copia Reddit, Discord, Letterboxd ou Strava. A diferença é descobrir pessoas pelo que elas pensam e pela forma como participam, não pelo perfil.

**Frase da marca:** Conecte-se pelo que realmente importa.

Este documento substitui o escopo de 30 de setembro de 2026, que descrevia o modelo de pergunta do dia por canal.

## Problema

As redes atuais conectam pessoas a conteúdo com eficiência, mas isso não gera, por si só, conexão social significativa. As pesquisas analisadas apontam:

- Pessoas buscam conexão com quem tem interesses semelhantes.
- Existe demanda por conexões mais genuínas.
- Comunidades são percebidas como espaços de conversa mais significativa e respeitosa.
- Pertencimento depende de participar, influenciar e compartilhar experiências, não só de estar presente.
- Redes baseadas em exposição e performance estimulam comparação e comportamento performático.
- O excesso de feed gera consumo sem produzir relações.

As pesquisas citadas estão no documento de conceito HUB v2 e ainda não têm referência formal neste escopo.

## Estrutura

O conteúdo se organiza em quatro níveis, e a Cabine fica fora da hierarquia como espaço privado. Universo organiza. Comunidade conecta. Tópico provoca. Resposta participa. Cabine aproxima.

| Nível | Ícone | Cor | Quem cria | Exemplo |
| --- | --- | --- | --- | --- |
| Universo | { | Amarelo (sun) | Plataforma | Música |
| Comunidade | # | Roxo (lavender) | Qualquer usuário, dentro de um Universo | Música Eletrônica |
| Tópico | \* | Preto (ink) | Qualquer membro da comunidade | primeira festa |
| Resposta | sem ícone | Branco (paper) | Qualquer membro | Um set de 6 horas num galpão |
| Cabine | ícone de conversa | sem cor fixa | Quem convida, com aceite | Lia e Jo |

Os ícones aparecem ao lado do nome, nunca dentro dele: "Música Eletrônica", não "#música eletrônica". A cor de cada nível é fixa em toda a rede.

## Glossário

| Termo | Definição |
| --- | --- |
| Universo | Grande área de interesse que organiza comunidades. Criado e moderado pela plataforma. |
| Comunidade | Unidade social principal. Espaço que o usuário segue e onde participa. |
| Tópico | Discussão proposta por um membro dentro de uma comunidade, com nome e descrição. |
| Resposta | Participação de uma pessoa em um tópico. É o conteúdo principal do Hub. |
| Ciclo | Período que vira às 00h. Define qual tópico é o Hot Topic do dia seguinte. |
| Hot Topic | Tópico com mais pessoas diferentes respondendo no ciclo anterior. Fica no topo da comunidade durante o dia. |
| Tópico ativo | Tópico com ao menos uma resposta nas últimas 24 horas. |
| Seguir | Acompanhar uma comunidade, um tópico ou uma pessoa. Seguir um tópico, pelo ícone de olho, salva o tópico na Coleção do perfil e mostra as novidades dele no Início. |
| Cabine | Conversa privada entre 2 e 5 pessoas, iniciada por convite aceito. |
| Convite | Pedido para entrar em uma Cabine. Fica aberto até ser aceito ou recusado. |
| Dias ativos | Dias com ao menos uma resposta ou um tópico criado. |
| Moderador | Membro com poder de remover conteúdo e banir membros de uma comunidade. |
| Minhas comunidades | Lista das comunidades que o usuário segue. |

## Princípios de produto

1. **Comunidades são o centro.** Tudo parte de uma comunidade. O conteúdo de pessoas não define o Início.
2. **Participação, não popularidade.** Sem curtidas e sem contador por resposta. O número de seguidores aparece no perfil; o número de pessoas seguidas, só para o dono. Os contadores do perfil medem participação.
3. **A lista termina.** Não há feed infinito. O Início acaba em "Você está em dia".
4. **Interesses vêm antes de pessoas.** Usuários seguem comunidades, tópicos e pessoas, mas o Início é organizado pelas comunidades.
5. **Identidade real.** Todo conteúdo mostra o nome real do autor. A foto é opcional.
6. **Sem links.** Nenhum texto do Hub aceita links, inclusive endereços digitados.
7. **A comunidade influencia o destaque.** O Hot Topic sai da participação dos membros, não de um algoritmo.
8. **Menos, porém melhor.** Cada tela precisa justificar sua existência no MVP.

## Ritual e ciclo do Hot Topic

O motivo para voltar é o ciclo diário: todo dia às 00h, cada comunidade ganha um novo Hot Topic escolhido pela participação dos membros.

**Ritual**

1. A pessoa entra em uma comunidade e passa a acompanhá-la.
2. Membros criam tópicos sobre o que querem discutir.
3. As pessoas respondem aos tópicos ao longo do dia.
4. Às 00h, o tópico com mais pessoas diferentes respondendo vira o Hot Topic do dia seguinte.
5. O Hot Topic fica no topo da comunidade. Os demais tópicos ficam abaixo, por número de respostas por padrão ou em ordem cronológica.
6. As respostas revelam perspectivas e afinidades.
7. Uma resposta desperta interesse, e alguém visita o perfil de quem respondeu.
8. Uma pessoa convida outra, ou mais pessoas, para uma Cabine.
9. O ciclo se renova, e outro tópico pode assumir o destaque.

**Regras do ciclo**

- Conta pessoas diferentes, não respostas. Uma pessoa pode responder várias vezes, mas vale uma vez.
- O ciclo vira às 00h para todos, não em 24 horas corridas.
- O Hot Topic não pode vencer o ciclo seguinte.
- Cada pessoa cria no máximo 1 tópico por dia em cada comunidade.

## Escopo funcional

O MVP cobre sete etapas da jornada, da entrada à segurança. Celular e web têm as mesmas funções; a web usa navegação lateral e um painel de contexto à direita. O MVP é uma aplicação web responsiva instalável (PWA), feita com Next.js, Prisma e Supabase. A construção começa pela versão de computador; a versão de celular, no mesmo código, vem depois que os fluxos forem validados na web.

### Entrada

1. Tela inicial com a frase da marca, Criar conta, Entrar e link para Termos e privacidade. Link compartilhado abre uma página de convite: comunidade, membros e tópico visíveis, respostas bloqueadas até o cadastro.
2. Login com email e senha, com Google como opção abaixo. Recuperação de senha por código enviado ao email.
3. Cadastro com nome, email, verificação de idade sem autodeclaração e aceite dos Termos de uso e da Política de privacidade.
4. Onboarding com explicação do funcionamento em três passos, escolha de ao menos 3 comunidades e pedido de permissão de notificações. Quem chega por convite já tem a comunidade do convite marcada e volta ao tópico ao terminar.

### Início

1. Hot Topics das comunidades seguidas; só o primeiro aparece como cartão.
2. Pessoas que você segue: até 3 interações recentes delas em tópicos e comunidades, com acesso à lista completa. Depois, suas últimas interações, com o número de respostas que chegaram depois da sua.
3. Tópicos que você segue, com respostas novas e link para a Coleção.
4. Marca de fim "Você está em dia".
5. Estado vazio com comunidades sugeridas. Tocar em uma abre a página dela, onde a pessoa entra.

### Descoberta

1. Explorar, item próprio da navegação, com busca única e filtros Tudo, Comunidades, Tópicos e Pessoas. Cada comunidade da lista tem a marca # para entrar direto. A busca tem tela de resultado com comunidades e pessoas.
2. Navegação por Universos. A página do Universo tem busca por nome e ordem por atividade ou por mais recentes.
3. Página da comunidade: foto de capa no topo com o nome; abaixo, a marca # funciona como botão para entrar ou sair, ao lado do número de membros, descrição, Hot Topic e lista de tópicos. Sair pede confirmação. Se quem sai modera, a moderação passa para o membro mais ativo. A capa tem botão de compartilhar. Uma lupa ao lado da ordenação abre a busca de tópicos dentro da comunidade.
4. Menu da comunidade com moderadores, denunciar e moderar. Não há ajuste de notificações por comunidade no MVP.

### Participação

1. Página do tópico: descrição em destaque, separada das respostas, pessoas e respostas, ícone de olho para seguir e salvar o tópico, e botão de compartilhar.
2. Responder com até 240 caracteres, GIF ou 1 imagem. O autor pode apagar a própria resposta; não há edição.
3. Criar tópico com nome, descrição, GIF ou 1 imagem. O autor pode apagar o tópico enquanto ele tiver menos de 5 respostas de outras pessoas.

### Afinidade e Cabine

1. Perfil de outra pessoa com @, número de seguidores, descrição, contadores, ícone de olho para seguir e botão Cabine lado a lado, ocupando a linha inteira, e abas Respostas e Comunidades, nessa ordem. Tópicos criados aparecem na aba Respostas, marcados como tópico. A aba Comunidades lista as comunidades da pessoa e marca as que vocês têm em comum. Ao seguir, o olho fica sobre fundo lavanda, como no tópico. O menu de três pontos tem Denunciar perfil, Bloquear e Silenciar no Início.
2. Nova Cabine: mensagem do convite opcional, busca e sugestões com base nas suas comunidades, com até 4 pessoas.
3. Convite com a mensagem de quem convidou, as comunidades em comum, Aceitar, Recusar e Bloquear.
4. Lista de Cabines com convites e conversas.
5. Conversa com GIF ou 1 imagem por mensagem e menu com convidar, denunciar, bloquear e sair.

### Minha área

1. Perfil próprio, com menu de três pontos para Editar perfil e Configurações, @, seguidores, descrição, contadores e abas Respostas, Comunidades e Coleção. A Coleção reúne todos os tópicos seguidos, inclusive os parados, só o dono vê e pode ser organizada por Universo, por comunidade ou em ordem cronológica.
2. Minhas comunidades com miniatura da capa, membros e tópicos ativos de cada uma, busca por texto, ordem alfabética e comunidades fixadas no topo.
3. Criar comunidade com nome, intro, foto de capa enviada pela pessoa e Universo.
4. Central de notificações.
5. Configurações: conta, privacidade, ordem padrão, histórico de atividade, seus dados, notificações e excluir conta.

### Segurança

1. Denúncia com motivos fixos e bloqueio no mesmo fluxo. Lista de pessoas bloqueadas nas configurações.
2. Moderação da comunidade: denúncias; membros com busca e remover; moderadores com adicionar e remover.
3. Termos e privacidade com resumo em linguagem simples.

## Mapa de telas

O MVP tem 28 telas e uma página de estados do sistema, organizadas por feature. Todas existem em celular e web no protótipo hub-telas-final.html.

| Nº | Feature | Tela | Função |
| --- | --- | --- | --- |
| 1 | Entrada / Onboarding | Tela inicial | Marca, Criar conta, Entrar |
| 2 | Entrada / Onboarding | Convite por link | Comunidade, membros e tópico visíveis; respostas só após cadastro |
| 3 | Entrada / Onboarding | Login e cadastro | Email e senha, Google como opção; verificação de idade; aceite dos termos |
| 4 | Entrada / Onboarding | Esqueci a senha | Código por email e nova senha |
| 5 | Entrada / Onboarding | Onboarding | Como funciona, 3 comunidades, convite, notificações |
| 6 | Início / Feed | Início | Hot Topics, tópicos seguidos, pessoas que você segue, últimas interações |
| 7 | Início / Feed | Início vazio | Leva a entrar em comunidades |
| 8 | Início / Feed | Central de notificações | Avisos do Hub |
| 9 | Descoberta / Explorar | Explorar comunidades | Busca, filtros e Universos |
| 10 | Descoberta / Explorar | Resultado da busca | Comunidades e pessoas |
| 11 | Descoberta / Explorar | Página do Universo | Comunidades de um Universo, busca e ordem |
| 12 | Comunidades / Tópicos / Respostas | Minhas comunidades | Membros e tópicos ativos |
| 13 | Comunidades / Tópicos / Respostas | Criar comunidade | Nome, intro, foto de capa, Universo |
| 14 | Comunidades / Tópicos / Respostas | Página da comunidade | Capa, entrar e sair, Hot Topic, tópicos, busca, compartilhar |
| 15 | Comunidades / Tópicos / Respostas | Tópico | Descrição, respostas com foto ou GIF, apagar |
| 16 | Comunidades / Tópicos / Respostas | Criar tópico | Nome, descrição, mídia |
| 17 | Cabine | Lista de Cabines | Convites e conversas |
| 18 | Cabine | Nova Cabine | Selecionar pessoas |
| 19 | Cabine | Convite para Cabine | Aceitar ou recusar |
| 20 | Cabine | Cabine | Conversa privada e itens compartilhados |
| 21 | Perfis | Perfil próprio | Respostas, Comunidades, Coleção |
| 22 | Perfis | Editar perfil | Foto, nome, @, descrição |
| 23 | Perfis | Pessoas que você segue | Lista privada, deixar de seguir |
| 24 | Perfis | Perfil de outra pessoa | Seguir, Cabine, Respostas, Comunidades |
| 25 | Perfis | Configurações | Conta, privacidade, dados, pessoas bloqueadas, excluir conta |
| 26 | Segurança | Denúncia e bloqueio | Motivos e bloqueio |
| 27 | Segurança | Moderação da comunidade | Denúncias, membros, moderadores |
| 28 | Segurança | Termos e privacidade | Resumo e texto legal |
| 29 | Sistema | Estados do sistema | Ícones, carregando, erro, vazios, fim de lista e outros |

## Regras de negócio

São 34 regras. Elas substituem integralmente as RN01 a RN23 do escopo anterior.

| Código | Regra | Área |
| --- | --- | --- |
| RN01 | A hierarquia é Universo, comunidade, tópico e resposta. Os ícones {, # e \* ficam ao lado do nome, nunca dentro dele. | Estrutura |
| RN02 | Universos são criados e moderados somente pela plataforma. | Estrutura |
| RN03 | Toda comunidade exige nome, intro de até 240 caracteres, capa e Universo. Sem capa enviada, usa a capa padrão do Universo. | Comunidades |
| RN04 | Não podem existir duas comunidades com o mesmo nome. A comparação ignora maiúsculas, acentos, espaços e plural simples. A checagem roda no envio. | Comunidades |
| RN05 | A comunidade fica disponível em Explorar ao atingir 20 membros. Antes disso, só aparece na busca. | Comunidades |
| RN06 | Quem cria a comunidade é moderador e pode nomear outros. Quando um moderador sai, a moderação passa automaticamente para o membro mais ativo da comunidade. | Moderação |
| RN07 | Qualquer membro cria tópicos, com limite de 1 por pessoa por dia em cada comunidade. | Tópicos |
| RN08 | Todo tópico tem nome e descrição de até 240 caracteres, com GIF ou 1 imagem opcional. O autor pode apagar o tópico enquanto ele tiver menos de 5 respostas de outras pessoas, sem contar as do próprio autor; elas também são apagadas, com aviso antes. A partir de 5 respostas, o tópico não pode mais ser apagado pelo autor, só pela moderação. O limite pode mudar conforme a escala. | Tópicos |
| RN09 | O ciclo vira às 00h. O Hot Topic do dia é o tópico com mais pessoas diferentes respondendo no ciclo anterior. | Ciclo |
| RN10 | O Hot Topic de um ciclo não pode vencer o ciclo seguinte. | Ciclo |
| RN11 | Tópico ativo é o tópico com ao menos uma resposta nas últimas 24 horas. | Ciclo |
| RN12 | Os demais tópicos aparecem por número de respostas por padrão. O usuário pode trocar para ordem cronológica. | Tópicos |
| RN13 | A resposta tem até 240 caracteres, com GIF ou 1 imagem. Não existem respostas dentro de respostas. | Respostas |
| RN14 | A resposta não pode ser editada. Para corrigir, o autor apaga e responde de novo. O autor pode apagar a própria resposta a qualquer momento. | Respostas |
| RN15 | Não há curtidas nem contador por resposta. Todo tópico mostra o número de pessoas e de respostas. | Respostas |
| RN16 | Links são bloqueados em todo texto, inclusive endereços digitados por extenso. Compartilhar comunidades e tópicos é permitido: o botão de compartilhar envia para uma Cabine ou gera um link que abre o Hub. Quem abre o link sem conta vê a comunidade, os membros e o tópico; as respostas só aparecem depois do cadastro. | Todas |
| RN17 | Todo conteúdo exibe nome real, @ e foto do autor, ou avatar padrão quando não há foto, com acesso ao perfil. O @ é único na plataforma. | Todas |
| RN18 | Usuários seguem comunidades, tópicos e pessoas. Seguir um tópico usa o ícone de olho e salva o tópico na Coleção, aba privada do perfil próprio, que pode ser organizada por Universo, por comunidade ou em ordem cronológica. Seguir é sempre manual: responder não segue o tópico, e tópicos respondidos e não seguidos ficam só na aba Respostas. | Seguir |
| RN19 | O Início mostra Hot Topics das comunidades seguidas, até 3 interações recentes de pessoas que você segue, suas últimas interações e tópicos seguidos, e termina em "Você está em dia". | Início |
| RN20 | A Cabine é uma conversa privada de 2 a 5 pessoas e só começa quando o convidado aceita. | Cabine |
| RN21 | Só é possível convidar quem divide ao menos uma comunidade com você. O limite é de 10 convites por dia, contando os pendentes. | Cabine |
| RN22 | O convite pode levar uma mensagem de até 240 caracteres, sem links, que aparece para quem recebe. O convite fica aberto até ser aceito ou recusado. A recusa é silenciosa. Quem convidou pode cancelar. | Cabine |
| RN23 | Cada pessoa define quem pode convidá-la: membros das suas comunidades ou ninguém. | Cabine |
| RN24 | Qualquer participante pode sair da Cabine. Com uma pessoa restante, a Cabine se encerra. Quem sai volta só por novo convite. | Cabine |
| RN25 | Cada mensagem de Cabine aceita GIF ou 1 imagem, além de comunidades e tópicos compartilhados. | Cabine |
| RN26 | Bloquear alguém tira você das Cabines em comum, sem aviso, e impede novos convites. A lista de pessoas bloqueadas fica nas configurações, com opção de desbloquear. | Segurança |
| RN27 | O perfil mostra foto, nome, @, número de seguidores, descrição de até 120 caracteres sem links, contadores e as abas Respostas e Comunidades, com as comunidades em comum marcadas. No perfil próprio há também a aba Coleção, privada. O número de pessoas seguidas aparece só no perfil próprio, ao lado dos seguidores, e abre a lista. A lista também abre por Ver todas, no Início. Cada resposta no perfil mostra o tópico e a pergunta. | Perfil |
| RN28 | Os contadores do perfil são respostas, comunidades e dias ativos. Dia ativo é o dia com ao menos uma resposta ou tópico. O número de seguidores é só informativo e não abre lista, para evitar comparação entre perfis. | Perfil |
| RN29 | A idade mínima é de 16 anos, com verificação sem autodeclaração. Login com Google não substitui a verificação. O cadastro exige concordar com os Termos de uso e a Política de privacidade. | Conta |
| RN30 | A foto de perfil é opcional. Sem foto, o Hub mostra um avatar padrão. O Google pode preencher nome e foto. | Conta |
| RN31 | O onboarding exige ao menos 3 comunidades. Quem chega por convite já tem a comunidade do convite selecionada e volta ao tópico ao terminar. O onboarding termina pedindo permissão de notificações. | Conta |
| RN32 | O usuário pode baixar uma cópia dos seus dados e excluir a conta pelas configurações. Ao excluir, escolhe entre manter respostas e tópicos como "Conta excluída" ou apagar tudo. Cabines, perfil e Coleção são apagados nos dois casos. | Conta |
| RN33 | O moderador remove respostas e tópicos, remove membros (que podem voltar) e bane membros (que não podem voltar). Também adiciona moderadores entre os membros, por convite que precisa ser aceito, e remove moderadores, exceto quem criou a comunidade. Quem é removido da moderação continua membro e é avisado. Banir da plataforma é ação exclusiva do Hub. O autor recebe notificação com o motivo quando uma resposta ou tópico é removido. | Moderação |
| RN34 | Notificações ligadas por padrão: seu tópico virou Hot Topic, convites e mensagens de Cabine, aviso diário dos tópicos seguidos. Desligada por padrão: novos tópicos nas comunidades. | Notificações |

## Identidade visual e design system

A interface é calma e plana, com uma cor fixa por nível da hierarquia. As regras completas estão no [design system do Hub](https://claude.ai/artifact/U8p7QzxvuAHdnqY7sjwkXn).

| Token | Valor | Uso principal |
| --- | --- | --- |
| ink | #1E1A33 | Texto, botão primário, tópico, cartão de Hot Topic |
| inkMuted | #565170 | Texto secundário e metadados |
| paper | #FFFFFF | Cartões de resposta, campos |
| surfacePage | #F1EEFF | Fundo de página |
| lavender | #A69CFB | Comunidade, chip selecionado |
| sun | #FFD95E | Universo, botão Responder do Hot Topic |
| error | #B42318 | Erro e ações destrutivas |
| success | #146C43 | Confirmações |

- **Tipografia:** Bricolage Grotesque, uma família só, peso 800 nos títulos.
- **Forma:** botões em pílula, cantos de 12 e 18 px, sem sombra. No celular, a barra inferior mostra só ícones; na web, ícones com rótulo. A navegação tem Início (casa), Explorar (lupa), Comunidades (#, só as comunidades da pessoa), e Cabine usa um balão de conversa com reticências. O filtro "mais respostas" usa barras decrescentes. Tópicos usam um asterisco desenhado de cinco braços largos, na marca e nos nomes. O olho em contorno segue tópicos e pessoas; ativo, fica sobre fundo lavanda. Em listas, comunidades aparecem com miniatura da capa.
- **Componentes:** Botão, Chip, Marca de nível, Barra de navegação, Cartão de Hot Topic, Cartão de resposta.
- **Hot Topic:** o cartão não leva selo; o título de seção "Hot Topics" identifica o destaque.
- **Descrição do tópico:** fica em cartão escuro, sempre diferente das respostas.
- **Acessibilidade:** todo texto sobre cor usa ink, exceto sobre ink e error. Lavanda contra o fundo tem 2,1:1, então estado selecionado sempre leva ✓.

## Hipótese, objetivos e métricas

**Hipótese do MVP:** se as pessoas tiverem um contexto de interesse, uma comunidade, um tópico relevante, uma forma de influenciar o destaque e uma forma natural de descobrir pessoas pelas respostas, haverá participação recorrente, e parte dessas interações virará relação.

**Objetivo:** provar a sequência participação, pertencimento, afinidade e relação, sem usar tempo de tela como meta.

Os valores de corte de cada métrica precisam ser definidos antes do lançamento, para que o resultado não seja interpretado depois de visto.

| Métrica | O que mede | Como medir |
| --- | --- | --- |
| Participação | Quantas pessoas respondem | Pessoas com ao menos uma resposta sobre usuários ativos no dia |
| Ritual | Quantas voltam no ciclo seguinte | Pessoas que respondem em dois ciclos seguidos |
| Criação | Quantos criam tópicos que geram participação | Tópicos criados e tópicos com ao menos 5 pessoas respondendo |
| Concentração | Peso do Hot Topic na comunidade | Respostas no Hot Topic sobre respostas totais da comunidade no dia |
| Conversa | Respostas que geram interação | Respostas seguidas de outra resposta no mesmo tópico em até 1 hora |
| Afinidade | Interesse em continuar a interação | Acessos a perfis a partir de um tópico ou de uma resposta. O evento registra a origem. |
| Relação | Cabines nascidas de interações | Convites aceitos cuja origem é uma resposta |
| Permanência | Cabines que continuam | Cabines com mensagens 7 dias depois de criadas |
| Retenção | Participação contínua | Pessoas que participam no dia 7, no dia 30 e depois |
| Saúde | Polêmica no destaque | Denúncias em Hot Topics sobre denúncias nos demais tópicos |

As definições de "Conversa" e "Criação" (1 hora e 5 pessoas) são propostas e precisam de validação.

## Riscos e mitigações

O maior risco é o Hot Topic premiar polêmica, porque contradiz a tese de uma rede sem performance.

| Risco | Por que importa | Mitigação |
| --- | --- | --- |
| Hot Topic premia polêmica | Tópicos que provocam briga atraem mais respostas | Medir denúncias em Hot Topics desde o primeiro mês |
| Destaque se perpetua | O tópico no topo recebe mais respostas por estar no topo | RN10: não vence dois ciclos seguidos |
| Uma pessoa infla o tópico | Respostas repetidas da mesma pessoa | RN09: contar pessoas diferentes |
| Comunidades fantasmas | Criação livre espalha pouca gente em muitos lugares | RN05: 20 membros para Explorar e comunidades curadas no lançamento |
| Cabine como canal de assédio | Sem seguir mútuo, qualquer um poderia convidar | RN21 a RN23 e RN26 |
| Pouco sinal de afinidade | Sem curtidas, nenhuma ação explícita mostra interesse | Medir acessos ao perfil com origem registrada |
| Universo e Hot Topic dividem o amarelo | O destaque perde exclusividade de cor | Título de seção "Hot Topics" identifica o destaque |
| Moderação de imagens | GIF e imagem em todas as camadas custam mais que texto | Filtro automático e classificação restrita no GIPHY (confirmar opções da API) |
| Links digitados | Endereços escritos por extenso escapam do bloqueio | Detecção de padrões de endereço em todo texto |
| Idade e ECA Digital | A lei proíbe a autodeclaração de idade | RN29 e revisão jurídica |
| Comunidade sem respostas | Sem participação, não há Hot Topic | Mostrar os tópicos mais recentes no lugar |

**Risco novo:** o número público de seguidores reintroduz uma métrica de popularidade, o que tensiona o princípio 2. Mitigação proposta: medir se perfis com mais seguidores concentram acessos e convites de Cabine. As interações de pessoas seguidas no Início aproximam o Hub de um feed social; o limite de 3 itens com fim visível evita a rolagem infinita.

## Fora do escopo e decisões registradas

O modelo de pergunta do dia foi substituído pelo ciclo do Hot Topic. Os itens abaixo registram o que saiu e por quê.

| Item | Situação |
| --- | --- |
| Pergunta do dia, revelação após responder e votação de tópicos | Substituídos pelo ciclo do Hot Topic |
| Canal | Renomeado para comunidade |
| Feed de publicações de pessoas seguidas | Parcial: o Início mostra até 3 interações recentes de pessoas seguidas, com fim visível. Não há feed infinito de pessoas. |
| Curtidas e lista de quem curtiu | Removidas |
| Comentários encadeados | Removidos; respostas ficam direto no tópico |
| Cabine em modo história | Feature posterior |
| Cabine só entre amigos mútuos | Substituída por convite com aceite entre membros de comunidades em comum |
| Terceira aba do perfil | Oculta até ter função definida |
| Histórico de respostas privado | Substituído por respostas públicas no perfil |
| Fixar comunidades | Incluído no MVP: comunidades fixadas no topo de Minhas Comunidades |
| Exportar conteúdo para fora do Hub | Fora do MVP |
| Links em conteúdos | Descartado |
| Baús | Fora do MVP |
| Algoritmo de recomendação avançado | Potencial melhoria |
| Monetização | Fora do MVP |

Ideia registrada para depois do MVP: aba Coleção no perfil, com uma seleção pública de tópicos e respostas feita pelo dono para quem visita.

## Pontos em aberto

Restam 16 pontos. Os três primeiros bloqueiam o lançamento.

- [ ] Método de verificação de idade, a definir com revisão jurídica.
- [ ] Idade mínima de 16 ou 17 anos: o ECA Digital fala em contas "de até 16 anos", o que pode incluir quem tem 16. Revisão jurídica.
- [ ] Universos e comunidades curadas no lançamento.
- [ ] Fuso horário do ciclo. Premissa: 00h no horário de Brasília.
- [ ] Valores de corte de cada métrica, definidos antes do lançamento.
- [ ] Como garantir nome real além do preenchimento pelo Google.
- [ ] Função da terceira aba do perfil.
- [ ] Regras escritas de cada comunidade e onde aparecem.
- [ ] Especificação técnica dos eventos de métrica, em especial o acesso ao perfil com origem registrada.

* [ ] Regras do @: caracteres permitidos, troca e o que acontece com o @ antigo.

- [ ] Existe limite de tópicos na Coleção?

* [ ] O que mostrar a quem tem menos de 16 anos ou não conclui a verificação de idade. Fora do MVP por enquanto.
* [ ] Excluir conta: existe prazo para desfazer a exclusão?

- [ ] Critério de "membro mais ativo" para herdar a moderação. Proposta: mais respostas nos últimos 30 dias, excluindo quem teve conteúdo removido no período.

* [ ] Moderação ao sair: manter a passagem automática para o membro mais ativo ou voltar à transferência escolhida pelo moderador.
* [ ] Revisar o limite de 5 respostas para apagar um tópico conforme a escala do Hub.

## Fontes

1. HUB v2, documento de conceito do produto.
2. [Design system do Hub](https://claude.ai/artifact/U8p7QzxvuAHdnqY7sjwkXn).
3. Protótipo de telas hub-telas-final.html, organizado por feature, com 28 de 29 telas aprovadas.
4. [Lei 13.709/2018, LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm), art. 18, direito de eliminação dos dados.
5. Lei 15.211/2025, ECA Digital, sancionada em 17 de setembro de 2025 e em vigor desde 17 de março de 2026, regulamentada pelo Decreto 12.880/2026. A lei veda a autodeclaração como único mecanismo de verificação de idade. Fontes secundárias: [Conjur](https://www.conjur.com.br/?p=890275) e [factsheet Machado Meyer](https://www.machadomeyer.com.br/images/ebooks/Factsheet_ECA_Digital.pdf). O texto da lei e do decreto precisa ser conferido pela revisão jurídica.
