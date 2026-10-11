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

## 5. Caminho que ninguém abriu

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
