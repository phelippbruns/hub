# Faustão

> ERROU!

Erros que eu já cometi neste projeto, e a regra que cada um deixou. Existe
para eu não repetir — e para quem vier depois não tropeçar no mesmo lugar.

**Como usar:** antes de dizer que algo está pronto, passe os olhos na seção 1.
Ao escrever teste, na 2. Ao mexer em ambiente ou banco, na 4.

Cada entrada tem quatro partes:

- **o que aconteceu**
- **por que passou** pelas verificações — a parte que ensina, porque todo erro
  aqui atravessou alguma conferência que eu achava suficiente
- **como resolvi**
- **o estado**, que é o que diz se o erro pode voltar:

| Estado | O que significa |
|---|---|
| 🔒 **Barrado** | Um teste, uma regra de lint ou um passo da CI impede a repetição. O erro não volta sem alguém derrubar a barreira de propósito. |
| 👁 **Atenção** | Só a regra escrita protege. Depende de eu lembrar — e o que depende de lembrar volta. |

**Toda entrada 👁 é dívida.** Quando aparecer um jeito de virar 🔒, vira.

---

## 1. Achar que está pronto

### Build verde não é app no ar

Reportei "Vercel: pass" da F01 à F03. O site respondia **404 em todas as
rotas** o tempo todo: a Vercel rodava `next build` e publicava só a pasta
`public/`, porque o framework estava marcado como "Other".

*Por que passou:* o sinal verde mede se o código compila, não se o app
responde. Tratei um como o outro e nunca abri a página.

*Como resolvi:* `vercel.json` fixa o framework no repositório, e criei
`npm run verificar:deploy <url>`, que busca as rotas e distingue "app quebrado"
de "proteção de acesso na frente".

**Regra:** antes de dizer que está no ar, rodar o verificador **e abrir a
página no navegador**.

👁 **Atenção** — o verificador existe, mas ninguém me obriga a rodá-lo. Vira 🔒
quando entrar como passo da CI contra o deploy de preview.

### Migrations não sobem junto com o código

Duas vezes — F02 e F04 — mergeei uma feature com migration e deixei o banco
remoto atrás. O build passava, o site subia, e o erro só aparecia quando
alguém usava a tela: `The column profiles.onboarded_at does not exist`.

*Por que passou:* funcionava na minha máquina, onde a migration já estava
aplicada.

*Como resolvi:* `vercel-build` roda `prisma migrate deploy` antes do
`next build`. O passo deixou de ser humano.

🔒 **Barrado** — todo deploy aplica as migrations.

### Ler resultado de servidor obsoleto

Investigando a CSP, concluí que o nonce não funcionava e quase reescrevi a
configuração. Eu tinha vários `next start` rodando de testes anteriores e
estava lendo a resposta de um build velho.

*Como resolvi:* passei a matar a porta 3000 antes de cada verificação.

**Regra:** antes de diagnosticar, matar o que está na porta e subir de novo.
Resultado que contraria o código merece primeiro a pergunta "estou medindo a
coisa certa?".

👁 **Atenção** — puro hábito.

---

## 2. Testes que não testam

### Todo teste pelo mesmo caminho

A tela de notificações tem dois botões. **Todos os meus testes clicavam em
"Agora não".** O caminho de "Ativar notificações" travava a tela — botão
desativado, sem mensagem, sem saída — e 30 jornadas verdes não acusaram nada.
Quem encontrou foi o PO, no primeiro cadastro de verdade.

*Como resolvi:* o caminho de ativar agora é testado nas duas permissões,
concedida e negada.

**Regra:** tela com duas saídas precisa de dois testes. Se existe um botão que
nenhum teste aperta, ele não existe para a suíte.

👁 **Atenção** — nada mede cobertura de caminho hoje.

### Teste que passa com e sem a correção

Depois de corrigir aquele travamento, quase mandei o PR sem conferir se o
teste novo pegava o bug.

*Como resolvi:* desfiz a correção, vi os dois testes falharem, e só então
mandei o PR.

**Regra:** ao corrigir um bug, **desfazer a correção e ver o teste falhar**.
Teste que passa dos dois jeitos não testa nada.

👁 **Atenção** — depende de disciplina a cada correção.

### Espera fixa em navegação

Verificando a F05 no deploy, usei `waitForTimeout(900)` entre cliques.
Explorar, Comunidades e Cabine pareceram todos cair no Início — ia reportar
como bug sério. Era a espera: na Vercel cada rota sobe do zero na primeira
visita.

*Como resolvi:* troquei por `waitForURL` e as seis áreas passaram.

**Regra:** `waitForURL` e `expect`, nunca espera por tempo. E antes de chamar
algo de bug no ambiente publicado, desconfiar do teste primeiro.

👁 **Atenção** — uma regra de lint contra `waitForTimeout` em `e2e/` viraria 🔒.

### Os 5 s padrão do Playwright em cima de uma operação lenta

Duas jornadas reprovaram com "esperava /boas-vindas, recebi /criar-conta".
Parece defeito de redirecionamento. Era lentidão: criar conta gasta segundos
no Supabase local, e a suíte inteira em série deixa o servidor pesado. O
botão ainda dizia "Criando…" na captura da falha.

*Por que passou:* o mesmo teste é verde quando roda sozinho. Só na suíte
completa a soma passa dos 5 s padrão — então a falha aparece em arquivos
diferentes a cada vez e parece aleatória.

*Como resolvi:* `cadastroConcluido()` em `e2e/apoio-tela.ts`, com espera
generosa, no lugar dos catorze `toHaveURL(/boas-vindas/)` espalhados. E no
caminho de guardar imagem, esperar o banco antes de olhar a tela, como já
fazia o teste vizinho.

**Regra:** operação que é lenta por natureza — cadastro, upload — não se
verifica com o tempo padrão. E a espera certa vira função, para o próximo
arquivo não voltar aos 5 s.

🔒 **Barrado** — o caminho curto agora é o certo; o padrão de 5 s saiu dos
arquivos.

### Corrida entre testes

As jornadas em paralelo falhavam, nunca as mesmas duas vezes. Persegui o
sintoma — afrouxei o limite de autenticação do Supabase — antes de achar a
causa: elas compartilham um banco, um servidor e um limite real.

*Como resolvi:* `playwright.config.ts` fixa `workers: 1`. Três execuções
seguidas, 42/42.

🔒 **Barrado** — a configuração não deixa rodar em paralelo.

### Teste disputando com outro teste

O teste de tokens varria `app/` enquanto o de fronteira escrevia arquivos
temporários lá. A contagem oscilava entre execuções.

*Como resolvi:* a varredura de tokens pula arquivos começados por ponto, que
é como os temporários são nomeados.

🔒 **Barrado** — os dois testes não se enxergam mais.

---

## 3. Português e produto

### "Faltam 1 comunidade"

Concordância errada na interface, pega por um teste.

*Como resolvi:* o texto conjuga conforme o número, e o teste cobre os dois.

**Regra:** singular e plural são casos diferentes, não um `${n} coisa(s)`.

👁 **Atenção** — vale para cada texto novo.

### Tirar o "s" não singulariza português

A RN04 ignora plural ao comparar nomes de comunidade. Minha primeira versão
transformava "Paisagens" em `paisagen`, que não bate com `paisagem` — justo o
caso que a regra existe para pegar.

*Como resolvi:* a singularização virou por palavra e cobre `-s`, `-ns/-m`,
`-res/-ses/-zes` e `-ais/-eis/-ois`, com teste para cada caso usando nomes de
comunidade de verdade.

🔒 **Barrado** para os casos cobertos; os irregulares ficam de fora de
propósito, e isso está escrito na migration.

### Limite que barra um nome real

Pus mínimo de 3 caracteres no `@`. Isso recusa "jo" — e **Jo Ramos está no
protótipo do Hub**.

*Como resolvi:* mínimo baixou para 2 caracteres.

**Regra:** antes de fixar um limite, procurar um caso real que ele barraria.
Os dados do protótipo são o primeiro lugar para procurar.

👁 **Atenção** — vale para cada limite novo.

### Citar número de feature de memória

Escrevi "chega na F05", "é da F09", "F19 traz os termos" em comentários e em
texto de tela. Cinco estavam errados.

*Como resolvi:* corrigi as cinco referências erradas.

**Regra:** conferir no backlog antes de citar. Comentário que aponta para o
lugar errado é pior do que comentário nenhum.

👁 **Atenção** — nada confere comentário.

### Ler o protótipo pelo texto do prompt

Na F05 liguei os ícones da navegação pelo que o prompt descrevia, sem conferir
no protótipo qual item acende em cada tela. A lupa abria `/busca` em vez de
Explorar, e Comunidades abria Explorar em vez de "minhas". Pior: a regra de
"qual ícone está aceso" comparava prefixo de URL, então `/comunidades/minhas`
acendia **dois** ícones ao mesmo tempo.

*Por que passou:* o teste da F05 conferia que o ícone certo estava aceso, e
estava. Nunca conferiu que os outros estavam apagados.

*Como resolvi:* troquei o prefixo por um mapa explícito de telas, com a mais
específica ganhando. O teste agora **conta** quantos ícones estão acesos e
exige exatamente um, em seis telas diferentes.

**Regra:** quando o protótipo mostra o estado, o protótipo decide — não a
descrição. E afirmação sobre destaque se testa contando, não conferindo um.

🔒 **Barrado** — `e2e/navegacao.spec.ts` falha se dois acenderem.

### Utilitário sem token some em silêncio

Pus um véu escuro sobre a capa da comunidade com `absolute inset-0`, para o
nome branco ter contraste sobre qualquer foto. O véu ficou com **0 × 0**: o
`inset-0` não existe neste projeto. `design/tokens.css` apaga a escala padrão
do Tailwind com `--spacing-*: initial` — é o que faz `p-7` não existir — e o
`inset-0` se resolve a partir da mesma base que foi apagada. O navegador
descarta a regra inválida e segue.

Resultado: texto branco sobre lavanda pura, 2,4:1. O próprio design system
diz que isso reprova.

*Por que passou:* build verde, lint verde, 346 testes verdes, snapshot verde —
o snapshot guarda o **HTML**, e o HTML estava certo. O que estava errado era o
CSS que nunca chegou a existir. Nenhuma das barreiras olha pixel.

*Como resolvi:* um token `space0`, porque o problema não era da capa — era de
qualquer `inset-0`, `gap-0` ou `w-0` do projeto. E um teste de jornada que
mede `getComputedStyle` de cinco utilitários de zero e exige `0px` em todos.

**Regra:** quando o design system apaga uma escala, ele apaga mais do que
pretendia. E classe de Tailwind é a única parte do código que erra sem avisar:
nome errado não quebra nada, só não faz nada. Olhar a tela não é conferência
extra — é a única conferência que existe para CSS.

🔒 **Barrado** — `e2e/design-system.spec.ts` mede os zeros no navegador.

---

### O mesmo seletor, o mesmo tropeço, duas features depois

Na F07 escrevi `getByRole("alert")` e o teste casou com **dois** elementos: o
meu aviso e o `role="alert"` vazio que o Next mantém na página para anunciar
troca de rota. Corrigi escopando ao formulário, e escrevi o comentário
explicando.

Na F08 escrevi exatamente o mesmo seletor errado, no mesmo tipo de tela.

*Por que passou:* a correção da F07 virou comentário no arquivo da F07.
Quando escrevi um arquivo de teste novo, o comentário não estava lá para ser
lido — e nada no caminho me lembrou.

*Como resolvi:* escopei ao formulário de novo. **Não virou barreira**, e é
disso que esta entrada serve de aviso: o Faustão só funciona se eu o
consultar antes de escrever teste, que é o que a própria página manda fazer.

👁 **Atenção** — e um lembrete de que esta página existe para ser lida, não
para ser escrita.

---

### Editar por busca de texto depois do formatador

Cinco vezes na F09 e na F10 eu troquei um trecho de código procurando pelo
texto exato — e o Prettier já tinha reordenado as classes do Tailwind ou
juntado as linhas. A troca **não casava e não reclamava**: o comando
terminava com sucesso, e eu seguia achando que a mudança estava feita.

Duas delas só apareceram muito depois: o avatar que não existia na tela, e a
linha "Seu tópico está em 1º" que o teste não achava.

*Por que passou:* substituição que não encontra o texto não é erro para a
ferramenta. É uma edição silenciosamente perdida.

*Como resolvi:* nos casos achados, reli o arquivo e editei pelo conteúdo
real. O hábito que fica: **conferir que a troca aconteceu** — um `grep` pelo
que deveria estar lá — em vez de confiar no silêncio.

**Regra:** editar por texto exato depois de um formatador é apostar que ele
não mexeu ali. Ou leio o arquivo antes, ou confiro depois.

👁 **Atenção** — nada avisa quando uma substituição não casa.

---

### Recarregar antes de o servidor confirmar, de novo

Terceira vez: o teste clica, a tela muda na hora pelo estado otimista, o
teste recarrega — e cancela a requisição que ainda estava indo. Aconteceu na
F06 com entrar na comunidade, na F07 com sair, e agora na F10 com o olho de
seguir.

*Por que passou:* passava **sozinho**. Só na suíte inteira, com o servidor
mais lento, a corrida aparecia. Um teste que depende da máquina estar
descansada não é um teste.

*Como resolvi:* esperar o banco confirmar antes de recarregar, como nas
outras duas vezes.

**Regra:** estado otimista e recarregar não convivem sem uma espera pelo
servidor. E "passa sozinho, falha na suíte" é sempre corrida — nunca azar.

*Aconteceu de novo na F11, a quarta vez.* Virou `esperarNoBanco()` em
`e2e/apoio-banco.ts`, e os três lugares que repetiam o truque à mão passaram
a usá-lo.

🔒 **Barrado** — o jeito certo virou função, como o `alerta()`.

---

### Campo ausente virando `null`

`updateProfile` montava o update com `bio: data.bio ?? null` e
`avatarUrl: data.avatarUrl ?? null`. Parece defensivo e é destrutivo: **campo
que não veio virava apagado**. Como a foto é enviada por um caminho
diferente do nome e da descrição, salvar o formulário de perfil apagaria a
foto — em silêncio.

Também descobri que o `@` simplesmente **não dava para editar**: não estava
no schema de validação, embora a tela 22 o mostre como campo.

*Por que passou:* a função existia desde a F02 e nunca tinha sido chamada
por uma tela. Código sem uso não é código testado — é código suposto.

*Como resolvi:* o update só toca no que veio; ausente quer dizer "não
mexer". E dois testes: um que salva nome sem mandar foto e exige a foto
intacta, outro que troca o `@`.

**Regra:** `?? null` num update não é defesa, é apagamento. Ausente e nulo
são coisas diferentes, e o código precisa dizer qual é qual.

🔒 **Barrado** — o teste salva sem foto e confere que ela ficou.

---

### Trocar o nome da tela e esquecer quem dependia dele

O protótipo chama a tela inicial de **"Hoje"**; eu tinha posto "Início", que
é o nome do item na barra de navegação. Corrigi na F11 — e o teste da F05
que esperava o título antigo quebrou, junto com cinco lugares que clicavam
no botão "Sair" que morava ali.

*Por que passou:* nada disso é erro até alguém rodar a suíte. Eu procurei os
usos com um padrão de busca e achei quatro dos cinco; o que escapou tinha o
texto escrito de outro jeito.

*Como resolvi:* a suíte achou o que faltou. É literalmente para isso que ela
existe.

**Regra:** mudar um texto que a tela mostra é mudar uma interface. Procurar
os usos é obrigatório, e **rodar a suíte inteira é o que confere**, não a
busca.

🔒 **Barrado** — as jornadas quebram quando o texto muda.

---

### Teste que confere o que a pessoa digitou, não o que foi publicado

Escrevi `getByText("minha resposta")` para conferir que a resposta apareceu
na tela. **Isso casa com o conteúdo da caixa de digitar**, não só com a
resposta publicada. O teste ficava verde com o texto ainda no campo, antes
de qualquer envio.

Resultado: quando o envio falhava, o teste passava assim mesmo. E, como o
texto fica no campo depois de uma recusa — correção que eu tinha acabado de
fazer, e que é certa —, o buraco ficou ainda maior.

*Por que passou:* porque o teste é o que deveria pegar, e ele estava medindo
a coisa errada. Só apareceu quando a CI rodou sem o serviço de arquivos: o
envio falhou de verdade, o teste de texto continuou verde, e quem reprovou
foi a asserção **seguinte**.

*Como resolvi:* `respostaPublicada()` em `e2e/apoio-tela.ts`, que procura
dentro do cartão de resposta. Só acha o que foi publicado.

**Regra:** asserção de tela precisa olhar o lugar onde a coisa aparece, não o
texto solto na página. "Está escrito em algum lugar" é fraco demais para
servir de prova.

🔒 **Barrado** — o jeito certo virou função, como o `alerta()`.

---

### A CI não tem o que a minha máquina tem

A F09 passou a enviar imagem. Local, tudo verde. Na CI, o teste de imagem
reprovou: o `supabase start` da CI subia com `-x storage-api`, ou seja,
**sem o serviço de arquivos**.

*Por que passou:* a exclusão estava lá desde o começo, para a CI subir mais
rápido, e nunca tinha feito falta — nenhuma feature usava arquivo. Eu
construí o envio inteiro sem olhar o que a CI liga.

*Como resolvi:* `storage-api` saiu da lista de exclusão, com o comentário
dizendo por que ele precisa subir. E o teste passou a conferir o banco
**antes** da tela, para a mensagem de falha dizer onde quebrou em vez de
"não achei a imagem".

**Regra:** feature que depende de um serviço novo exige olhar o que a CI
sobe. "Funciona na minha máquina" tem uma irmã mais discreta: "a minha
máquina liga tudo".

🔒 **Barrado** — a CI agora sobe o serviço, e o teste falha com motivo.

---

### Limpar o campo antes de o servidor aceitar

No campo de resposta, eu limpava o texto **no clique**. Parece mais rápido.
Só que quando o servidor recusa — uma imagem que não é imagem, por exemplo —
a pessoa perde o que escreveu exatamente na hora em que precisa dele de volta
para corrigir.

*Por que passou:* nenhum teste tentava um envio que falha. Todos testavam o
caminho feliz, de novo.

*Como resolvi:* a ação devolve um contador de envios aceitos, e a tela limpa
só quando esse número muda. E entrou um teste que recusa de propósito e exige
o texto ainda no campo.

**Regra:** estado otimista só vale para o que dá para desfazer. Limpar o que
a pessoa escreveu não dá.

🔒 **Barrado** — `e2e/respostas.spec.ts` recusa de propósito e confere o campo.

---

### Avatar invisível dentro de um link

O avatar da resposta sumiu da tela. A causa: o `<span>` ficou **dentro de um
`<a>`**, e elemento inline ignora largura e altura. Nenhum erro, nenhum
aviso, só um buraco onde devia ter uma bolinha.

*Por que passou:* o snapshot guarda o HTML, e o HTML estava certo. É o mesmo
tipo de cegueira do véu invisível da F07 — as barreiras não olham pixel.

*Como resolvi:* `block` no span, com o comentário dizendo por que ele não é
enfeite.

**Regra:** a mesma da F07, e ela continua valendo: só olhando a tela.

👁 **Atenção** — nada confere layout.

---

### O mesmo erro de teste, três features seguidas

`getByRole("alert")` casa também com o `<div role="alert">` vazio que o Next
mantém para anunciar troca de rota. Caí nisso na F07, na F08 e na F09.

*Por que passou:* nas duas primeiras vezes eu corrigi **com um comentário no
arquivo**. Quando escrevi o arquivo de teste seguinte, o comentário não
estava lá para ser lido.

*Como resolvi:* virou `alerta()` em `e2e/apoio-tela.ts`, usado por todos os
arquivos. Agora o jeito certo é o mais curto de escrever, que é a única forma
de correção que sobrevive ao esquecimento.

**Regra:** comentário conserta o arquivo; função conserta o hábito. Erro que
se repete merece código, não prosa.

🔒 **Barrado** — o jeito errado deixou de ser o caminho natural.

---

### Mostrar a mesma frase duas vezes

A descrição da comunidade aparecia no painel da direita **e** no meio da tela.
O protótipo manda, com todas as letras, que na web ela fica no painel.

*Por que passou:* implementei o painel e o conteúdo em arquivos diferentes,
em momentos diferentes, e nunca olhei os dois juntos. Nenhum teste reclama de
informação repetida — ela não é erro para o computador.

*Como resolvi:* tirei do conteúdo, com um comentário dizendo que no celular
(F21) ela volta.

**Regra:** quando a tela tem duas regiões, conferir as duas na mesma captura,
não uma de cada vez.

👁 **Atenção** — nada confere repetição.

---

### Testar o caminho da imagem com uma imagem de brinquedo

Enviar **qualquer** foto em produção dava erro 500. A causa: Server Action no
Next tem limite de corpo de **1 MB** por padrão, e o produto prometia 5 MB.
Toda foto de celular era cortada no caminho, antes de chegar na conferência de
bytes — e o erro que a pessoa via não dizia nada.

*Por que passou:* os testes de imagem usam JPEGs montados à mão, de algumas
dezenas de bytes. Eles provam que a localização sai da foto e que arquivo
disfarçado é recusado — e **nenhum deles chega perto do limite**. Vinte e
três testes verdes sobre um caminho que não funcionava para nenhum arquivo
real.

*Como resolvi:* `bodySizeLimit` de 4,5 MB no `next.config.ts` (o teto da
plataforma onde o Hub roda), limite do produto baixado para 4 MB, conferência
no navegador para dar mensagem clara em vez de 500, e um teste que trava o
número em 4 MB ou menos.

**Regra:** teste com arquivo de brinquedo prova a regra, não o caminho. Quando
o que entra é arquivo de gente, o tamanho de verdade é parte do teste.

🔒 **Barrado** — `lib/midia/imagem.test.ts` falha se o limite do produto
subir acima do que a plataforma aceita receber.

---

## 4. Ambiente e operação

### "Funciona na minha máquina" com IPv6

Configurei `DIRECT_URL` com a conexão direta do Supabase. Funcionava aqui e
falhava no build da Vercel: a conexão direta só responde em **IPv6**, e o
ambiente de build é IPv4.

*Como resolvi:* `DIRECT_URL` passou a ser o pooler de sessão, e o
`.env.example` explica por quê.

**Regra:** conexão de banco para ambiente remoto é o pooler de sessão. E
diferença entre minha máquina e o build é suspeita número um quando algo só
quebra lá.

👁 **Atenção** — documentado, não impedido.

### Senha com caractere especial quebra a URL

`#`, `/`, `:` e `?` têm significado dentro de um endereço. A senha crua
cortava a URL e o Prisma respondia "scheme is not recognized", que não diz
nada sobre a causa.

*Como resolvi:* `npm run db:deploy:remoto` e `npm run conteudo:inicial` pedem
a senha com digitação oculta e codificam sozinhos.

🔒 **Barrado** no caminho das ferramentas. 👁 para SQL escrito à mão.

### Chave parecida com segredo dentro do repositório

Chumbei a chave do Supabase local no arquivo da CI. O GitHub bloqueou o push —
com razão, mesmo o valor sendo público e idêntico em toda máquina.

*Como resolvi:* a CI lê as chaves do `supabase status` depois de subir.

🔒 **Barrado** — a proteção de push do GitHub recusa segredo no repositório.

### `INSERT` cru esquecendo `updated_at`

`@updatedAt` do Prisma é preenchido pelo cliente, então a coluna é `NOT NULL`
sem valor padrão. Todo SQL escrito à mão esbarra nisso.

*Como resolvi:* os scripts escrevem a coluna.

**Regra:** `INSERT` fora do Prisma escreve `updated_at`.

👁 **Atenção** — um valor padrão no banco viraria 🔒.

### Apagar a branch base fechou o PR dependente

Mergeei a F00 com `--delete-branch`. O PR da F01 apontava para aquela branch e
o GitHub **fechou** o PR em vez de reapontar.

*Como resolvi:* restaurei a branch, reabri o PR, reapontei para a `main` e só
então apaguei.

**Regra:** com PRs encadeados, reapontar a base antes de apagar a branch.

👁 **Atenção**.

### Deixar o ambiente mexer no repositório

`vercel env pull` acrescentou `.env*` ao fim do `.gitignore`, o que anularia a
exceção do `.env.example`.

*Como resolvi:* reverti a linha antes de commitar.

**Regra:** depois de rodar ferramenta de terceiro, olhar `git status`.

👁 **Atenção**.

---

## 5. Limites de camada

### Componente de cliente puxando o banco

Uma constante compartilhada entre a tela e `lib/data/` foi parar num reexport.
O componente de cliente importou, e isso arrastou o Prisma e o `pg` para o
pacote do navegador. O erro foi `Can't resolve 'dns'`, que não diz nada.

*Como resolvi:* a constante foi para `features/<nome>/shared.ts`, e
`lib/data/` importa de lá.

**Regra:** valor compartilhado entre tela e camada de dados mora em
`features/<nome>/shared.ts`. A camada de dados importa de lá, nunca o
contrário.

🔒 **Barrado** na prática — o build quebra. 👁 na clareza: o erro é
`Can't resolve 'dns'`, que não diz nada sobre a causa.

### Constante exportada em arquivo `"use server"`

Num arquivo de Server Actions, **todo export precisa ser função assíncrona**.
Uma constante exportada apaga os exports do módulo inteiro, e o erro do Next
não menciona isso.

*Como resolvi:* constantes e tipos saíram para `shared.ts`.

**Regra:** só actions em `actions.ts`. Constante e tipo vão para `shared.ts`.

🔒 **Barrado** — o build falha. 👁 na clareza: a mensagem do Next não menciona
a causa.

### Edição que não aplicou, e eu nem olhei

Troquei texto num arquivo com um `replace` que não bateu com o conteúdo real.
Segui adiante achando que tinha mudado; quem avisou foi o compilador, dois
passos depois.

*Como resolvi:* passei a conferir com `grep` depois de cada substituição.

**Regra:** edição por substituição de texto se confirma lendo o resultado, não
se presume.

👁 **Atenção**.

---

## 6. Trabalhar gastando menos

Phelipp pediu, em 11 de outubro de 2026, que eu olhasse onde desperdiço
esforço — e que o registro ficasse aqui, junto dos erros, porque é a mesma
natureza: coisa que se repete por falta de hábito.

Estas práticas valem **a partir de agora**. Nenhuma delas corta verificação;
todas cortam repetição.

### 1. Editar com a ferramenta que falha alto

**O maior desperdício da sessão.** Eu trocava trechos de código procurando
texto exato com um script. Quando o formatador já tinha reordenado as
classes ou juntado as linhas, a troca **não casava e não reclamava** — e eu
seguia achando que a mudança estava feita. Aconteceu pelo menos cinco vezes
na F09, F10 e F11, e duas delas só apareceram muito depois: o avatar
invisível e a linha do ciclo que o teste não achava.

Cada uma custou reler o arquivo, refazer a edição e rodar o portão de novo.

**Prática:** usar a ferramenta de edição que **recusa** quando o texto não
bate, em vez de um script que silencia. Quando for script mesmo, conferir
com um `grep` pelo que deveria estar lá — nunca confiar no silêncio.

### 2. O teste mais estreito que pode falhar

A suíte de jornadas leva de 5 a 9 minutos. Eu a rodei inteira depois de
quase toda mudança, inclusive mudanças que só podiam afetar um arquivo.

**Prática:** rodar **o arquivo de teste afetado** enquanto desenvolvo, e a
suíte inteira **uma vez**, antes do PR. A suíte completa existe para pegar o
que eu não previ — e para isso ela só precisa rodar quando acho que acabei.

### 3. Uma passada de olho por feature, não uma por correção

Abrir a tela é o que achou o véu invisível da F07, o avatar da F09 e a
duplicação da F11 — não abro mão disso. Mas eu capturava e reolhava a tela
**depois de cada ajuste**, e imagem é cara.

**Prática:** juntar os ajustes suspeitos, aplicar todos, e **então** olhar.
Uma captura por tela, por feature. Reolhar só quando a correção foi
justamente no que estava errado na imagem.

### 4. Perguntar ao banco, não construir uma sonda

Várias vezes escrevi um arquivo de teste temporário só para descobrir um
estado — e isso custa escrever, rodar, ler e apagar. Na maioria dos casos a
resposta estava a uma consulta de distância, ou num `--list` do Playwright.

**Prática:** antes de montar sonda, perguntar se uma consulta ao banco ou um
comando de listagem responde. Sonda é para comportamento de navegador, não
para "o que tem na tabela".

### 5. Conferir a branch antes de commitar

Commitei na branch errada e precisei desfazer com cherry-pick e três
merges. O comando que teria evitado custa nada.

**Prática:** `git branch --show-current` antes de qualquer commit numa pilha
de PRs.

### 6. Ler o erro inteiro antes da primeira hipótese

Em mais de um caso eu formulei uma teoria e fui testá-la, quando a mensagem
de erro já dizia a resposta — o "strict mode violation" listava os dois
elementos que casaram, e eu só li a primeira linha.

**Prática:** ler a mensagem até o fim antes de mexer em qualquer coisa. Ela
quase sempre nomeia a causa.

---

## 7. Placar

Dos erros registrados, os que **não podem voltar** são os que ganharam
barreira: migrations no deploy, jornadas em série, plural do português,
segredo no repositório, corrida entre testes, um ícone aceso por tela, os
utilitários de zero, e os dois limites de camada que o build recusa.

O resto é 👁 — protegido só por esta página. **Cada um desses é uma dívida**, e
a pergunta a fazer em cada revisão é: dá para virar teste?

## 8. O padrão por trás

Olhando a lista, quase tudo cai em três hábitos:

1. **Confiar num sinal verde em vez de olhar a coisa.** Build, teste, deploy —
   todos medem *alguma* coisa, nunca a coisa toda.
2. **Testar o caminho que eu tinha em mente.** O bug mora no caminho que eu
   não imaginei: o outro botão, o nome curto, a palavra no plural.
3. **Tratar minha máquina como o mundo.** IPv6, migration já aplicada,
   servidor já aquecido, serviço de arquivos ligado, chave do GIPHY no
   ambiente — tudo que é verdade aqui e não é lá.

E um quarto, que não é de produto e sim de ofício:

4. **Confiar no silêncio.** Substituição que não casa, teste que passa
   olhando o lugar errado, comando que termina sem fazer nada. Quase todo
   desperdício desta sessão começou com uma ferramenta que não reclamou — e
   a defesa é escolher ferramentas que reclamam, não prestar mais atenção.
