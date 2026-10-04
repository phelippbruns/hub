# Hub

Hub é uma rede social de comunidades por interesse. O caminho que a interface sustenta é interesse, comunidade, tópico, resposta, afinidade, conversa e relação. A interface é calma e plana, e não tem feed infinito: o Início termina em "Você está em dia". A identidade fica concentrada em três lugares: os ícones de tipo ({, #, *), a tipografia Bricolage Grotesque em peso alto e a cor fixa de cada nível da hierarquia.

Este sistema segue o documento HUB v2. Ele substitui o modelo anterior de pergunta do dia, revelação e votação.

## Estrutura

Universo organiza. Comunidade conecta. Tópico provoca. Resposta participa. Cabine aproxima. Universos são mantidos pela plataforma. Comunidades são criadas por usuários dentro de um Universo. Tópicos são criados por membros, com nome e uma abertura. Respostas ficam diretamente no tópico, sem comentários encadeados. Cabines são conversas privadas que começam por convite aceito.

## Ciclo do Hot Topic

O ciclo vira às 00h para todos. O tópico com mais pessoas diferentes respondendo no dia vira o Hot Topic do dia seguinte, no topo da comunidade. O Hot Topic não vence dois ciclos seguidos. Os demais tópicos ficam abaixo, por número de respostas por padrão, com opção de ordem cronológica.

Tópico ativo é o tópico com ao menos uma resposta nas últimas 24 horas. É esse número que aparece em "tópicos ativos" nas listas de comunidades.

## Princípios

1. **Participação, não popularidade.** Não há curtidas nem contador por resposta. Tópicos sempre mostram quantas pessoas e quantas respostas têm. O perfil conta respostas, comunidades e dias ativos (dias com ao menos uma resposta ou tópico).
2. **Cada nível tem uma cor fixa, em toda a rede.** Universo é `sun`, comunidade é `lavender`, tópico é `ink`. A regra vale para marcas, chips selecionados e ícones de tipo. O botão Responder do cartão de Hot Topic também usa `sun`. O cartão não leva selo; quem identifica o Hot Topic é o título da seção.
3. **Ícone de tipo, nome natural.** `{` marca Universo, `#` marca comunidade, `*` marca tópico, cada um na cor do seu nível. Os símbolos aparecem como ícones ao lado do nome, nunca dentro dele: "Música Eletrônica", não "#música eletrônica". Em listas, a comunidade aparece com uma miniatura da capa no lugar da marca #. Na página da comunidade, a marca # é o próprio botão de entrar e sair: contorno lavanda para visitante, preenchida em lavanda para membro.
4. **Plano, sem sombra.** A hierarquia vem de cor de fundo e peso tipográfico.
5. **Texto sobre cor é sempre `ink`,** exceto sobre `ink` e `error`, que levam `paper`.
6. **A lista termina.** Toda lista do Início acaba com uma marca de fim.

## Voz

Frases curtas, verbo no imperativo nos botões, sentence case. O nome de uma ação se mantém no fluxo: "Responder" gera "Resposta enviada". Vazio convida a agir: "Nenhum tópico ainda. Crie o primeiro." Recusas são silenciosas: quem convidou para uma Cabine não é avisado da recusa.

## Cor

| Par | Contraste | Uso permitido |
|---|---|---|
| `ink` sobre `surfacePage` | 14,7:1 | qualquer texto |
| `ink` sobre `paper` | 16,8:1 | qualquer texto |
| `ink` sobre `lavender` | 7,0:1 | qualquer texto |
| `ink` sobre `sun` | 12,3:1 | qualquer texto |
| `inkMuted` sobre `surfacePage` | 6,6:1 | qualquer texto |
| `error` sobre `paper` | 6,6:1 | qualquer texto |
| `success` sobre `paper` | 6,4:1 | qualquer texto |
| `inkMuted` sobre `lavender` | 3,1:1 | só texto de 24px ou mais |
| `paper` sobre `lavender` | 2,4:1 | proibido |
| `lavender` contra `surfacePage` | 2,1:1 | não pode ser o único sinal de estado |

Valores pela fórmula de luminância relativa do WCAG 2.

## Tipografia

Uma família, Bricolage Grotesque, pelo Google Fonts. Peso 800 em `title` e `question`, 700 em `subtitle`, 400 a 600 em texto.

## Limites de conteúdo

Resposta e abertura de tópico: 240 caracteres, com GIF ou 1 imagem. Imagem e GIF têm ícones do mesmo tamanho nos campos de texto. Mensagem de Cabine: GIF ou 1 imagem por mensagem. Intro de comunidade: 240 caracteres. Descrição de perfil: 120 caracteres. Links são bloqueados em todo texto, inclusive endereços digitados. Uma resposta pode ser editada por 5 minutos.

## Ritmo de espaçamento

Grade de 8 px, igual no celular e na web. No celular: 16 px nas laterais, 12 px entre componentes, 12 px dentro de linhas. Na web: O conteúdo tem 32 px de margem lateral e de topo, com o título alinhado à coluna de conteúdo. Entre componentes, 16 px. Entre seções, 32 px. Dentro de cartões e linhas, 16 px. Telas de conteúdo ficam numa coluna centralizada de 720 px; tópico e página da comunidade usam a largura total.

## Seguir

O mesmo olho em contorno segue tópicos e pessoas. Inativo, fica com contorno `inkMuted`. Ativo, fica sobre fundo `lavender`. Seguir um tópico também o salva na Coleção, aba privada do perfil próprio, que organiza os tópicos por Universo (marca { amarela), por comunidade (marca # lavanda) ou em ordem cronológica (relógio). As novidades dos tópicos seguidos aparecem no Início. Seguir é sempre manual: responder a um tópico não o segue.

## Estados

Carregando usa blocos estáticos em lavanda clara, sem brilho animado. Erro usa `error` com ícone e ação de tentar de novo. Sucesso usa `success`. Botão desativado sempre vem com texto que explica o que falta. Convite pendente mostra "Aguardando" sem prazo.

## Fora deste sistema por enquanto

Modo história da Cabine (feature posterior), tema escuro, conjunto de ícones próprio e regras de movimento. Os componentes Cartão da Pergunta e Abas da Cabine ficaram obsoletos com o HUB v2.
