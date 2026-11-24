# Hub

Hub é uma rede social de comunidades por interesse. O caminho que a interface sustenta é interesse, comunidade, tópico, resposta, afinidade, conversa e relação. A interface é calma e plana, e não tem feed infinito: o Início termina em "Você está em dia". A identidade fica concentrada em três lugares: os ícones de tipo ({, #, *), a tipografia Bricolage Grotesque em peso alto e a cor fixa de cada nível da hierarquia.

**Onde cada coisa mora.** Quatro lugares, e só um deles é editável.

| Lugar | O que é | Como se muda |
| --- | --- | --- |
| [tokens.json](tokens.json) | A **alavanca**. Cor, tipografia, espaçamento, raio, as 44 medidas e a tabela de contraste. | Mude aqui e rode `npm run tokens`. |
| [index.html](index.html) | A **leitura**: a fundação inteira desenhada, que abre com dois cliques, sem servidor. | Gerado. Nunca edite à mão — `npm run tokens:check` reprova na CI. |
| `/design` no app | A **prova viva**: os componentes rodando o código de verdade. | Mude o componente. |
| O documento navegável do design system | A versão para **compartilhar e decidir**, com os componentes e os ícones. | Atualizado junto com este README. |

`design/tokens.ts` e `design/tokens.css` também são gerados do mesmo JSON. Nenhum hex, nenhum pixel e nenhum raio é escrito à mão no código.

Este sistema segue o documento HUB v2. Ele substitui o modelo anterior de pergunta do dia, revelação e votação.

## Estrutura

Comunidade conecta. Tópico provoca. Resposta participa. Cabine aproxima. Comunidades são criadas por quem usa o Hub. Tópicos são criados por membros, com nome e uma abertura. Respostas ficam diretamente no tópico, sem comentários encadeados. Cabines são conversas privadas que começam por convite aceito.

## Ciclo do Hot Topic

O ciclo vira às 00h para todos. O tópico com mais pessoas diferentes respondendo no dia vira o Hot Topic do dia seguinte, no topo da comunidade. O Hot Topic não vence dois ciclos seguidos. Os demais tópicos ficam abaixo, por número de respostas por padrão, com opção de ordem cronológica.

Tópico ativo é o tópico com ao menos uma resposta nas últimas 24 horas. É esse número que aparece em "tópicos ativos" nas listas de comunidades.

## Princípios

1. **Participação, não popularidade.** Não há curtidas nem contador por resposta. Tópicos sempre mostram quantas pessoas e quantas respostas têm. O perfil conta contribuições (respostas mais tópicos criados) e comunidades, numa linha de texto e não num placar de caixas. "Dias ativos" saiu na F18: media assiduidade, que é o oposto de participar no seu tempo.
2. **Cada nível tem uma cor fixa, em toda a rede.** Comunidade é `lavender`, tópico é `ink`, e a marca do Hub é `sun`. A regra vale para marcas, chips selecionados e ícones de tipo. O cartão de Hot Topic não leva selo; quem o identifica é o título da seção.

   **`sun` é a ação principal de uma tela**: o Responder dentro do cartão de Hot Topic, a pílula do card atual no Paginador, o "Iniciar Jornada" do onboarding, o Seguir no perfil, e a marca `{` do Hub. Uma por tela — duas competiriam, e aí nenhuma seria a principal.
3. **Ícone de tipo, nome natural.** `{` é a marca do Hub, `#` marca comunidade, `*` marca tópico, cada um na cor do seu nível. **Os três são traçado, não letra**: letra depende das métricas que cada sistema lê da fonte, e foi por isso que a chave apareceu torta três vezes. A chave e a cerquilha vêm dos arquivos de logo em [logo/](logo/) — são o contorno real da Bricolage em peso 800, não uma imitação dele —, e cada uma traz junto a própria posição dentro do quadrado, inclusive o acerto óptico da chave, 7,5 de 1024 à esquerda do centro geométrico. O asterisco continua desenhado à mão, numa grade de 24: nenhum arquivo de logo o define. Os símbolos aparecem como ícones ao lado do nome, nunca dentro dele: "Música Eletrônica", não "#música eletrônica". Em listas, a comunidade aparece com uma miniatura da capa no lugar da marca #. Na página da comunidade, a marca # é o próprio botão de entrar e sair: contorno lavanda para visitante, preenchida em lavanda para membro.
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
| `ink` sobre `surfaceNeutral` | 15,2:1 | qualquer texto |
| `inkMuted` sobre `surfaceNeutral` | 6,8:1 | qualquer texto |
| `ink` sobre `lavenderSoft` | 13,0:1 | qualquer texto |
| `inkMutedOnDark` sobre `ink` | 10,6:1 | qualquer texto |
| `error` sobre `paper` | 6,6:1 | qualquer texto |
| `success` sobre `paper` | 6,4:1 | qualquer texto |
| `inkMuted` sobre `lavender` | 3,1:1 | só texto de 24px ou mais |
| `paper` sobre `lavender` | 2,4:1 | proibido |
| `lavender` contra `surfacePage` | 2,1:1 | não pode ser o único sinal de estado |
| `surfaceNeutral` contra `paper` | 1,1:1 | não pode ser o único sinal de estado |
| `inkLine` contra `ink` | 1,4:1 | não pode ser o único sinal de estado |

Valores pela fórmula de luminância relativa do WCAG 2.

## Tipografia

Uma família, Bricolage Grotesque, pelo Google Fonts. Peso 800 em `title` e `question`, 700 em `subtitle`, 400 a 600 em texto.

`lead` (18px/27px, peso 400) é a abertura do tópico dentro do cartão escuro, e só ela: é a única linha longa entre o título e o texto de contribuição que precisa de hierarquia própria.

## Limites de conteúdo

Resposta e abertura de tópico: 240 caracteres, com GIF ou 1 imagem. Imagem e GIF têm ícones do mesmo tamanho nos campos de texto. Mensagem de Cabine: GIF ou 1 imagem por mensagem. Intro de comunidade: 240 caracteres. Sobre mim do perfil: 120 caracteres.

**Contribuição não se edita** (RN14): para corrigir, o autor apaga e contribui de novo. Esta linha já disse o contrário, e era falso — não existia edição no código, nem coluna, nem action. A mesma frase foi apagada do onboarding em 31 de outubro pelo mesmo motivo (`docs/vacilos.md` #14), e sobreviveu aqui.

**Links são bloqueados em todo texto, inclusive endereços digitados — menos num lugar.** O campo Links do perfil aceita até 3 endereços http ou https, e é a única exceção em toda a rede. O título de cada link continua sendo texto comum e também não aceita endereço, senão ele seria a porta dos fundos da regra. Links do perfil abrem em outra aba, sempre com `rel="noopener noreferrer"`.

## Espessura de borda

Duas, e cada uma diz o que o elemento é.

**1 px no que é campo**: `Input`, `TextField`, senha, código, a pílula de
busca e o campo da Cabine. Campo é moldura de conteúdo — a 2 px a borda
pesava mais que o texto dentro dela.

**2 px no que é corpo**: botão, chip, caixa de seleção, opção de rádio,
marca de nível e o olho de seguir. Ali a borda não contorna nada: o botão
secundário **é** a borda, e afiná-la o deixaria frágil ao lado do primário,
que é cheio.

Não há token de espessura, e não precisa haver: são as duas classes
nativas do Tailwind (`border` e `border-2`). Um valor no meio exigiria
token novo para nenhum ganho.

A busca é um componente só, `CampoDeBusca` — ela estava copiada em cinco
telas, e foi assim que quatro ficaram com a borda velha quando a quinta
mudou.

## Cor de fundo do perfil

Cada pessoa escolhe a cor da própria página de perfil entre 8: **Lavanda**
(padrão, o mesmo `surfacePage`), Branco, Verde, Azul, Vermelho, Roxo,
Amarelo e Preto. Elas ficam **fora da paleta** do sistema, numa seção
própria do `tokens.json`: são variações claras de superfície, não cores com
significado — e misturá-las com as nove faria `fundoVerde` parecer tão
fundamental quanto `ink`.

Três regras sustentam a escolha:

1. **A cor pinta a área de conteúdo, nunca a barra de navegação.** A barra é
   do Hub e é a mesma em toda tela; tingi-la faria a navegação mudar de cor
   conforme o perfil visitado.
2. **Os cartões continuam `paper` — menos sobre o fundo Branco**, onde
   passam a ser `surfacePage`. Cartão branco sobre página branca tem 1,00 de
   contraste, ou seja, não existe. Sobre o fundo Amarelo o cartão separa-se
   pouco (1,08): ali quem organiza a tela é o espaço, não a borda.
3. **Texto de erro e de sucesso aparecem sempre dentro de um cartão**, nunca
   direto sobre o fundo da página. Todas as 8 passam 4,5:1 com `ink` e com
   `inkMuted`, mas sobre `fundoPreto` o erro dá 4,15 e o sucesso 4,08 — e
   dentro de um cartão `paper` os dois passam com folga.

O perfil guarda a **chave** (`verde`), nunca o hex, para a paleta poder
mudar sem migration. Chave desconhecida cai no padrão em vez de quebrar a
tela. `design/contrast.test.ts` varre as 8 e reprova qualquer cor nova que
não aguente o texto do perfil.

## Ritmo de espaçamento

Grade de 8 px, igual no celular e na web. No celular: 16 px nas laterais, 12 px entre componentes, 12 px dentro de linhas. Na web: O conteúdo tem 32 px de margem lateral e de topo, com o título alinhado à coluna de conteúdo. Entre componentes, 16 px. Entre seções, 32 px. Dentro de cartões e linhas, 16 px. Telas de conteúdo ficam numa coluna centralizada de 720 px; tópico e página da comunidade usam a largura total.

## Seguir

O mesmo olho em contorno segue tópicos e pessoas. Inativo, fica com contorno `inkMuted`. Ativo, fica sobre fundo `lavender`. Seguir um tópico também o salva na Coleção, aba privada do perfil próprio, que organiza os tópicos por comunidade (marca # lavanda) ou em ordem cronológica (relógio). As novidades dos tópicos seguidos aparecem no Início. Seguir é sempre manual: responder a um tópico não o segue.

## Estados

Carregando usa blocos estáticos em lavanda clara, sem brilho animado. Erro usa `error` com ícone e ação de tentar de novo. Sucesso usa `success`. Botão desativado sempre vem com texto que explica o que falta. Convite pendente mostra "Aguardando" sem prazo.

## O que o modo escuro exige

Não há tema escuro, e não há paleta escura rascunhada. Esta seção é o
levantamento que a decisão precisa: **onde o escuro vai doer**, medido, para a
escolha ser feita com número e não com gosto.

São cinco obstáculos, e o custo de cada um é diferente.

**1. Três superfícies quase iguais.** `paper` (#FFFFFF), `surfacePage`
(#F1EEFF) e `surfaceNeutral` (#F3F3F5) se separam por 1,03:1 a 1,14:1 — pouco
**de propósito**: a hierarquia do Hub vem de espaço e peso, não de contorno.
No claro isso funciona porque o olho separa bem no alto da escala. No escuro
ele separa pior, e três cinzas escuros a 1,1:1 viram uma mancha só. É o
obstáculo mais caro, porque dele depende uma regra inteira do produto: **a
tela do tópico é branca enquanto o resto do app é lavanda** justamente porque
os dois fundos de cartão de contribuição — `surfacePage` na sua,
`surfaceNeutral` nas dos outros — só se distinguem sobre `paper`. Sobre
`surfacePage` a sua fica da cor exata da página. No escuro essa engenharia
tem de ser refeita, não traduzida.

**2. O princípio 5 inverte.** "Texto sobre cor é sempre `ink`" vale hoje
porque `ink` é a cor mais escura da paleta. No escuro `ink` é o **fundo**, e a
frase passa a dizer o contrário do que quer dizer. As duas cores que carregam
texto — `lavender` e `sun` — precisam continuar carregando: `ink` sobre
`lavender` dá 7,0:1 e sobre `sun` 12,3:1, e esses dois números são o que
mantém chip selecionado e botão de destaque legíveis. Qualquer escuro que
clareie `lavender` para "combinar" perde o primeiro.

**3. O Hub já tem uma superfície escura, e ela já foi medida.** O cartão de
abertura do tópico é `ink`, com `paper` no texto principal (16,8:1) e
`inkMutedOnDark` (#CFC9EE) no secundário (10,6:1). O filete interno é
`inkLine` (#3A3456), 1,4:1 contra `ink` — divisor decorativo, nunca borda de
controle. **O modo escuro não começa do zero: começa desse trio**, que é a
única parte do sistema já provada contra fundo escuro.

**4. Os oito fundos de perfil são oito decisões, não uma.** Quem é dono
escolhe a cor da própria página (RN27) entre 8, e **todas as 8 são claras** —
da mais clara, `fundoBranco`, à mais escura, `fundoPreto` (#CDCDD3). O teste
`design/contrast.test.ts` exige que `ink` e `inkMuted` passem 4,5:1 em todas,
e `fundoPreto` já raspa o limite com `inkMuted` em 4,73. No escuro cada uma
precisa de um par próprio, e a pergunta de produto vem antes da técnica: a
cor escolhida é **a cor da pessoa** ou é um claro que o tema escuro deve
escurecer? Se for o primeiro, o perfil é uma ilha clara dentro de um app
escuro. Se for o segundo, a escolha de oito pessoas muda sem elas pedirem.

**5. `sun` é o que menos sofre.** Ela é a ação principal de uma tela, uma por
tela, e tem 12,3:1 com `ink` — funciona sobre fundo escuro sem mudar de valor.
No escuro ela continua sendo o único amarelo da tela, e é isso que a faz
funcionar como sinal.

O formato dos tokens já aceita o segundo tema: cada cor é `{"light": "…"}`
hoje e vira `{"light": "…", "dark": "…"}` quando houver decisão. **Não falta
estrutura — falta escolha.**

## Fora deste sistema por enquanto

Modo história da Cabine (feature posterior), conjunto de ícones próprio e
regras de movimento. Os componentes Cartão da Pergunta e Abas da Cabine
ficaram obsoletos com o HUB v2.


## Logo

Os arquivos ficam em [logo/](logo/) e são a fonte do que está em
`design/icons/marks.tsx`:

| Arquivo | O que é |
| --- | --- |
| `hub-logo.svg` | A marca: quadrado `sun` com a chave. |
| `hub-icone-comunidade.svg` | A marca de comunidade: quadrado `lavender` com a cerquilha. |
| `hub-logo-horizontal.svg` | A marca ao lado da palavra "hub". |
| `hub-logo-animado.html` | O protótipo da animação ao passar o mouse. |

Cada símbolo tem dois encaixes no código, e a diferença é só a janela:
`marca` traz o quadrado inteiro de 1024 e põe o símbolo onde o arquivo o
põe; `solto` cola a janela na tinta, para quando o símbolo entra sozinho
num botão que já tem a cor do nível no fundo.

**A marca do Hub na barra lateral é um quarto maior** que uma marca de
nível — 40 contra 32 — porque ali ela não está ao lado de um nome: ela é a
logo. Ao passar o mouse, a chave cresce e a palavra "hub" sai de dentro
dela, com as curvas do protótipo e tempos mais curtos, porque a barra
termina de abrir em 150 ms. As duas param com movimento reduzido.
