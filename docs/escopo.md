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

O conteúdo se organiza em três níveis, e a Cabine fica fora da hierarquia como espaço privado. Comunidade conecta. Tópico provoca. Resposta participa. Cabine aproxima.

Havia um quarto nível acima, o Universo, que organizava as comunidades por grande área. Ele **saiu do produto na F12.1**, em 15 de outubro de 2026: cobrava de quem ia criar uma comunidade a escolha de uma gaveta antes de falar do assunto. Toda comunidade vive hoje num Universo único e invisível, o Hubverso, que existe só no banco.

| Nível | Ícone | Cor | Quem cria | Exemplo |
| --- | --- | --- | --- | --- |
| Comunidade | # | Roxo (lavender) | Qualquer usuário | Música Eletrônica |
| Tópico | \* | Preto (ink) | Qualquer membro da comunidade | primeira festa |
| Resposta | sem ícone | Branco (paper) | Qualquer membro | Um set de 6 horas num galpão |
| Cabine | ícone de conversa | sem cor fixa | Quem convida, com aceite | Lia e Jo |

Os ícones aparecem ao lado do nome, nunca dentro dele: "Música Eletrônica", não "#música eletrônica". A cor de cada nível é fixa em toda a rede.

## Glossário

| Termo | Definição |
| --- | --- |
| Hubverso | O Universo único e invisível em que toda comunidade vive. Existe só no banco, desde a F12.1, para a coluna `universe_id` continuar fazendo sentido. Não aparece em tela nenhuma. |
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
3. Página da comunidade: foto de capa no topo, com o nome e a marca # na mesma linha — ela é o botão de entrar e sair. A capa **é** o botão de trocar a imagem para quem modera: não há botão permanente nem aviso de formatos escrito na tela. Abaixo da capa, uma linha com membros, tópicos, contribuições e a data de criação. Em seguida vêm as **abas Início e Membros**, presas no topo ao rolar, com a escolha na URL (`?aba=`) e nunca num segmento de rota — um `/c/<slug>/membros` seria irmão estático de `/c/<slug>/<topico>` e tornaria inalcançável o tópico de mesmo endereço (RN36). O Início traz o cartão **Sobre** (descrição, regras recolhidas e quem criou), **Primeiros passos** enquanto a comunidade tem menos de três tópicos, o Hot Topic e a lista de tópicos. A aba Membros tem busca, os filtros Todos, Moderação e Novos, os selos Criadora, Moderação e Entrou esta semana, e o botão Seguir; quem modera convida outra pessoa para moderar a partir dela, e o convite é que vale (RN06). **Sair não pede confirmação**, com duas exceções: quem modera e tem outras pessoas dentro é avisado de que entrega a moderação (RN06), e quem é a última pessoa é avisado de que a comunidade será apagada (RN35). Quem modera troca e ajusta a capa na própria tela, sem sair dela. A capa tem botão de compartilhar, e tanto ele quanto o menu de três pontos abrem como menu suspenso. Clicar num tópico o abre **num painel à direita**, com a lista ainda visível e clicável: o endereço vira `/c/<comunidade>?t=<tópico>`, que é compartilhável e abre a comunidade com o tópico aberto. O endereço do tópico sozinho, `/c/<comunidade>/<tópico>`, continua existindo e abre a página inteira — e o painel traz o link para ela. Fechar o painel volta para a comunidade, e `Esc` faz o mesmo. Dentro do painel, uma linha marca onde começam as contribuições novas desde a última visita. A lista de tópicos tem os filtros **Em alta, Recentes, Seguindo e Com novidades (n)** como chips com nome — os dois ícones de ordenação sem rótulo saíram. A busca só aparece a partir de 10 tópicos. Cada cartão mostra a última contribuição com avatar e @, quantas pessoas, quantas contribuições, quando, e quantas são novas desde a última visita. À direita há uma coluna com o resumo da comunidade — membros e atividade —, que é **desta página** e não uma rota do app inteiro.
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

1. Perfil próprio, com menu de três pontos para Editar perfil e Configurações, @, seguidores, descrição, contadores e abas Respostas, Comunidades e Coleção. A Coleção reúne todos os tópicos seguidos, inclusive os parados, só o dono vê e pode ser organizada por comunidade ou em ordem cronológica.
2. Minhas comunidades com miniatura da capa, membros e tópicos ativos de cada uma, busca por texto, ordem alfabética e comunidades fixadas no topo.
3. Criar comunidade com nome, intro e foto de capa enviada pela pessoa.
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
| 9 | Descoberta / Explorar | Explorar comunidades | Busca, filtros e a lista de comunidades |
| 10 | Descoberta / Explorar | Resultado da busca | Comunidades e pessoas |
| 11 | ~~Descoberta / Explorar~~ | ~~Página do Universo~~ | Apagada na F12.1. O número fica para não renumerar as outras |
| 12 | Comunidades / Tópicos / Respostas | Minhas comunidades | Membros e tópicos ativos |
| 13 | Comunidades / Tópicos / Respostas | Criar comunidade | Nome, intro e foto de capa |
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

São 36 regras. Elas substituem integralmente as RN01 a RN23 do escopo anterior.

| Código | Regra | Área |
| --- | --- | --- |
| RN01 | A hierarquia é comunidade, tópico e resposta. Os ícones {, # e \* ficam ao lado do nome, nunca dentro dele. **O Universo saiu do produto na F12.1** (15 de outubro de 2026): toda comunidade vive num Universo único e invisível, o Hubverso, que existe só no banco para a coluna continuar fazendo sentido. | Estrutura |
| RN02 | ~~Universos são criados e moderados somente pela plataforma.~~ **Sem efeito desde a F12.1**: não há Universo a criar nem a moderar. O número fica reservado para não renumerar as outras. | Estrutura |
| RN03 | Toda comunidade exige nome, intro de até 240 caracteres e capa. Sem capa enviada, usa a capa padrão do Hub. Universo saiu da exigência na F12.1. | Comunidades |
| RN04 | Não podem existir duas comunidades com o mesmo nome. A comparação ignora maiúsculas, acentos, espaços e plural simples. A checagem roda no envio. | Comunidades |
| RN05 | A comunidade fica disponível em Explorar ao atingir 20 membros. Antes disso, só aparece na busca. | Comunidades |
| RN06 | Quem cria a comunidade é moderador e pode nomear outros. Quando um moderador sai e **ainda há outras pessoas**, a moderação passa automaticamente para o membro mais ativo da comunidade, e ele é avisado disso antes de sair. Sem ninguém restante, vale a RN35. | Moderação |
| RN07 | Qualquer membro cria tópicos, com limite de 1 por pessoa por dia em cada comunidade. | Tópicos |
| RN08 | Todo tópico tem nome e descrição de até 240 caracteres, com GIF ou 1 imagem opcional. O autor pode apagar o tópico enquanto ele tiver menos de 5 respostas de outras pessoas, sem contar as do próprio autor; elas também são apagadas, com aviso antes. A partir de 5 respostas, o tópico não pode mais ser apagado pelo autor, só pela moderação. O limite pode mudar conforme a escala. | Tópicos |
| RN09 | O ciclo vira às 00h. O Hot Topic do dia é o tópico com mais pessoas diferentes respondendo no ciclo anterior. | Ciclo |
| RN10 | O Hot Topic de um ciclo não pode vencer o ciclo seguinte. | Ciclo |
| RN11 | Tópico ativo é o tópico com ao menos uma resposta nas últimas 24 horas. | Ciclo |
| RN12 | Os demais tópicos aparecem por número de respostas por padrão. O usuário pode trocar para ordem cronológica. | Tópicos |
| RN13 | A resposta tem até 240 caracteres, com GIF ou 1 imagem. O texto é opcional quando há GIF ou imagem — mídia sozinha já é resposta; vazia dos dois lados, não. Não existem respostas dentro de respostas. | Respostas |
| RN14 | A resposta não pode ser editada. Para corrigir, o autor apaga e responde de novo. O autor pode apagar a própria resposta a qualquer momento. | Respostas |
| RN15 | Não há curtidas nem contador por resposta. Todo tópico mostra o número de pessoas e de respostas. | Respostas |
| RN16 | Links são bloqueados em todo texto, inclusive endereços digitados por extenso. **A única exceção é o campo Links do perfil** (RN27), com até 3 endereços http ou https; o título de cada um continua sendo texto, e também não aceita link. Compartilhar comunidades e tópicos é permitido: o botão de compartilhar envia para uma Cabine ou gera um link que abre o Hub. Quem abre o link sem conta vê a comunidade, os membros e o tópico; as respostas só aparecem depois do cadastro. | Todas |
| RN17 | Todo conteúdo exibe nome real, @ e foto do autor, ou avatar padrão quando não há foto, com acesso ao perfil. O @ é único na plataforma. | Todas |
| RN18 | Usuários seguem comunidades, tópicos e pessoas. Seguir um tópico usa o ícone de olho e salva o tópico na Coleção, aba privada do perfil próprio, que pode ser organizada por comunidade ou em ordem cronológica. Seguir é sempre manual: responder não segue o tópico, e tópicos respondidos e não seguidos ficam só na aba Respostas. | Seguir |
| RN19 | O Início mostra Hot Topics das comunidades seguidas, até 3 interações recentes de pessoas que você segue, suas últimas interações, tópicos seguidos e **as comunidades criadas mais recentemente, entre as que a pessoa não participa**, e termina em "Você está em dia". | Início |
| RN20 | A Cabine é uma conversa privada de 2 a 5 pessoas. Começa quando o convidado aceita — **ou na hora, quando as duas pessoas já se seguem**. Só existe uma conversa aberta por par de pessoas. O ícone de Cabine no perfil leva direto à conversa: à que já existe, à que começa agora, ou a uma nova com o convite pendente — nunca a um formulário de escolher pessoas. | Cabine |
| RN21 | Só é possível convidar quem divide ao menos uma comunidade com você, ou quem se segue com você. O limite é de 10 convites por dia, contando os pendentes, e **um convite pendente por pessoa**. | Cabine |
| RN22 | O convite pode levar uma mensagem de até 240 caracteres, sem links, que aparece para quem recebe. Quando a Cabine nasce de um clique no perfil, o convite sai sem texto e **a primeira mensagem escrita vira a mensagem do convite** — só a primeira, e só enquanto ele estiver pendente. O convite fica aberto até ser aceito ou recusado. A recusa é silenciosa. Quem convidou pode cancelar. | Cabine |
| RN23 | Cada pessoa define quem pode convidá-la: membros das suas comunidades ou ninguém. | Cabine |
| RN24 | Numa conversa de duas pessoas, a saída é **apagar a conversa**: ela some da lista de quem apagou e as mensagens anteriores deixam de aparecer só para essa pessoa; a outra continua com o histórico. Se a outra escrever depois, a conversa volta, começando do que é novo — apagar limpa o passado, não fecha a porta; para fechar existe bloquear. Quando as duas apagaram e não sobrou nada depois das marcas, a Cabine é apagada de verdade. Em grupo (3 a 5), qualquer participante pode **sair**; com uma pessoa restante a Cabine se encerra, e quem sai volta só por novo convite. | Cabine |
| RN25 | Cada mensagem de Cabine aceita GIF ou 1 imagem, além de comunidades e tópicos compartilhados. | Cabine |
| RN26 | Bloquear alguém tira você das Cabines em comum, sem aviso, e impede novos convites. A lista de pessoas bloqueadas fica nas configurações, com opção de desbloquear. | Segurança |
| RN27 | O perfil mostra a foto no formato do Hub, o @ em destaque, o nome abaixo, o número de seguidores, o Sobre mim de até 120 caracteres sem links, até 3 links, os contadores e as abas Contribuições e Comunidades. No perfil próprio há também a aba Coleção, privada, que organiza por comunidade ou em ordem cronológica (o agrupamento por Universo saiu na F12.1). Para o visitante, as comunidades em comum vêm primeiro, num grupo próprio; cada comunidade mostra quantas pessoas e quantos tópicos ativos tem, sendo tópico ativo o que recebeu resposta nas últimas 24 horas. O dono escolhe a cor de fundo da própria página entre 8, guardada como chave, e pode ocultar seguidores e seguindo — ocultado, o número não chega ao cliente do visitante. O número de pessoas seguidas aparece só no perfil próprio, ao lado dos seguidores, e abre a lista. A lista também abre por Ver todas, no Início. Cada contribuição no perfil mostra o tópico e a pergunta. | Perfil |
| RN28 | Os contadores do perfil são contribuições e comunidades, numa linha de texto. Contribuição é uma resposta **ou** um tópico criado, e o número bate com a lista da aba. O indicador "dias ativos" saiu na F18: media assiduidade, que é o oposto do que o Hub promete. **No perfil próprio, seguidores e seguindo abrem a lista**: são as suas pessoas, e as duas listas são privadas. No perfil de outra pessoa, seguidores é só número e não abre lista, para evitar comparação entre perfis. | Perfil |
| RN29 | A idade mínima é de 16 anos, com verificação sem autodeclaração. Login com Google não substitui a verificação. O cadastro exige concordar com os Termos de uso e a Política de privacidade. | Conta |
| RN30 | A foto de perfil é opcional e aparece num hexágono orgânico, a forma do Hub. Sem foto, o Hub mostra as iniciais. A pessoa posiciona e aproxima a foto; a imagem é guardada inteira e o enquadramento é guardado como fração do quadro, conferido no servidor contra as medidas lidas dos bytes, de modo que nunca sobre área vazia dentro da forma. O Google pode preencher nome e foto. | Conta |
| RN31 | O onboarding é uma apresentação de sete cards: seis mostram o Hub funcionando e o sétimo exige ao menos 3 comunidades, escolhidas numa lista só — o agrupamento por Universo saiu na F12.1. O botão de concluir só aparece depois de ver os sete cards **e** escolher as 3. Quem chega por convite já tem a comunidade do convite selecionada e volta ao tópico ao terminar. O onboarding termina pedindo permissão de notificações. Quem já concluiu pode rever a apresentação pela marca do Hub, e aí são seis cards: a escolha não se repete. | Conta |
| RN32 | O usuário pode baixar uma cópia dos seus dados e excluir a conta pelas configurações. Ao excluir, escolhe entre manter respostas e tópicos como "Conta excluída" ou apagar tudo. Cabines, perfil e Coleção são apagados nos dois casos. | Conta |
| RN33 | O moderador remove respostas e tópicos, remove membros (que podem voltar) e bane membros (que não podem voltar). Também adiciona moderadores entre os membros, por convite que precisa ser aceito, e remove moderadores, exceto quem criou a comunidade. Quem é removido da moderação continua membro e é avisado. Banir da plataforma é ação exclusiva do Hub. O autor recebe notificação com o motivo quando uma resposta ou tópico é removido. | Moderação |
| RN36 | A comunidade tem **descrição curta** (sob a capa) e **sobre** (no cartão Sobre), que são campos diferentes. Tem até 5 regras, uma por linha, escritas por quem modera. Elas ficam recolhidas no cartão Sobre e **são mostradas antes de entrar**: com regras escritas, a marca # abre uma folha com elas e o botão de entrar; sem regras, entrar continua sendo um clique. Endereço de tópico nunca colide com rota irmã de `/c/<comunidade>/` — o nome continua valendo e o endereço ganha um número. | Comunidades |
| RN35 | Comunidade que fica sem nenhum membro é excluída no mesmo instante em que a última pessoa sai. A exclusão é lógica: o endereço deixa de abrir, e o histórico de moderação continua existindo. | Comunidades |
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
| sun | #FFD95E | Botão Responder do Hot Topic (era também a cor do Universo, que saiu na F12.1) |
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
| ~~Universo e Hot Topic dividem o amarelo~~ | Resolvido pela F12.1: o amarelo ficou só com o Hot Topic | — |
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
- [ ] Comunidades curadas no lançamento. (Universos saíram do produto na F12.1.)
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
