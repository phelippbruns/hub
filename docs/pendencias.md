# Pendências do Hub

Atualizado em 24 de novembro de 2026, na limpeza que tirou daqui tudo que
já tinha sido feito.

O que falta para o Hub existir. Separado pelo que **impede o lançamento**, pelo
que é **decisão sua**, pelo que é **dívida técnica** e pela **fila de features**.

Para o que já foi construído e como mexer nele, veja [CLAUDE.md](../CLAUDE.md).
Para as regras de negócio, [escopo.md](escopo.md). Para as decisões de produto
que já custaram algo, [vacilos.md](vacilos.md).

---

## 1. Impede o lançamento

Quatro coisas. Nenhuma é de código: todas dependem de decisão ou de contrato.

### 1.1 Verificação de idade de verdade

**Hoje o Hub aceita a data que a pessoa digita.** É autodeclaração, exatamente
o que a RN29 proíbe. Está assim por decisão registrada sua, para permitir
testes, e o sistema avisa alto no registro de cada deploy.

O que falta: escolher o provedor, com revisão jurídica. O código já está
preparado — `AgeVerifier` é uma interface, e o perfil guarda `birthDate`,
`ageVerificationStatus`, `ageVerificationMethod` e `ageVerifiedAt`. Quando o
provedor entrar, dá para achar quem passou por autodeclaração e pedir a
verificação de verdade, **sem refazer cadastro de ninguém**.

Para desligar a autodeclaração: remover `AGE_VERIFIER` das variáveis da Vercel.
Sem ela, o cadastro é recusado — que é o lado seguro.

### 1.2 ~~Idade mínima: 16, 17 ou 18~~ — **decidido: 16, em 24 de novembro de 2026**

Você decidiu **16**, que é o número que a RN29 e o escopo sempre disseram. O
código dizia 18 desde outubro; agora dizem a mesma coisa.

O número está num lugar só (`lib/idade.ts`), e uma varredura reprova quem
voltar a escrevê-lo numa tela. Antes ele estava em quatro lugares, e era isso
que fazia a divergência durar.

**O que isto não resolve:** continua valendo a autodeclaração (1.1). Quem diz
ter 16 entra, e o Hub não confere. Baixar a idade **aumenta** o número de
pessoas que a RN29 queria proteger e que hoje entram sem verificação — então
1.1 ficou mais urgente, não menos.

**E uma ponta jurídica fica aberta:** o ECA Digital fala em contas "de até 16
anos", o que pode incluir quem tem 16. Se a revisão jurídica disser que 16 não
serve, o número volta a mudar — e agora muda num arquivo só.

### 1.3 Universos e comunidades curadas

Hoje há 19 comunidades como ponto de partida (`npm run conteudo:inicial`),
todas no Hubverso. Quais entram no lançamento é decisão de produto.

Cerâmica foi pedida em 11 de outubro **como Universo**, e cancelada em 15 com
o fim dos Universos. As quatro comunidades que eu tinha acrescentado junto —
Torno, Esmaltes, Queima e Modelagem Manual — saíram também: elas existiam só
para o Universo não ficar vazio, e esse motivo acabou. Se cerâmica interessar
como assunto, voltam como comunidades comuns, uma linha cada.

Ligado a isto: **quem modera as comunidades da plataforma.** Hoje a resposta é
"a conta do Phelipp", o que é um remendo — toda denúncia nas 19 cai no seu
colo. Precisa virar um papel de equipe.

### 1.4 O corte de membros está desligado

A RN05 diz que comunidade com menos de 20 membros não aparece em Explorar nem
na página do Universo — só na busca. A regra existe para o Hub não parecer um
cemitério de comunidades vazias.

Em 4 de outubro de 2026 o PO baixou o corte de 20 para **0**: o Hub acabou de
nascer, nenhuma comunidade chega perto de 20 membros, e o corte deixava
Explorar vazio justamente para quem chega primeiro — o contrário do que a
regra quer.

A regra **continua inteira** no código e nos testes, que a exercem com um
corte explícito. Religar é mudar um número em `EXPLORE_MIN_MEMBERS`
([lib/data/communities.ts](../lib/data/communities.ts)), sem mexer em mais
nada.

**A decisão que fica em aberto:** quando religar, e em que número. Vinte foi
escolhido antes de existir gente no Hub. Vale revisitar com dados reais — e
vale decidir se o número volta de uma vez ou sobe aos poucos.

---

## 2. Cadastro: o que ainda depende de você

Dos pedidos de 4 de outubro, **três já estão no ar**: o @ virou obrigatório,
a tela avisa quando ele já existe, e dá para entrar pelo @ ou pelo email no
mesmo campo. Ficaram dois, e os dois são decisão sua.

### Moderação automática de imagem — **em aberto**

Desde a F09 dá para enviar foto. O Hub confere o tipo pelos bytes e tira a
localização, mas **não olha o conteúdo**: nada impede alguém de enviar uma
imagem que não deveria estar numa rede com pessoas de 18 anos recém-feitos.

Hoje a defesa é a denúncia, que chega na F16, e a moderação humana. Isso
basta enquanto o Hub é pequeno e todo mundo se conhece; não basta depois.

Três caminhos, em ordem de custo: serviço de classificação de imagem na hora
do envio; fila de revisão para imagem de conta nova; ou nada automático e
resposta rápida à denúncia. **É decisão sua**, e vale decidir antes de abrir
o Hub para fora do seu círculo.

### Avisar que o email já existe — **custo baixo, mas é uma escolha de segurança**

Tecnicamente é simples. O problema é que isso **contraria uma regra que o Hub
segue de propósito**: nenhuma mensagem de autenticação revela se um email tem
conta. Hoje "email já cadastrado" e "dados inválidos" respondem igual.

O motivo: um formulário que responde "esse email já existe" vira ferramenta de
descobrir **quem** está no Hub. Basta testar uma lista de endereços. Numa rede
sobre interesses — alguns deles íntimos — saber que uma pessoa tem conta já é
informação sobre ela.

**O caminho que resolve os dois lados**, e é o que bancos e redes grandes
fazem: a tela continua dizendo o mesmo para todo mundo, e o Hub **manda um
email para o endereço que já tem conta**: "alguém tentou criar uma conta com
este email; se foi você, entre por aqui; se não foi, ignore." Quem é dono do
email recebe a ajuda. Quem está sondando não descobre nada.

Custo do caminho seguro: médio — depende de ter envio de email configurado, o
que hoje só existe em desenvolvimento (Mailpit).

**Decisão sua:** avisar na tela (rápido, abre a porta de enumeração) ou avisar
por email (seguro, depende de envio de email funcionando).

### Número único no endereço do tópico — **depois**

Hoje, dois tópicos de mesmo nome **na mesma comunidade** ganham um número no
fim do endereço: `primeira-festa` e `primeira-festa-2`. Funciona, mas o
número depende de quem chegou primeiro, e o endereço muda de sentido se o
primeiro for apagado.

Ideia do PO em 10 de outubro: dar um número único a cada tópico e pôr no
endereço, como fazem os fóruns. Fica mais previsível e nunca colide.

Custo baixo, mas **muda endereços que já existem**, então vale fazer de uma
vez com um redirecionamento do formato antigo — o mesmo cuidado que a F08
teve com `/topico/<id>`.

### Termos de uso e Política de privacidade como link — **custo baixo**

Hoje a frase do aceite é texto corrido, sem link. A página
[/termos](../app/(entrada)/termos/page.tsx) já existe e já está na lista de @
reservados, mas o conteúdo é um espaço reservado de 30 linhas.

São duas coisas separadas:

1. **Transformar a frase em link** — meia hora, incluindo o teste de que o
   link abre e volta sem perder o que já foi preenchido.
2. **Colocar o texto real** — depende de você mandar. Vale decidir se Termos e
   Política ficam na mesma página ou em duas, porque o aceite cita as duas.

Mande o texto quando tiver: o encaixe é direto.

---

## 3. Decisões suas, fora do código

| O quê | Situação | Por que importa |
|---|---|---|
| **Senha do banco exposta** | A senha de produção foi colada no chat e **não foi trocada**, a seu pedido | Quem tiver acesso ao histórico tem acesso total ao banco |
| **Chave secreta do Supabase exposta** | Idem, colada no chat e não trocada | Ignora todas as regras de segurança do banco |
| **Confirmação de email desligada** | Desligada para permitir testes | Com ela desligada, dá para criar conta com o email de outra pessoa |
| **Proteção de deploy desligada** | Desligada para o site ficar visível | Os previews de cada PR também ficaram públicos |
| **Login com Google** | Fluxo escrito, botão escondido | Falta criar um OAuth Client no Google Cloud Console |
| **Chave do GIPHY** | Configurada em 10 de outubro, em desenvolvimento e em produção | Sem ela o botão de GIF simplesmente não aparece |
| **Domínio próprio** | Não há | Hoje o endereço é `hub-livid-omega.vercel.app` |

Os quatro primeiros são aceitáveis enquanto é só teste. **Nenhum deles pode
continuar assim com gente de verdade no Hub.**

**E um que é de custo, não de segurança** — por isso fica fora da tabela acima,
para não enfraquecer o aviso dela:

| O quê | Situação | Por que importa |
|---|---|---|
| **Licença do OrbStack** | Grátis para uso pessoal, e é o que o Hub é hoje: sem usuários, sem receita | No lançamento a licença passa a exigir **US$ 8 por mês**. A saída sem custo é o Colima (Apache-2.0), que faz o mesmo trabalho com mais configuração à mão |

O motor de contêiner virou OrbStack em 25 de novembro de 2026, depois de o
Docker Desktop travar duas vezes no mesmo dia e segurar 29 GB numa máquina
com 7,5 GB livres. **Vale conferir a cada atualização do CLI do Supabase se o
modo sem contêiner saiu** (`npx supabase --help | grep -i stack`): o binário
3.4.0 já o carrega por dentro, sem expor o comando. No dia em que expuser,
este item deixa de existir.

### 3.1 A varredura de 24 de novembro de 2026

Pedida por você junto com a atualização de segurança do Next. O que ela
achou, e o que ela encerrou.

**Consertado na mesma rodada: o navegador lia o banco quase inteiro.** O
Supabase concede todos os privilégios a `anon` e `authenticated` por padrão,
e a chave publicável está dentro de todo navegador. Sobrava o RLS, que é por
linha e não por coluna — então a política que torna nome, @ e foto públicos
(RN17) entregava **as 27 colunas de `profiles`**, inclusive a data de
nascimento de todo mundo, o método de verificação de idade e as preferências
de notificação. `memberships` saía em massa pelo mesmo caminho. Escrever já
estava barrado; a falha era de leitura. A porta fechou e só a leitura de
`messages` voltou, que é do que a Cabine precisa.

**Encerrado: o `prod.env` de 11 de outubro não vazou credencial nenhuma.** A
Vercel troca os valores sensíveis por um marcador ao exportar — senha do
banco, chave secreta, JWT e chave do GIPHY saíram todos como `[SENSITIVE]`.
O único valor real e sensível era um token temporário da Vercel, que expirou
em 12 de outubro. Este item pode sair de qualquer lista de preocupação.

**Conferido e correto:** nenhum segredo no pacote do navegador; nenhum
`eval` nem HTML de usuário; nenhum SQL montado por concatenação fora dos
testes; RLS ligado em todas as tabelas; cabeçalhos de segurança completos no
ar; depósito de imagens sem política nenhuma (proposital); toda Server
Action confere a sessão, menos as de entrar e criar conta, que por definição
não têm uma; e a limitação de taxa de autenticação existe e é testada —
10 tentativas de login por email em 15 minutos, 5 de cadastro por hora, com
tetos por IP bem mais altos para não punir quem divide uma rede.

---

## 4. Dívida técnica

Coisas que funcionam, mas que vão cobrar caro se ficarem como estão.

### 4.0.1 Dois painéis laterais parecidos

O do tópico e o do post. Separados por decisão do PO, para não mexer na
tela mais usada do Hub na mesma rodada em que o blog nasceu.

Eles **já divergem**, e para melhor: o do post fecha preservando os
parâmetros da URL e devolve o foco para a linha que estava aberta. O do
tópico perde a busca e os filtros ao fechar, e larga o foco no topo da
página.

Unificar leva as duas correções ao tópico. As peças comuns — a alça e a
conta da largura — já subiram para `design/` e `lib/`.

### 4.0.2 Texto rico no resto do Hub — **custo levantado, decisão sua**

Pedido do PO em 15 de novembro, junto com o Tiptap no blog.

**A resposta curta: o Hub já tem uma solução para texto rico fora do blog, e
ela não é o Tiptap.** Toda outra superfície de escrita é uma coluna de texto
puro com a RN16 recusando endereços, desenhada com marcações por sinal —
`@` pessoa, `#` comunidade, `*` tópico — resolvidas contra o banco. O blog é
exceção porque a **RN41 lhe deu licença explícita**; nenhuma outra tem.

As superfícies, e o que cada uma guarda hoje:

| Onde | Coluna | Limite | Desenho |
| --- | --- | --- | --- |
| Contribuição | `VarChar(240)` | 240 | `TextoMarcado` (`@#*` viram link) |
| Mensagem da Cabine | `VarChar(1000)` | 1.000 | texto cru |
| Abertura do tópico | `VarChar(240)` | 240 | texto cru |
| Intro da comunidade | `VarChar(240)` | 240 | texto cru |
| Sobre da comunidade | texto | 500 | texto cru |
| Regras da comunidade | texto, uma por linha | 5 linhas | lista |
| Bio do perfil | `VarChar(120)` | 120 | texto cru |
| Status do perfil | `VarChar(60)` | 60 | texto cru |

**O custo de levar texto rico a qualquer uma delas**, em ordem de peso:

1. **Mudar a RN16 no escopo.** Ela bloqueia links em *todo* texto e enumera
   duas exceções (o campo Links do perfil, pela RN27; o corpo do post, pela
   RN41). Texto rico com botão de link numa contribuição é abrir a terceira —
   e a RN16 existe para barrar spam em conversa. **É decisão de produto, não
   de implementação.**
2. **Migrar a coluna de `VarChar` para `Json`**, e recontar os limites de
   caracteres sobre a árvore em vez do comprimento da string. Cada uma tem
   um `CHECK` ou validação que depende de ser texto.
3. **Reescrever o desenho de cada tela.** Hoje é literalmente `{valor}`
   dentro de um `<p>`.
4. **Conciliar com `TextoMarcado`.** Ele acha `@#*` por **posição na
   string** (`lib/texto/marcacoes.ts` devolve início e fim). Numa árvore de
   nós com marcas, isso é um problema diferente, não um ajuste.

**Estimativa honesta, por superfície:** 3 a 5 dias cada uma, mais a decisão
de produto sobre a RN16 — que é o item caro e não é meu para tomar. A
contribuição é a mais cara das oito, porque é a única com `TextoMarcado`.

**A recomendação:** não fazer, e não por custo. Uma rede sem curtida que
permite negrito e link em qualquer campo convida ao que a RN16 fecha. Se um
dia alguma superfície pedir formatação, a candidata natural é o **Sobre da
comunidade** — é texto de autor, como o post, e não fala numa conversa.

### 4.1 Um banco só para tudo

Produção e os previews de cada PR usam **o mesmo banco**. Um teste num PR mexe
no mesmo lugar que os dados de verdade. Enquanto só há contas de teste, tudo
bem; depois, não.

**Isto já cobrou uma vez.** O `vercel-build` rodava as migrations em qualquer
ambiente, então o build de preview de um PR aplicava a migration **no banco de
produção**, minutos antes do merge e antes de qualquer revisão — inclusive a
parte que apagava e fechava dados. Está no Faustão. O conserto foi barrar a
migration fora da produção ([scripts/migrar-no-deploy.mts](../scripts/migrar-no-deploy.mts)),
o que tapa o buraco maior e deixa o resto: o preview continua **lendo e
escrevendo** nos dados de verdade, e agora também roda contra um banco que
pode estar atrás do código dele.

O caminho é um projeto Supabase separado para homologação.

### 4.2 `prisma migrate dev` não funciona

Ele introspecta o banco e esbarra na chave de `profiles` para `auth.users`, que
é schema do Supabase e não do Prisma (erro P4002). Banco de sombra não resolve.

Por isso **toda migration é escrita à mão**. Funciona e está documentado, mas é
um passo manual a mais e uma chance a mais de erro.

### 4.3 Avisos de dependência sem correção

O `eslint-config-next` depende de `braces`, que tem um aviso alto **sem versão
corrigida publicada**. A CI bloqueia por vulnerabilidade só nas dependências de
produção; a árvore completa roda como aviso.

Revisar quando o Next publicar correção.

### 4.4 Ícones da PWA são provisórios

Quadrados sólidos gerados por script. Os definitivos dependem da identidade
visual.

### 4.5 Jornadas rodam em série

As 30 jornadas rodam uma de cada vez, porque em paralelo disputam banco,
servidor e o limite de autenticação do Supabase. Custa cerca de um minuto. Se a
suíte crescer muito, vai precisar de bancos isolados por trabalhador.

---

### 4.5.1 ~~A CI não roda o tempo real da Cabine~~ — **era falso, e cobrou**

Este item dizia que a CI sobe o Supabase com `-x realtime` e que a jornada
do tempo real se pulava sozinha lá — e pedia um passo seu para corrigir.
**Nada disso é verdade.** A linha 77 de `.github/workflows/ci.yml` exclui
sete serviços, e `realtime` não é nenhum deles: a CI roda a jornada da
Cabine com tempo real de verdade desde que a F13 subiu.

O engano tinha versão no código também, num comentário dentro da própria
jornada, e quase custou caro: em 24 de novembro de 2026 eu usei esse
comentário para explicar por que uma CI vermelha "não contava". Ela
contava, e estava certa — tinha achado um defeito real que a minha máquina
escondia. O comentário foi reescrito na mesma rodada; está no
[Faustão](faustao.md).

**A lição, que vale mais que o item:** nota antiga em documento não é
medida. Quando ela disser que uma conferência não roda, abra o arquivo da
conferência antes de acreditar.

### 4.6 Pedidos do PO em 11 de outubro

Cinco pontos levantados depois de usar o Hub em produção. **Quatro foram
resolvidos:** a foto de perfil que não aparecia fora do perfil e o aviso de
imagem acima de 4 MB, em 15 de outubro; a navegação que parecia lenta,
tratada no mesmo dia com `loading.tsx` em toda rota que consulta o banco; e
o limite de tópicos por dia (4.6.5), que subiu de 1 para 10 em 15 de
novembro.

Sobra um, e ele depende de você.

#### 4.6.4 Fluxo de navegação entre comunidades e tópicos — **precisa de detalhe seu**

Anotado, mas não sei o suficiente para orçar. O que existe hoje: da comunidade
se chega ao tópico clicando no nome; do tópico se volta pelo botão Voltar ou
pelo nome da comunidade no topo; o Hot Topic tem caminho próprio; e desde 11 de
outubro existe o botão de criar tópico dentro da comunidade.

Me diga qual caminho te incomodou — onde você estava, para onde queria ir, e o
que teve de fazer. Com isso eu digo o tamanho. Chutar aqui seria repetir o erro
de orçamento que já está no Vacilos.

### 4.7 Web Push: a metade da F15 que ficou para depois — **um passo seu**

A F15 entregou as notificações **dentro do app**: a central, os seis tipos,
marcar com @ e os interruptores. O que ficou de fora é o aviso chegando no
aparelho com o app fechado.

Ele foi separado porque depende de três coisas que o resto não depende:

1. **Chaves VAPID**, que você precisa gerar e pôr na Vercel — é o que
   identifica o Hub para o navegador de quem recebe;
2. **PWA instalada**: push não chega em aba de navegador comum;
3. **Não dá para testar aqui nem na CI**, porque o service worker só
   registra em produção. Seria código indo para produção sem rede.

O trabalho em si é pequeno — **meio dia** —, porque a parte difícil já está
pronta: `avisar()` é a única porta por onde toda notificação passa, e os
interruptores já são respeitados ali. O push entra nela.

**Quando quiser fazer:** me diga, eu gero o par de chaves e te mostro
exatamente onde colar na Vercel.

### 4.8 A miniatura de 36 px ignora o enquadramento da capa

A capa da comunidade guarda uma âncora desde a F20, e a página grande a
respeita. As **miniaturas quadradas** nas listas (`size-thumb`, 36 px)
continuam recortando no centro.

É de propósito: a âncora foi escolhida numa faixa deitada, e num quadrado a
sobra troca de eixo — o que a pessoa centralizou pode sair do quadro. E
`object-cover` centralizado nunca deixa buraco, em proporção nenhuma.

**O que fazer, se um dia incomodar:** uma função pura
`pontoDeInteresse(medidas, enquadramento, quadro)` em
`lib/midia/enquadramento.ts` devolvendo o centro do recorte em fração da
imagem, usada como `object-position` na miniatura. Mantém a garantia de não
deixar buraco, honra o que a pessoa escolheu olhar, e ignora o zoom, que
num quadrado de 36 px não muda nada visível.

**Tamanho:** meio dia, a maior parte em levar cinco colunas a mais nas
consultas que alimentam as cinco listas.

### 4.9 O que ficou de fora dos reparos do protótipo v6

Os sete PRs foram para produção e o PO abriu a tela com um PDF de dez
correções.

O resto está no PR A (o que estava quebrado e eu reproduzi) e no PR B (o que
faltava).

**O que ficou de fora por decisão dele**, em 31 de outubro:

| Item do protótipo | Decisão |
| --- | --- |
| **Aviso temporário** depois de cada ação ("Voto registrado", "Link copiado") | Adiado. Hoje cada botão troca o próprio texto, que resolve mal mas resolve. Um aviso de verdade é um componente novo, com fila e tempo, e vale fazer uma vez para o Hub inteiro — não só para a comunidade. |
| Selo **Fixado** no tópico | Depois. Precisa de campo no banco e de uma RN, e o Hot Topic já ocupa esse papel — com a vantagem de ser eleito pela participação, não escolhido. |
| **Silenciar notificações** por comunidade | Não entra: o escopo diz que não há no MVP. |
| Bloco **"Desde sua última visita"** | Descartado. No HTML do PO a função existe e nunca é chamada: era rascunho. |

**E uma que é minha, não dele:** o botão de **copiar** aparece ao lado do
link do evento com um "Copiado" que nunca volta a "Copiar". É o mesmo
problema do aviso temporário acima, e sai junto com ele.

**O que ficou de fora do encontro com conversa**, em 26 de novembro de 2026,
quando os comentários entraram:

| Item | Por que ficou fora |
| --- | --- |
| **Editar e apagar o encontro pela tela** | Só a regra de cascata entrou: apagar o evento esconde a conversa. Quando o botão existir, ele deve **cancelar** e não apagar — trinta comentários morreriam com a linha. |
| **Seguir a conversa do encontro** | O Início lista tópicos seguidos por `?t=<slug>`, e o slug da conversa não abre painel. Seguir entra junto com um endereço para a conversa, nunca antes. |
| **A conversa na busca** | Mesma razão: o resultado da busca é um link de tópico. |
| **Prévia de link e tela de convite do encontro** | Exigiria endereço de caminho (`/c/<com>/eventos/<id>`), que custa pasta nova irmã de `[topico]`, entrada nas **duas** listas de slugs reservados — código e banco — e a renumeração dos tópicos que já existem. Hoje o encontro só tem endereço de navegação. |
| **Link na fila de moderação** | Não há link nenhum na fila: ela mostra o nome do tópico como texto. O plano previa consertar um link que não existe. `/topico/<id>` já traduz para o encontro, e é a única tradução que havia para consertar. |

---

### 4.10 Nove jornadas ainda escrevem o cadastro à mão

O bloco de criar conta — preencher cinco campos, aceitar os Termos, clicar em
Continuar, atravessar o onboarding — está copiado em **nove** specs, cada uma
com a sua cópia de `"senhaboa123"`. Em 25 de novembro de 2026 ele virou helper
em `e2e/apoio-tela.ts` (`criarConta`, `preencherCadastro`, `entrarComSenha`,
`sair`), porque o gerador das páginas de referência precisava dele e copiar
uma décima vez seria o pior momento possível.

**As nove não foram migradas**, de propósito: é diff de nove arquivos que não
entregava nada àquela rodada, e vários desses testes usam variantes próprias
para medir recusas — senha curta, idade abaixo do mínimo, @ repetido.

*O que custa deixar assim:* no dia em que o formulário mudar, nove jornadas
quebram de uma vez e alguém conserta o mesmo erro nove vezes. É exatamente o
argumento que `apoio-tela.ts` já carrega escrito, sobre o seletor que quebrou
em quinze arquivos na F12.1.

*Custo de pagar:* uma passada, com a suíte inteira para confirmar.

---

## 5. Fila de features

Feito: **F00 a F16**, contando a F12.1. Faltam 5 — e o Web Push, que saiu da
F15 e virou rodada própria (seção 4.7).

| | Feature | Depende de | O que entrega |
|---|---|---|---|
| F17 | Configurações e LGPD | F15 | Exportar e excluir conta |
| F18 | Termos e privacidade | F03 | Texto completo — **já destravada**, só falta o texto |
| F19 | Métricas e eventos | F14 | Saber se funciona |
| F20 | Qualidade final da web | todas | Revisão geral, mais a imagem da Cabine (o resto do upload saiu na F09 e na F12) |
| F21 | Versão de celular | F20 | O mesmo código, acima e abaixo de 768 px. **Dois débitos já conhecidos:** os botões da caixa de contribuição e da pílula de ordenar têm **36 px**, abaixo dos 44 px que o WCAG pede para alvo de toque (pedido do PO em 5/11, e vale enquanto o Hub é só desktop); e o **toque duplo no cartão** para dar estrela (item 3.6 do protótipo v6) não foi implementado — falta impedir o zoom do toque duplo e ignorar o toque durante a rolagem. |

**Atalhos que precisam ser preenchidos:** `/inicio`, `/topico/[id]` e `/termos`
existem como páginas mínimas, só para os caminhos não caírem em 404. O
`/inicio` e o `/topico/[id]` já viraram telas de verdade (F11 e F08); o
`/termos` espera o texto.

---

## 6. Pontos em aberto do escopo

Os 16 de [escopo.md](escopo.md) que ainda não foram decididos. Os três
primeiros já estão na seção 1 deste documento.

- Fuso do ciclo. **Assumi `America/Sao_Paulo`**, que é a premissa escrita no escopo. Está numa função só (`hub_cycle_timezone()`).
- Valores de corte de cada métrica, antes do lançamento.
- Como garantir nome real além do que o Google preenche.
- Função da terceira aba do perfil.
- Regras escritas de cada comunidade e onde aparecem.
- Especificação dos eventos de métrica.
- Regras do @: **assumi 2 a 20 caracteres, minúsculas, números e `_`**. Falta decidir troca de @ e o que acontece com o antigo.
- Existe limite de tópicos na Coleção?
- O que mostrar a quem não conclui a verificação de idade.
- Excluir conta: existe prazo para desfazer?
- Critério de "membro mais ativo" para herdar a moderação. **Implementei a proposta do escopo** — mais respostas nos últimos 30 dias, com o membro mais antigo como desempate.
- Moderação ao sair: passagem automática ou transferência escolhida.
- Revisar o limite de 5 respostas para apagar um tópico.

Onde escrevi "assumi", o código já faz uma escolha e ela está num lugar só,
fácil de trocar.

---

## 7. O que depende de você

Esta seção dizia "seguir para a F07" — uma feature entregue há mais de um
mês. Ela não tenta mais ordenar o trabalho, porque **a ordem é sua**: o que
ela lista é só o que **não anda sem você**, separado do que eu consigo fazer
sozinho.

**Nada disso é código meu esperando:**

| O quê | Onde está | Por que trava |
| --- | --- | --- |
| Escolher o provedor de **verificação de idade** | 1.1 | O mais demorado e o que mais bloqueia o lançamento. Vale começar a conversa jurídica mesmo sem pressa de código. |
| Dar um **dono de moderação** às 19 comunidades da plataforma | 1.3 | Hoje toda denúncia nelas cai na sua conta. |
| Decidir sobre **moderação automática de imagem** | 2 | O Hub confere o tipo e tira a localização, mas não olha o conteúdo. Vale decidir antes de abrir para fora do seu círculo. |
| Decidir o **aviso de email duplicado**: na tela ou por email | 2 | Na tela é rápido e abre a porta de enumeração. Por email é seguro e depende de envio configurado. |
| Mandar o **texto dos Termos e da Política** | F18 | A feature está destravada; falta só o texto. |
| Gerar as **chaves VAPID** do Web Push | 4.7 | Meio dia de trabalho meu, que não começa sem elas. Me diga e eu gero o par e mostro onde colar. |
| Trocar a **senha do banco** e a **chave do Supabase** | 3 | Aceitável enquanto é só teste. Não pode continuar com gente de verdade no Hub. |

**E uma decisão de produto que levantei a seu pedido e não é minha:** texto
rico fora do blog (4.0.2). Minha recomendação é não fazer, e não por custo.

