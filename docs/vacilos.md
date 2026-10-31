# Vacilos

> Não foi erro de código. Foi erro de decisão.

Erros de **produto e de negócio** deste projeto. O [Faustão](faustao.md) guarda
os erros técnicos: o que o código fez de errado e qual teste passou a impedir.
Aqui ficam os outros — os que nenhum teste pega, porque o código fez
exatamente o que foi pedido.

**Por que existe:** erro técnico quebra e avisa. Erro de produto funciona
perfeitamente e custa dinheiro, tempo ou confiança, às vezes meses depois. Um
campo que ninguém usa, uma regra escrita num documento e outra no código, uma
feature construída na ordem errada, uma decisão tomada duas vezes de formas
opostas. Nada disso fica vermelho.

**Como usar:** antes de decidir ordem de feature, mudar uma RN ou cortar
escopo, passe os olhos aqui. Decisão nova que contraria uma antiga entra como
entrada.

Cada entrada tem cinco partes:

- **o que foi decidido**, e por quem
- **o que isso custou** — em tempo, em retrabalho, em risco ou em experiência
  de quem usa
- **por que não apareceu antes**: a parte que ensina, porque erro de produto
  sempre parece razoável na hora
- **como ficou**
- **o estado**, que diz se o vacilo pode voltar:

| Estado | O que significa |
|---|---|
| 📌 **Fixado** | A decisão está escrita onde quem for decidir de novo vai ler: numa RN do escopo, no prompt da feature no backlog, ou no CLAUDE.md. Decidir ao contrário exige contrariar um documento, não só esquecer. |
| 💭 **Solto** | A decisão vive só na conversa ou na cabeça de alguém. Vai ser tomada de novo, e pode sair diferente. |

**Toda entrada 💭 é dívida.** Quando houver onde escrever, escreva.

---

## 1. Ordem das features

### Universo, a estrutura que virou dívida antes de ser usada

A hierarquia Universo → comunidade → tópico → resposta foi desenhada no
escopo e construída na F06. Em 11 de outubro, com a F12 pronta, o PO decidiu
**eliminar o Universo** — todas as comunidades passam a viver num Universo
único e invisível.

*O que custou:* a F06 construiu três telas em formato de Universo (o Explorar
como lista de Universos, a `/u/<universo>`, o onboarding agrupado por
Universo), e a Coleção na F12 ganhou um agrupamento por Universo. Parte disso
vai para o lixo. A conta foi de 2 a 4 dias para desfazer.

*Por que não apareceu antes:* o Universo resolve um problema real — ele dá
tema à descoberta. O que o uso mostrou é que ele **cobra um pedágio na
criação**: para abrir uma comunidade, a pessoa tem de escolher um Universo
antes de falar do que quer falar. Isso só dói depois que existe gente criando
comunidade, e isso só existiu na F07.

*Como ficou:* virou a [F12.1](backlog.md), antes da F13. O motivo da pressa é
custo, não estética: a F20 (qualidade final) e a F21 (celular) passam por toda
tela, então morrer depois delas significaria construir o layout de celular de
duas telas que seriam apagadas em seguida.

**Regra:** estrutura que cobra uma escolha de quem cria é dívida até que
alguém crie. Antes de inventar um degrau de hierarquia, pergunte quem paga por
ele na hora de criar.

📌 **Fixado** — o escopo da F12.1 registra a decisão e o que fica fora dela
(arrancar a coluna do banco, etiquetas no lugar do Universo).

**Feito em 15 de outubro.** A migration consolidou as 19 comunidades no
Hubverso, o Universo saiu de toda tela, e as linhas antigas de `universes`
ficaram no banco, vazias — reversível de propósito.

### A marca `{` ficou sem dono

Com o Universo fora do produto, a marca amarela `{` perdeu o que
representava. Você pediu a troca das marcas em 11 de outubro — `{` para
comunidade, `#` para tópico, `*` para resposta — e voltou atrás em 15,
mandando manter como está.

*O que custou:* nada em código, porque a reversão veio ainda no plano. O que
sobra é um ponto solto: `level="universe"` **não é usado por nenhuma tela**,
mas continua no componente, na galeria e nos snapshots.

*Por que não apareceu antes:* a troca das marcas e a remoção do Universo
pareciam duas tarefas, e são a mesma. Só ficou claro quando o plano pôs as
duas no mesmo lugar.

*Como ficou:* as três telas que ensinavam a hierarquia — abertura,
boas-vindas e o estado vazio do Início — pararam de mostrar a marca de
Universo, porque ensinar um nível que não existe é prometer o que a pessoa
não vai encontrar. O nível continua no código, intacto, pronto para voltar.

**Regra:** quando um conceito sai do produto, a marca dele não se apaga em
silêncio nem fica exibida por inércia. Ou some das telas, ou o conceito volta.

💭 **Solto** — nada impede alguém de usar `level="universe"` de novo. Um dia
vira 📌 com a troca das marcas, se você decidir fazê-la.

---

## 2. Regra escrita de um jeito, implementada de outro

### Idade mínima: 16 no documento, 18 no código

A RN29 diz 16 anos. O PO decidiu 18, e o código fixou 18 em `MINIMUM_AGE`.
O documento nunca foi corrigido.

*O que custou:* nada ainda. O risco é o seguinte: a próxima pessoa que
implementar algo ligado a idade vai ler o escopo, achar 16, e escrever 16 —
sem nenhum teste reclamando, porque o teste confere o código contra o código.

*Por que não apareceu antes:* a decisão foi tomada numa conversa, e o código
mudou na mesma hora. Parecia resolvido, porque o comportamento estava certo.

*Como ficou:* anotado no CLAUDE.md e nas [pendências](pendencias.md), ainda
esperando a correção do escopo.

**Regra:** decisão que contraria uma RN tem de mudar a RN no mesmo dia. Código
certo com documento errado é uma armadilha com data marcada.

💭 **Solto** — nada liga a RN ao código. Um teste que lesse `MINIMUM_AGE` e o
número escrito na RN29 tornaria isso 📌.

### Verificação de idade por autodeclaração, que a própria regra proíbe

A RN29 exige verificação de idade de verdade. O Hub aceita a data que a pessoa
digita, por decisão registrada do PO, para permitir cadastros de teste.

*O que custou:* é o maior dos riscos abertos hoje. Uma rede com conteúdo para
adultos que não verifica idade é exposição legal, não detalhe de produto.

*Por que não apareceu antes:* a decisão foi certa para a fase — sem ela não
daria para testar nada. O perigo não é a decisão, é ela **sobreviver ao
lançamento** sem ninguém notar.

*Como ficou:* o verificador é plugável e **nega por padrão**; `AGE_VERIFIER` só
aceita o verificador falso com Supabase local, e o build cai se alguém tentar
em produção. O perfil guarda `ageVerificationMethod`, justamente para dar para
encontrar depois quem passou por autodeclaração.

**Regra:** atalho de fase tem de ser construído de um jeito que **cobre
alguém** para sair. Nega por padrão, e deixa rastro de quem passou pelo
atalho.

📌 **Fixado** — o `lib/env.ts` derruba o build e a pendência 1.1 é bloqueio de
lançamento.

---

## 3. Segurança trocada por conveniência

### Senha de produção no chat, e a decisão de não trocar

A senha do banco de produção e a chave secreta do Supabase foram colados no
chat. Avisei; o PO decidiu não trocar, por ser um ambiente de teste e um
histórico privado.

*O que custou:* nada ainda. O custo é uma dívida que vence sozinha: **a hora
de trocar é antes de existir dado de gente real**, e depois dessa hora o custo
deixa de ser "um comando" e passa a ser "notificar quem foi afetado".

*Por que não apareceu antes:* a conta estava certa para o momento — o banco só
tem dados de teste. O que falta não é a decisão, é a **data de validade**
dela.

*Como ficou:* registrado nas [pendências](pendencias.md), seção 3, junto com a
confirmação de email desligada e a proteção de deploy desligada — as três são
atalhos da mesma natureza.

**Regra:** atalho de segurança precisa de um gatilho de saída, não só de um
registro. "Antes do primeiro usuário de verdade" é um gatilho; "depois" não é.

💭 **Solto** — só a lista de pendências protege, e lista não avisa sozinha.

---

## 4. Feature pedida pela metade

### Marcar pessoas com @ sem notificação é enfeite

O PO pediu marcar pessoas com `@` nas respostas. Pintar o `@` e linkar o
perfil é a parte visível e barata.

*O que custou:* nada, porque a conta foi feita antes de construir. Se tivesse
sido construída sozinha, teria entregado uma funcionalidade que **não faz
nada**: quem é marcado não fica sabendo, então marcar não convida ninguém para
a conversa.

*Por que não apareceu antes:* a parte que dá sentido à feature não aparece no
pedido. Marcar é o que se vê; notificar é o que faz funcionar.

*Como ficou:* entrou na [F15](backlog.md), junto com as notificações, com as
quatro partes escritas no prompt da feature — incluindo a decisão de produto
de que marcar vale só entre membros da mesma comunidade e respeita bloqueio.

**Regra:** antes de aceitar uma feature, pergunte o que acontece depois do
clique. Se a resposta for "nada", o escopo está pela metade.

📌 **Fixado** — o prompt da F15 carrega as quatro partes e os critérios de
aceite.

---

## 5. Orçamento dado sem ler o código

### 6 a 9 horas que eram 2 a 3

Perguntado quanto custaria a F12.1, respondi "6 a 9 horas", contando uma
reescrita da camada de descoberta. Quando o PO perguntou se não dava para
fazer mais simples, eu abri o arquivo: `comunidadesDoUniverso()` **já** lista
comunidades por atividade, com busca. Tirar uma linha de SQL dela entrega o
Explorar inteiro. A reescrita que eu havia orçado não existia.

*O que custou:* por pouco, uma decisão de produto errada. Com 6 a 9 horas na
mesa, adiar era uma escolha defensável; com 2 a 3, não é. Um número inflado
não é conservador — ele **muda a decisão** de quem está decidindo.

*Por que não apareceu antes:* eu orcei pela superfície, contando arquivos que
mencionam "universo" — 35 de produto, 18 de teste. O número era verdadeiro e a
conclusão errada: a maioria é encanamento que não muda, e 69 das 144 menções
nos testes são andaime de setup.

*Como ficou:* o tamanho corrigido no [backlog](backlog.md), com o motivo
escrito, para o próximo orçamento não repetir o atalho.

**Regra:** estimativa sem abrir os arquivos é chute vestido de número. Antes
de dar prazo, ler as duas ou três funções que o trabalho realmente toca —
contar menções não é ler.

💭 **Solto** — nada impede um orçamento de superfície. O que protege é o
hábito de perguntar "quais funções mudam?" antes de "quantos arquivos citam?".

---

## 6. Função que existe e não funciona

### A busca de pessoas que só filtrava a primeira página

A tela de nova Cabine trazia as primeiras pessoas por ordem alfabética e
tinha um campo "Buscar pessoas". O campo filtrava **a lista que já estava na
tela** — então procurar alguém que não estivesse entre os primeiros nomes
não encontrava nada.

*O que custou:* nada, porque a jornada pegou antes de ir para produção. Mas
o modo de falhar é o pior que existe: o campo responde, a lista muda, e a
pessoa conclui que quem ela procura não está no Hub.

*Por que não apareceu antes:* com poucos dados, filtrar no navegador é
indistinguível de buscar de verdade. O teste só reprovou porque o seed tem
gente suficiente para a pessoa procurada ficar fora das primeiras.

*Como ficou:* a busca virou ida ao servidor, com espera de 250 ms para não
consultar a cada tecla, e a jornada passou a procurar pelo campo em vez de
clicar na lista.

**Regra:** filtro no navegador só vale quando **tudo** está no navegador. Se
a lista é paginada ou limitada, filtrar o que veio é uma busca que mente.

💭 **Solto** — nada impede o mesmo atalho numa tela nova. O que protege é
testar com dados em quantidade, não com dois registros.

---

## 7. Caminho que ninguém abriu

### Criar tópico sem porta na comunidade

Da F08 à F12, criar tópico só era possível pelo atalho da barra lateral, que
pergunta em qual comunidade. A rota `/c/<slug>/novo` existia e funcionava, mas
nenhuma tela levava até ela.

*O que custou:* quatro features de um caminho principal do produto escondido.
O Hub existe para alguém abrir um assunto; a vontade de abrir nasce **lendo a
comunidade**, com ela já escolhida — e era exatamente dali que não dava.

*Por que não apareceu antes:* o teste de criar tópico navegava direto para a
rota (`page.goto`), porque era o caminho curto de escrever. Teste verde,
botão inexistente. É o mesmo tipo de cegueira do Faustão: a barreira conferia
que a rota responde, não que alguém chega nela.

*Como ficou:* botão no título "Tópicos" e no estado vazio, só para membros, com
uma jornada que **clica** em vez de navegar.

**Regra:** rota sem link não existe. Toda rota nova precisa de um teste que
chegue nela clicando, não digitando o endereço.

💭 **Solto** — nada varre `app/` procurando rota sem link que aponte para ela.
Um teste assim tornaria isto 📌.

---

## 8. Regra que protegia demais

### A Cabine pedia licença a quem já era próximo

Até esta rodada, duas pessoas que **se seguem** precisavam de convite,
aceite e espera para trocar uma frase. A RN20 dizia "a Cabine só começa
quando o convidado aceita", sem exceção.

*O que custou:* o caminho mais curto do produto era o mais longo. A cadeia
que o Hub sustenta termina em Conversa, e o último passo tinha um pedágio
justamente entre as pessoas que já haviam dito sim uma à outra — seguir é
dizer sim. Quem testa o Hub com um amigo sentia o atrito logo na primeira
tentativa.

*Por que a regra estava assim:* ela protege de verdade, e contra o pior
risco da feature — a Cabine virar canal de assédio. A tabela de riscos do
próprio escopo já apontava o seguir mútuo como o caminho seguro ("sem seguir
mútuo, qualquer um poderia convidar"), e mesmo assim a RN nasceu sem essa
porta. O convite foi escrito como se fosse a única defesa possível.

*Como ficou:* a RN20 ganhou a segunda forma — começa ao aceitar **ou** quando
as duas se seguem. O que **não** mudou é o que importa: bloqueio (RN26) e
"ninguém pode me convidar" (RN23) continuam valendo com laço mútuo. Quem
fechou a porta fechou para todos.

**Regra:** proteção que trata consentimento forte e consentimento nenhum do
mesmo jeito não é proteção, é atrito. Quando uma regra exige permissão,
pergunte se já não existe um sinal de permissão mais forte na mesa.

📌 **Fixado** — a mudança está na RN20 e na RN21, e os testes de banco cobrem
os dois lados: o atalho funciona, e bloqueio e RN23 continuam vencendo.

---

## 9. Ordem escolhida sem decidir

### A resposta mais nova no fim da fila

As respostas nasceram em ordem cronológica crescente na F09 — a mais velha
em cima. Ninguém decidiu isso: é o padrão de quem escreve `orderBy: asc` sem
pensar, e ficou.

*O que custou:* num tópico com quarenta respostas, quem volta para ver o que
chegou rola tudo. O Hub é feito para voltar todo dia — o ciclo das 00h existe
para isso — e a tela premiava quem nunca tinha voltado.

*Por que não apareceu antes:* nenhum tópico de teste passou de dez respostas.
O defeito não quebra nada; ele só cansa, e cansaço não aparece em teste.

*Como ficou:* a mais nova em cima, por padrão, com **Mais antigas** ao lado
para quem quiser ler como conversa, do começo. As duas opções têm nome
escrito, não ícone: a diferença entre elas é o sentido da leitura, e isso
nenhum desenho de seta explica.

**Regra:** ordem de lista é decisão de produto, não detalhe de consulta. Toda
lista nova responde a uma pergunta antes de existir: quem chega aqui está
procurando o quê?

💭 **Solto** — a escolha não é lembrada por pessoa. Isso é a F17 ("Ordem
padrão"), e guardar preferência agora duplicaria aquele trabalho.

---

## 10. Tela que só fala do que você já tem

### O Início não mostrava nada que viesse de fora

Hot Topics das suas comunidades, o que as pessoas que você segue fizeram,
as suas últimas interações, os tópicos que você segue. Tudo verdadeiro,
tudo útil — e tudo de dentro do que a pessoa já escolheu. A tela que o Hub
pede para abrir todo dia não tinha **nenhuma** porta para o que apareceu
no Hub desde ontem.

*O que custou:* comunidade nova nascia invisível. Quem criava dependia de
mandar o link; quem poderia entrar só encontrava se fosse procurar no
Explorar — e ninguém abre o Explorar para descobrir o que não sabe que
existe. O Hub tem uma cadeia que começa no interesse, e o primeiro elo
dela não tinha vitrine.

*Por que não apareceu antes:* a RN19 lista o conteúdo do Início, e a lista
estava sendo cumprida à risca. Regra cumprida não chama atenção — ela só
congela a decisão de quem a escreveu, e aquela decisão era sobre uma rede
que ainda não tinha comunidades sendo criadas.

*Como ficou:* "Novas no Hub" no fim da tela, depois do que é seu e antes do
"você está em dia", com até cinco comunidades que você não frequenta. A
RN19 foi reescrita.

**Regra:** tela de retorno diária precisa de pelo menos uma janela para
fora do que a pessoa já segue — senão o produto só devolve o que ela já
trouxe, e fica menor a cada visita.

📌 **Fixado** — está na RN19 e em teste de banco: a seção existe, respeita
quem já é membro e some quando não há nada novo.

---

## 11. Atalho que leva a uma porta fechada

### A marca do Hub ia para uma tela que se recusava a abrir

A apresentação em carrossel trouxe um pedido junto: a marca do Hub, no topo
da barra lateral, deve levar a ela. Feito — `/inicio` virou `/boas-vindas`,
o teste passou, o build passou.

Só que `/boas-vindas` tinha, desde a F03, uma guarda: quem já concluiu o
onboarding é mandado para o Início. E **todo mundo que vê a barra lateral
já concluiu o onboarding** — a barra só existe dentro do app. O clique na
marca saía de `/inicio`, passava por `/boas-vindas` e voltava para
`/inicio`. O atalho novo fazia exatamente o que o antigo fazia, com um
redirecionamento no meio.

*O que custou:* nada ainda — apareceu ao percorrer a tela à mão, no último
passo da verificação, depois de a suíte inteira passar verde.

*Por que não apareceu antes:* nenhum teste olhava o destino. O que se
pediu foi "a marca leva ao carrossel", e era isso que o código fazia: o
`href` estava certo. Quem redirecionava era a outra ponta, que ninguém
tinha motivo para reler — ela não mudou.

*Como ficou:* `/boas-vindas` deixou de expulsar quem já concluiu. Para essa
pessoa a tela vira **revisão**: os mesmos seis cards de apresentação, sem o
sétimo (escolher comunidades de novo seria desfazer o que ela escolheu
desde então), e o fim é um caminho de volta ao Início. É também o que o
protótipo já dizia, com o botão "Rever como o Hub funciona".

E vale dizer em voz alta o que mudou para quem usa: **a marca não é mais o
atalho para a home.** Em quase todo site ela é, e é o que a pessoa clica
quando se perde. O Início continua um item abaixo, mas quem tem o hábito
vai estranhar.

**Regra:** mudar para onde um link aponta é metade da mudança. A outra
metade é abrir o destino e conferir que ele recebe quem chega — guarda de
rota é invisível de fora, e nenhum teste de `href` a enxerga.

👁 **Solto** — o novo destino tem teste de jornada, mas nada impede que uma
guarda futura volte a fechar a porta sem ninguém notar.

---

## 12. Regra absoluta que o produto precisava furar

### "Links são bloqueados em todo texto" não tinha onde a pessoa dizer quem é

A RN16 é uma das regras mais antigas do Hub, e é boa: sem ela, toda resposta
vira anúncio, todo tópico vira isca, e a moderação passa a ser sobre spam em
vez de ser sobre conversa.

Só que ela era **absoluta**, e o perfil é o lugar onde uma pessoa diz quem
é fora daqui. Sem nenhuma porta, o Hub pedia que as pessoas se conhecessem
pelas respostas e ao mesmo tempo proibia a única frase que resolve isso:
"meu trabalho está aqui".

*O que custou:* o jeito de contornar já estava acontecendo — endereço
escrito por extenso, com espaços, no Sobre mim. O bloqueio pega "site.com",
e as pessoas escrevem "site ponto com". A regra não impedia o link; impedia
que ele fosse clicável e seguro.

*Por que estava assim:* a RN16 nasceu certa para resposta, tópico e
mensagem, que é onde o spam mora, e foi escrita como "todo texto" porque na
época não havia campo nenhum que fosse só da pessoa. A regra não envelheceu
— o produto cresceu em volta dela.

*Como ficou:* o campo Links do perfil, com até 3 endereços, é a **única**
exceção da rede. E a exceção é estreita de propósito: só `http` e `https`
(`javascript:` executa código na página de quem clica, `data:` serve uma
página falsa no nosso domínio), o título continua sendo texto comum que
**também** não aceita endereço — senão ele seria a porta dos fundos —, e o
link abre em outra aba com `noopener` e `noreferrer`. O limite de 3 é a
chave primária da tabela, não uma contagem no código.

**Regra:** quando uma regra de segurança atrapalha o produto, a saída não é
afrouxá-la em todo lugar nem mantê-la e ver as pessoas contornando. É abrir
**um** lugar, escrever por que é aquele, e estreitar a exceção até ela só
servir ao caso que a justificou.

📌 **Fixado** — a RN16 e a RN27 foram reescritas, e `lib/data/perfil.db.test.ts`
cobre os dois lados: o que o campo aceita e o que ele recusa, inclusive
`javascript:`, o quarto link e o endereço escondido no título.

---

## 13. Regra que protegia a pessoa dos próprios dados

### "Seguidores não abre lista" valia até no seu próprio perfil

A RN28 dizia que o número de seguidores é informativo e não abre lista,
"para evitar comparação entre perfis". A regra é boa e o motivo é o
Princípio 2: o Hub não tem curtida nem contador por resposta justamente
para ninguém medir ninguém.

Só que ela estava escrita sem sujeito, e por isso valia também **no seu
próprio perfil** — onde não há perfil nenhum para comparar. A pessoa via
"2 seguidores" e não tinha como saber quem eram. Quem ela seguia, sim,
abria lista; quem a seguia, não.

*O que custou:* nada grave, mas a assimetria não tinha explicação. Saber
quem te acompanha é o tipo de coisa que qualquer pessoa espera poder ver, e
a ausência parecia defeito, não decisão.

*Por que passou:* a regra foi escrita olhando o perfil de outra pessoa, que
é onde o risco mora, e generalizada sem reparar que o perfil próprio é o
mesmo componente. O teste que a protegia conferia exatamente o caso certo
("seguidores é número, e não abre lista" no perfil alheio) e por isso nunca
acusou nada.

*Como ficou:* no perfil próprio, seguidores e seguindo abrem lista; as duas
são privadas e recusadas no servidor para qualquer outra pessoa. No perfil
de outra, nada muda: número, sem lista.

**Regra:** regra que diz "não mostre X" precisa dizer **para quem**. Sem
sujeito ela acaba valendo contra o próprio dono — que é a única pessoa para
quem o dado nunca foi perigoso.

📌 **Fixado** — a RN28 foi reescrita, `getFollowers` recusa quem não é o
dono, e há teste de banco e de jornada dos dois lados.

---

## 14. A primeira tela prometia o que o produto não faz

### "Dá para editar por 5 minutos" nunca foi verdade

O card de Tópicos do onboarding dizia, desde que nasceu: *"acesse o tópico
e deixe sua contribuição. Dá para editar por 5 minutos."*

A RN14 diz o contrário, e sempre disse: *"A resposta não pode ser editada.
Para corrigir, o autor apaga e responde de novo."* Não existia nenhuma
edição no código — nem action, nem coluna, nem política de banco. O menu da
própria resposta tem só "Apagar resposta", com o texto "Para corrigir,
apague e responda de novo" logo ali.

*O que custou:* a **primeira** tela que alguém vê no Hub ensinava uma
função inexistente. Quem acreditasse ia escrever com menos cuidado,
contando com um conserto que não existe, e descobriria no pior momento —
depois de publicar.

*Por que passou:* o texto do onboarding veio do protótipo, e protótipo é
desenho, não contrato. Ninguém conferiu cada frase contra a RN
correspondente, porque texto de tela não parece código — e nenhum teste lê
texto de tela procurando promessa.

*Como ficou:* a frase saiu. A jornada do onboarding agora reprova se ela
voltar.

**Regra:** texto de onboarding é promessa, e promessa se confere contra a
regra, uma por uma. Quando o protótipo descreve um comportamento, ele é
pedido de feature — não descrição do que existe.

📌 **Fixado** — `e2e/onboarding.spec.ts` procura a frase e reprova se ela
reaparecer.

---

## 15. Texto que envelheceu junto com a regra

### A tela de criar comunidade falava de um corte que estava desligado

"A comunidade fica disponível na aba Explorar ao atingir 20 membros."

A RN05 existe e está inteira no código — mas `EXPLORE_MIN_MEMBERS` vale
**0** desde 4 de outubro, por decisão sua: com o Hub recém-nascido, o corte
deixava o Explorar vazio justamente para quem chegava primeiro. Toda
comunidade aparece desde o primeiro membro.

*O que custou:* quem criava comunidade achava que ela estava escondida, e
não estava. Pior: desanimava de divulgar, esperando um número que não era
exigido.

*Por que passou:* a constante foi zerada com um comentário cuidadoso
explicando o porquê — e o **texto da tela** ficou. Mudar o valor de uma
regra e esquecer a frase que a descreve é fácil justamente quando a frase
mora longe do código que ela descreve.

*Como ficou:* o texto saiu, e com ele o teste que o guardava — ele
afirmava que a tela dizia aquilo, ou seja, **protegia a mentira**.

**Regra:** quando uma regra é desligada por configuração, procure o texto
que a anuncia. A regra dorme no código; a frase continua acordada na tela.

👁 **Solto** — não há como um teste saber que uma frase virou mentira. O
que existe é o hábito: mexeu num limite, procure quem o cita.

## 16. Confirmação que protegia de nada, e o buraco que ela escondia

### "Sair pede confirmação" valia até para quem só tinha entrado

*O que estava escrito:* o escopo dizia, na descrição da página da
comunidade, **"Sair pede confirmação"**. Sem exceção. Implementado assim
desde a F07: tocar na marca # abria uma folha com "Continuar membro" e
"Sair".

*O que o PO decidiu, em 29 de outubro:* a confirmação sai. A razão é curta
e correta — **a comunidade é pública**. Entrar e sair não custa nada, não
perde conteúdo e não avisa ninguém; perguntar "tem certeza?" para uma ação
reversível e gratuita é atrito que treina a pessoa a clicar em "Sim" sem
ler, e aí a confirmação que **importa** também passa batida.

*O que a conversa descobriu:* a confirmação protegia de uma coisa de
verdade, e de outra que ninguém tinha visto.

A que ela protegia é a RN06: quando um moderador sai, a moderação passa
para o membro mais ativo, **e isso não tem volta**. Era a última linha da
descrição da folha, e sumiria junto com ela.

A que ninguém tinha visto é a comunidade de uma pessoa só. Nela o moderador
é o único membro, não há herdeiro a escolher, e sair deixava um endereço
vivo com zero membros, sem quem o moderasse e sem quem o lesse — atendendo
denúncia que ninguém atenderia. Ninguém tinha escrito o que fazer nesse
caso porque ninguém tinha olhado para ele.

*O que ficou:* sair é um clique, e duas exceções perguntam — a entrega da
moderação e a exclusão da comunidade vazia, que virou a **RN35**. Nos dois
casos o texto diz **o que acontece**, não "tem certeza?": o que a pessoa
precisa saber é o que ela perde.

**A lição:** antes de tirar uma confirmação, leia o que ela dizia. Ela é o
único lugar do produto onde alguém já escreveu as consequências de uma
ação — e, se alguma delas não couber em "é reversível e gratuito", é ela
que precisa de regra, não de folha.

## 17. Estrutura do Hub inteiro a serviço de uma tela

### O painel de contexto existia para uma página só

*O que havia:* uma terceira coluna no layout de todas as 23 telas
autenticadas, alimentada por **rota paralela** (`app/(app)/@painel/`), com
um `default.tsx` devolvendo nada, um `empty:hidden` para a coluna sumir, e
uma coluna no banco (`profiles.hide_context_panel`) guardando a preferência
de cada pessoa de escondê-la.

*Quem usava:* a página da comunidade. Só ela. O painel mostrava a descrição,
a contagem de membros, uma explicação de como o Hot Topic funciona e os
tópicos seguidos naquela comunidade.

*O que o PO decidiu:* o painel sai, e as informações descem para baixo da
capa.

*O que isso revelou:* a estrutura custava mais que o conteúdo. Rota
paralela é das coisas mais difíceis de entender no App Router — ela tem
regras próprias de `default`, de revalidação (`revalidatePath(..., "layout")`)
e de como se comporta em navegação —, e o Hub carregava tudo isso, em toda
tela, para desenhar quatro blocos de texto numa.

A justificativa original está no código e era boa: o painel precisava
continuar visível com uma folha aberta, e folha que empurra conteúdo o
faria sumir. Ela deixou de valer quando as folhas viraram menus suspensos
na mesma rodada — e ninguém teria reparado, porque a estrutura não reclama.

**A lição:** quando uma peça de infraestrutura serve a **um** lugar,
pergunte se o motivo dela ainda existe. O motivo some antes da peça, e em
silêncio.

## O endereço da comunidade seguia o nome, e ninguém tinha decidido isso

**O que era:** o gatilho `communities_slug` recalculava o endereço a cada
renomeação, e um teste de banco afirmava isso — "renomear muda o
endereço". Sem comentário, sem razão escrita.

**Por que ninguém notou:** da F07 até 31 de outubro, **nada no produto
renomeava uma comunidade**. O nome era escrito na criação e ficava. O
teste não documentava uma decisão; documentava o que o código fazia.

**O que a mudança revelou:** a janela de moderar trouxe a primeira tela que
renomeia. Com o gatilho como estava, corrigir um acento no nome mudaria
`/c/<endereco>` e **quebraria todo link já compartilhado** — inclusive os
convites da F14, que são o mecanismo de crescimento do Hub.

**O que ficou:** renomear mantém o endereço. É a mesma regra que o
CLAUDE.md já escrevia sobre o `@u`: endereço que já existiu nunca volta a
ser livre. O teste foi reescrito ao contrário, com a razão junto.

**A lição:** teste que descreve comportamento não é o mesmo que teste que
protege decisão. Quando um deles for reescrito, pergunte qual dos dois ele
era — e se a resposta for "ninguém sabe", é porque a decisão nunca foi
tomada.

👁 **Decisão nova, tomada em 31 de outubro.** Se o PO preferir que o
endereço acompanhe o nome, é inverter uma condição no gatilho — mas aí
vale decidir também o que acontece com os links antigos.
