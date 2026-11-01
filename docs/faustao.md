# Faustão

> ERROU!

Erros que eu já cometi neste projeto, e a regra que cada um deixou. Existe
para eu não repetir — e para quem vier depois não tropeçar no mesmo lugar.

**Como usar:** antes de dizer que algo está pronto, passe os olhos na seção 1.
Ao escrever teste, na 2. Ao mexer em ambiente ou banco, na 4.

Aqui são os erros **de código**. Os erros de **produto e de negócio** — ordem
de feature errada, regra escrita de um jeito e implementada de outro, escopo
pela metade — moram em [vacilos.md](vacilos.md).

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

### "Vinte horas atrás" não é ontem depois das 20h

Duas jornadas do Hot Topic reprovaram na CI — num PR que **só mexia em
documento**. O ciclo não elegia destaque nenhum, e a comunidade aparecia sem
Hot Topic.

A causa é aritmética. O ajudante do teste punha respostas em
`now() - interval '20 hours'` e mandava virar o ciclo de
`hub_cycle_date(now() - interval '20 hours')`. Vinte horas atrás só é **ontem**
quando a hora local é menor que 20. O fuso do ciclo é Brasília; a CI rodou às
23h01 UTC, que são **20h01 em Brasília** — um minuto depois da fronteira.
Passada ela, "ontem" virou hoje, `hub_virar_ciclo` gravou o vencedor em
`dia + 1` (amanhã), e a tela, que procura hoje, não achou nada.

*Por que passou:* a suíte inteira é verde das 00h às 20h. A janela de falha é
de quatro horas por dia, e nenhuma das execuções anteriores caiu nela. Um
teste que depende da hora não parece frágil — parece instável, que é pior,
porque convida a rodar de novo em vez de investigar.

*Como resolvi:* ancorar no **dia do ciclo**, não numa diferença de horas:
`((hub_cycle_date(now()) - 1) + time '12:00') AT TIME ZONE
hub_cycle_timezone()` para o instante, e `hub_cycle_date(now()) - 1` para o
dia. Meio-dia de ontem é ontem a qualquer hora. Corrigido nos dois arquivos
que tinham o padrão, `e2e/ciclo.spec.ts` e `e2e/inicio.spec.ts`.

**Regra:** data em teste se ancora no dia, nunca numa subtração de horas.
Toda vez que aparecer `now() - interval 'N hours'` com intenção de "ontem",
pergunte o que acontece quando a hora local passa de N.

🔒 **Barrado** — o padrão saiu dos dois arquivos; nenhum teste do ciclo usa
mais diferença de horas para dizer "ontem".

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

**Repetiu na rodada de acabamento.** Troquei o filtro de um teste logo depois
de rodar o Prettier, sem `assert`: ele tinha juntado as linhas, a troca não
casou, e eu passei uma rodada inteira de 3 minutos analisando a falha de um
conserto que nunca entrou no arquivo. O hábito que fecha isso é mecânico —
**toda substituição por texto leva `assert` ou `grep` depois**, e um script
que troca vários trechos só grava o arquivo se todos casarem. Quando um
deles falhou no meio, o script abortou antes de gravar e desfez em silêncio
as trocas anteriores: foi a segunda rodada perdida pelo mesmo motivo.

---

### "A mensagem não chegou pelo Realtime" era um envio que nunca aconteceu

A jornada do tempo real reprovava com a frase mais clara possível — "a
mensagem não chegou pelo Realtime" — e o Realtime estava inteiro. O banco
não tinha a linha: **a mensagem nunca foi enviada**. O teste clicava em
Enviar na aba que envia **antes de ela hidratar**, e um clique em formulário
de cliente não hidratado não faz nada.

A aba errada estava sendo esperada: o teste aguardava o botão aparecer na
aba que **recebe**, que é a que ele queria observar.

*Por que passou tanto tempo:* a mensagem de erro era convincente e apontava
para o suspeito certo de outras vezes — a CSP, a publicação, o reinício do
serviço. Passei por todos antes de perguntar ao banco se a linha existia.

*Como resolvi:* esperar o botão **na aba que envia**. E a lição de
diagnóstico: quando um teste diz "não chegou", a primeira pergunta é se
chegou a sair — uma consulta ao banco responde em dez segundos e teria
poupado meia hora.

🔒 **Barrado** — a espera está no teste, e o mesmo cuidado entrou na jornada
nova da Cabine.

---

### Esperar um endereço que o próprio formulário já satisfaz

Num teste novo, depois de criar o tópico, esperei "qualquer endereço dentro
da comunidade". Só que o formulário de criar vive em `/c/<slug>/novo`, que
também começa assim: a espera terminava **no mesmo instante**, ainda no
formulário, e o teste seguia com o endereço errado na mão. O sintoma era
"o campo de resposta não existe", que parece defeito da tela do tópico.

*Como resolvi:* esperar o endereço exato do tópico, montado a partir do nome
que o teste escolheu.

**Regra:** espera de navegação tem de ser falsa antes de ser verdadeira. Se
a condição já vale quando a espera começa, ela não está esperando nada.

👁 **Atenção** — vale para todo `waitForURL` com prefixo.

---

### Confirmar um envio com o texto que ainda está na caixa

Confirmei "a mensagem foi enviada" com `getByText(texto)` — e `getByText`
casa com o conteúdo de um `<textarea>`. O envio tinha falhado, o texto
continuava no campo, e o teste ficou verde.

É exatamente o erro que o `respostaPublicada()` existe para evitar desde a
F09 — e eu não usei o remédio na Cabine, porque ele estava escrito para
respostas.

*Como resolvi:* a confirmação passou a ser o **campo esvaziar**, que só
acontece quando o servidor aceita.

**Regra:** nunca confirme uma escrita pelo texto que a pessoa digitou.
Confirme por algo que só o servidor produz — o campo limpo, a linha nova, o
endereço que mudou.

👁 **Atenção** — o `respostaPublicada()` cobre as respostas; na Cabine é
cuidado de quem escreve o teste.

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

### `loading.tsx` transformou 404 em 200

Pus `loading.tsx` em onze rotas para a navegação parar de parecer parada. Em
quatro delas, o endereço de uma coisa que não existe **deixou de responder
404** e passou a responder 200 com a tela de não encontrado.

`loading.tsx` abre um limite de Suspense, e o Next começa a transmitir a
resposta antes de a página rodar. Quando a página chama `notFound()`, o
cabeçalho já foi enviado — e cabeçalho enviado não volta atrás. Para quem
olha a tela não muda nada; para um buscador, um verificador de link ou um
teste, o Hub passou a dizer que toda URL existe.

*Por que passou:* lint, tipos, 498 testes de unidade e o build de produção
passaram. Era invisível na tela, e eu não consegui rodar as jornadas na
máquina — o Docker estava parado. Quem pegou foi a jornada "tópico que não
existe não quebra a tela", na CI, que confere o **status** e não o desenho.

*Como resolvi:* tirei o `loading.tsx` das quatro rotas que chamam
`notFound()` — comunidade, tópico, perfil de outra pessoa e Universo — e
escrevi a exceção no CLAUDE.md junto da regra. Para dar sinal nelas sem
perder o 404, o caminho é conferir a existência na página e envolver só os
pedaços lentos em `<Suspense>`, depois da conferência. Ficou anotado.

**Regra:** melhoria de percepção também muda o protocolo. Antes de abrir um
limite de Suspense numa rota, pergunte o que ela responde quando o que foi
pedido não existe.

🔒 **Barrado** — a jornada do 404 já existia e foi ela que pegou; a exceção
está escrita ao lado da regra que a causa.

### A foto de perfil só funcionava na página do perfil

Da F02 à F12, a foto de uma pessoa aparecia na página dela e **em nenhum
outro lugar**: nem na resposta, nem no autor do tópico, nem na busca de
pessoas, nem na lista de quem eu sigo. Quem descobriu foi o PO, usando o Hub
em produção.

O depósito é privado, então `profiles.avatar_url` guarda o **caminho**
(`perfis/x.jpg`) e quem desenha precisa pedir uma URL assinada. Só
`perfilNaTela` pedia. As outras seis consultas entregavam o caminho cru, e o
navegador procurava o arquivo ao lado da página: 404, e nada desenhado.

*Por que passou:* não há erro. Um `background-image` que não resolve é
silêncio — sem aviso no console do servidor, sem teste vermelho, sem nada no
build. E a causa não era distração: **a assinatura morava em cada chamador**,
então toda consulta nova podia esquecer, e o acerto dependia de lembrar. A
mesma forma do véu invisível da F07 e do avatar dentro do link: só olhando a
tela.

*Como resolvi:* `comAvatar()` e `comAvatares()` em `lib/midia/deposito.ts`,
aplicados nas sete consultas que devolvem gente. E
`lib/data/avatares.db.test.ts`, que chama cada uma delas com uma foto gravada
e reprova se o que sai parecer caminho de depósito.

**Regra:** quando o acerto depende de cada chamador lembrar, o erro não é do
chamador — é de onde a regra mora. Transformação obrigatória vira função, e
a lista de quem precisa dela vira teste.

🔒 **Barrado** — `avatares.db.test.ts` varre as consultas que devolvem
pessoas. Consulta nova entra na lista; se esquecer de assinar, reprova.

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

### Mídia esticada por mover para dentro de um flex

Com a mídia dentro do cartão da resposta, todo GIF e toda imagem passaram a
ser espichados até a largura do cartão: um GIF de 480 px era desenhado com
1070 px. A causa é uma linha que eu nem toquei — o cartão é `flex flex-col`, e
item de flex em coluna **estica na largura** por padrão.

*Por que passou:* `w-auto` estava lá e não serve de nada em flex. O snapshot
guarda o HTML, e o HTML estava certo; a suíte inteira passou verde, e quem viu
foi o PO, em produção. É a mesma cegueira do véu invisível da F07 e do avatar
dentro do link: **nenhuma barreira olha pixel.**

*Como resolvi:* `self-start` num embrulho dentro do próprio cartão, para
valer para qualquer chamador, e a jornada do GIF passou a **medir** o
desenhado contra o natural (`clientWidth` contra `naturalWidth`). Conferi que
o teste reprova sem a correção: 480 esperado, 1070 recebido.

**Regra:** mover elemento para dentro de um contêiner é mudar o layout dele,
mesmo sem tocar na classe. E layout só se garante medindo — se o teste não lê
um número da tela, ele não está olhando.

🔒 **Barrado** — `e2e/respostas.spec.ts` compara a largura desenhada com a
natural do GIF.

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

### `prod.env` escapou do `.gitignore` e foi para o repositório

Puxei as variáveis de produção da Vercel para um arquivo e o destino saiu
errado: em vez da pasta temporária, `prod.env` foi criado na raiz do projeto.
Um `git add -A` depois, ele entrou no commit do PR #39 e está no histórico de
`main`.

*Por que passou:* o `.gitignore` tinha `.env` e `.env.*`. Nenhum dos dois casa
`prod.env` — o padrão cobre `.env.algo`, não `algo.env`. E a proteção de push
do GitHub não barrou porque **não há segredo dentro**: a CLI da Vercel recusou
exportar os 11 valores marcados como Secret e escreveu `[SENSITIVE]` no lugar.
Sobraram as variáveis de configuração, que são as `NEXT_PUBLIC_*` — públicas
por desenho, já servidas no pacote do navegador.

Ou seja: duas barreiras existiam e as duas tinham razão de não disparar. O que
falhou foi o padrão do `.gitignore` ser mais estreito do que a regra que ele
pretende valer ("nenhum valor real no repositório").

*Como resolvi:* `git rm --cached`, `*.env` acrescentado ao `.gitignore`, e
conferido com `git check-ignore` que agora ele é barrado. **Não reescrevi o
histórico**: sem segredo dentro, reescrever `main` custaria mais do que
resolve. Se um valor sensível aparecer na conferência, a conta muda.

**Regra:** padrão de `.gitignore` tem de cobrir a regra inteira, não o nome que
a gente costuma usar. E arquivo gerado por ferramenta vai para a pasta
temporária com **caminho absoluto** — caminho relativo depende do diretório
atual, que muda sem avisar.

🔒 **Barrado** — `*.env` cobre qualquer arquivo que termine em `.env`,
conferido com `git check-ignore`.

### Chave parecida com segredo dentro do repositório

Chumbei a chave do Supabase local no arquivo da CI. O GitHub bloqueou o push —
com razão, mesmo o valor sendo público e idêntico em toda máquina.

*Como resolvi:* a CI lê as chaves do `supabase status` depois de subir.

🔒 **Barrado** — a proteção de push do GitHub recusa segredo no repositório.

### Editar migration que já rodou

Precisei de uma coluna nova e acrescentei o `ALTER TABLE` no fim da
migration que eu tinha escrito dez minutos antes. `npm run db:deploy`
respondeu **"No pending migrations to apply"** e seguiu em frente: o Prisma
controla migration por **pasta**, não por conteúdo, então um arquivo já
aplicado é ignorado para sempre.

*Por que passou:* `typecheck` ficou verde, porque ele lê o `schema.prisma`,
não o banco. O código compilava falando de uma coluna que não existia. Só
um teste de banco pegaria — e eu ainda não tinha escrito o dessa parte.

*Como resolvi:* migration nova, e conferência direta no
`information_schema` para ver a coluna existindo de verdade, em vez de
confiar no "aplicadas com sucesso".

**Regra:** migration aplicada é imutável. Precisou de mais? Pasta nova. E
depois de mexer no banco, pergunte **ao banco** se a mudança está lá — o
schema é a intenção, não o fato.

👁 **Atenção** — nada compara o schema com o banco. Um `prisma migrate diff`
na CI viraria 🔒.

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

### A CSP bloqueou o Realtime, e o sintoma foi "a mensagem não chega"

A conversa da Cabine assinava o Supabase e **nada acontecia**. A assinatura
não dava erro; a mensagem simplesmente não aparecia do outro lado.

A causa estava a três camadas de distância: a Content Security Policy
liberava `wss://*.supabase.co`, e o Supabase local é `ws://127.0.0.1:54321`.
O navegador recusava a conexão, e o que sobrava era um canal com estado
`CHANNEL_ERROR: transport failure` — dentro do console, que ninguém olha.

*Por que passou:* lint, tipos, build, 493 testes de unidade e 258 de banco,
todos verdes. O RLS estava certo, a publicação estava certa, o código do
cliente estava certo. **Nada no servidor sabe que o navegador recusou uma
conexão.** Só a jornada que mede o tempo real pega isso, e só se ela existir
antes.

*Como resolvi:* a CSP passou a derivar as origens do
`NEXT_PUBLIC_SUPABASE_URL` configurado, `https` e `wss` da mesma origem. De
quebra ficou mais estreita em produção: antes liberava **qualquer** projeto
Supabase, agora só o nosso.

Depois disso o canal conectava e o evento ainda não chegava: o serviço de
Realtime monta a replicação ao subir e **não revê a publicação sozinho**. A
tabela tinha entrado nela depois. Reiniciar o container resolveu aqui — e a
CI reprovou pelo mesmo motivo, porque lá o Supabase sobe antes das
migrations. O reinício entrou no preparo das jornadas
(`e2e/global-setup.ts`), que vale para a CI e para quem roda na máquina — e
não num passo do workflow, que é o mesmo caso com um lugar a mais para
esquecer.

**Em produção isto importa na primeira vez.** O projeto Supabase já está de
pé quando a migration roda; se a Cabine não entregar mensagem depois do
deploy, é este o motivo, e a saída é reiniciar o Realtime no painel ou
habilitar a tabela ali.

**Regra:** quando o navegador fala direto com outro serviço, a CSP é parte
do caminho e precisa ser conferida junto. E recusa de CSP é silenciosa para
o servidor: o teste que a pega é o que exercita o caminho inteiro, no
navegador.

🔒 **Barrado** — a jornada "a mensagem chega na outra aba sem recarregar"
reprova sem a assinatura. Conferido nos dois sentidos.

### Consertar instabilidade criando instabilidade

Para a CI enxergar a publicação nova, pus um reinício do Realtime no preparo
das jornadas. Resolveu um problema e criou outro: **reiniciar a cada
execução** deixou a jornada passando ou reprovando conforme a sorte, porque
a replicação leva alguns segundos para subir depois que o container se diz
saudável.

*Por que passou:* as três execuções seguidas que eu usei como prova
aconteceram **antes** de eu acrescentar o reinício. Confirmei a correção
contra um estado que a própria correção mudou.

*Como resolvi:* reiniciar **só quando precisa**, e esperar a condição certa
— o slot de replicação existir e estar ativo, que dá para perguntar ao
banco — em vez do "healthy" do container, que vem antes.

**Regra:** quando a correção mexe no ambiente, a prova tem de ser refeita
**depois** dela. E "o serviço está de pé" quase nunca é a mesma coisa que
"o serviço está pronto": procure a condição observável que importa.

🔒 **Barrado** — o preparo espera o slot, e a jornada foi conferida três
vezes seguidas depois da mudança.

### A fresta entre abrir a tela e assinar o canal

A jornada do tempo real passava e reprovava sem padrão. A causa não era o
teste: entre a tela abrir e o canal conectar existe uma fresta — ler a
sessão do cookie e subir o WebSocket leva tempo — e **mensagem enviada
nessa fresta não é reenviada**. O Realtime entrega o que acontece depois da
assinatura; o que passou sumia até alguém recarregar a página.

*Por que passou:* na máquina, abrir e mandar leva mais tempo do que assinar,
então quase sempre funciona. É o tipo de defeito que aparece como "teste
instável" e tenta ser resolvido afrouxando o tempo de espera — o que teria
escondido um buraco real para quem usa.

*Como resolvi:* ao chegar em `SUBSCRIBED`, a tela busca de novo o que o
servidor tem. Fecha a fresta, e de quebra traz a imagem assinada e o autor
resolvido, que o evento cru não carrega.

**Regra:** teste que oscila é hipótese de defeito, não de teste. Antes de
mexer no tempo de espera, perguntar o que acontece com quem usa quando a
máquina está mais lenta que a do teste.

🔒 **Barrado** — a jornada roda em duas abas e foi conferida três vezes
seguidas; sem a busca ao assinar, ela volta a oscilar.

### Gravar cookie durante a renderização

A tela de convite precisava guardar qual tópico trouxe a pessoa, e eu chamei
`guardarConvite()` dentro da página. O App Router não permite: cookie se
grava em Server Action, Route Handler ou proxy — nunca ao renderizar.

O sintoma não ajudou. A página devolveu **"This page couldn't load. A server
error occurred"**, sem dizer o que, enquanto a página da comunidade, que não
grava nada, funcionava ao lado. Por um momento pareceu problema do layout
novo.

*Como resolvi:* quem grava é o proxy, que roda antes de renderizar e já está
decidindo sobre sessão. De quebra o cookie passou a guardar o **caminho** em
vez do id, e o fim do onboarding devolve a pessoa ao endereço exato que ela
abriu.

**Regra:** escrita de cookie é efeito, e efeito não acontece em renderização.
Quando a mesma página funciona num caso e quebra no outro, comece pela
diferença entre os dois caminhos, não pela mudança mais recente.

🔒 **Barrado** — a jornada do convite abre o link sem conta; sem o cookie no
proxy, ela reprova no retorno ao tópico.

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

### 0. O método de entrega, pedido em 1º de novembro de 2026

Phelipp fixou como todo pedido passa a ser organizado. Vale para feature,
bug, adição e correção — qualquer coisa que ele mande.

**Todo pedido é separado em blocos.** Cada bloco tem **critério de aceite
claro**, e o plano termina com os critérios juntos, para ele aprovar. Ele
aprova os critérios, não só o plano.

**O que agrupa um bloco**, nesta ordem de peso:

1. **A mesma jornada de quem usa.** Dois ajustes que a pessoa encontra no
   mesmo caminho vão juntos, porque se verificam na mesma passada.
2. **Facilidade de implementar.** O que é barato sai primeiro e cedo, e o
   caro não fica refém do barato.
3. **Os mesmos arquivos.** Dois blocos que editam o mesmo arquivo viram um,
   senão o segundo nasce em conflito com o primeiro.
4. **Código vizinho.** Mesma camada, mesma regra, mesmo componente.

**Como o critério de aceite é escrito.** Falsificável, e com **o como
conferir ao lado**. "A capa fica bonita" não é critério. "Com o menu aberto,
o último item cabe na janela — jornada em 800 px" é.

> Esta regra nasceu de um erro desta mesma sessão, e é a razão dela. Eu
> escrevi "quatro prints, um defeito de layout na coluna da direita" como
> **causa**, em quatro lugares, e a medida depois derrubou. Se eu tivesse
> escrito aquilo como **critério** — "nenhum botão passa da borda da janela
> em 800 px" —, a frase já me obrigaria a dizer como medir, e eu teria
> medido antes de escrever. Critério de aceite é causa obrigada a se expor.

**Quando ler este arquivo.** Phelipp sugeriu a cada três rodadas, e isso
resolve o problema real: ele tem 1800 linhas e ler inteiro a cada vez é
caro. Então a divisão é esta, e ela importa:

| Onde | O quê | Quando é lido |
| --- | --- | --- |
| `CLAUDE.md` | As **regras** de método, curtas | Toda sessão, sempre |
| Este arquivo | Os **erros**, com a história de cada um | Antes de dizer que algo está pronto, e inteiro a cada três rodadas |

Regra de método que more **só** aqui não é seguida, porque não é lida. Por
isso o método acima está resumido no `CLAUDE.md` também — aqui fica a razão,
lá fica a regra.

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

Phelipp pediu de novo em 15 de outubro, depois da rodada de acabamento: achar
mais jeito de gastar menos **para sobrar orçamento para construir**. Estas
cinco são o que aquela rodada cobrou caro.

### 7. A suíte inteira roda na CI, não aqui e lá

Rodei as jornadas completas na máquina (9 a 12 minutos) e a CI rodou as
mesmas logo depois. **Duas execuções para um sinal só**, mais a saída longa de
cada uma para ler.

**Prática:** durante o trabalho, só o arquivo de teste afetado. O portão é a
**CI** — rodar a suíte inteira localmente só quando a CI não puder decidir,
como numa jornada que dependa de serviço que ela não tem.

### 8. Conferir o ambiente antes de abrir a rodada, não no meio

O Docker estava parado e eu só descobri **depois** de implementar. Foram para
a CI duas regressões que um `test:db` local teria pego na hora: o 404 virando
200 e o nome do botão de imagem. Custou dois ciclos de CI de 9 minutos, mais
a correção, mais um terceiro ciclo.

**Prática:** `docker info` antes de começar qualquer trabalho que precise de
banco. Custa um segundo, e se estiver parado eu aviso **antes**, não depois.

### 9. Log de CI se lê filtrado

Saída de CI tem milhares de linhas e a parte que importa são duas.

**Prática:** `gh run view --log-failed | grep -E "✘|Error:"`, e
`gh run view --json jobs --jq '...conclusion=="failure"'` para saber qual
passo caiu. Nunca despejar o arquivo inteiro.

### 10. Ambiguidade se resolve no plano, não no código

A troca das marcas de nível foi pedida, planejada, orçada — e cancelada. Saiu
barato **porque ainda era texto**. Se eu tivesse implementado antes de
confirmar, teria custado o código e o desfazimento.

**Prática:** toda leitura dupla que eu perceber vira pergunta **antes** de
existir código. Pergunta no plano custa uma frase; no código, custa a feature.

### 11. Provar a correção uma vez, com o teste estreito

Reverter o conserto do GIF e ver o teste reprovar — 480 esperado, 1070
recebido — custou 20 segundos e deu certeza de que o teste guarda alguma
coisa. Vale manter, e é diferente de rodar a suíte: é **um arquivo**, duas
vezes.

**Prática:** quando escrever um teste para um defeito, rodar o arquivo com e
sem a correção. Nunca a suíte.

### 12bis. Mudou rótulo de tela? Os testes entram por ele

A F12.1 estourou o limite de 20 minutos da CI, e o relatório não disse qual
teste travou — ele nem chegou a terminar. Eram **duas** mudanças minhas de
tela, cada uma repetida em muitos arquivos de jornada:

- o grupo do onboarding deixou de se chamar "Comunidades de &lt;Universo&gt;" e
  passou a ser "Comunidades". **Dez** arquivos entravam no app por ali
- o formulário de criar comunidade perdeu o campo Universo. **Seis** arquivos
  ainda o escolhiam

Cada clique ficava esperando um elemento que não existia mais, 30 segundos
por vez. Somados, mais de vinte minutos.

**Prática:** ao mudar rótulo, `aria-label` ou campo de formulário,
`grep` o texto antigo em `e2e/` **antes** de commitar. E, quando o passo
aparecer em mais de dois arquivos, ele vira função em `apoio-tela.ts` — foi o
que aconteceu com `escolherComunidades()` e `preencherNovaComunidade()`, que
se juntaram ao `alerta()` e ao `cadastroConcluido()` pela mesma razão.

**Corolário para a CI:** quando ela estoura o tempo em vez de reprovar, ela
não consegue decidir nada — é o caso previsto na prática 7 para rodar a suíte
aqui. Rodar local **uma vez** custou menos que dois ciclos cegos de 20
minutos.

### 12. `format:check` no repositório inteiro, uma vez, antes do commit

A F12.1 reprovou na CI **só por formatação**: apagar uma função com script
deixou uma linha em branco a mais, e eu tinha rodado o Prettier só nos
arquivos que lembrei de listar. Um ciclo de CI de 9 minutos por uma linha
vazia.

**Prática:** `npm run format:check` sem argumento, uma vez, antes de commitar.
Conferir arquivo por arquivo depende de lembrar a lista — e a lista cresce a
cada edição. É a prática 1 de novo, por outro caminho: não confiar no
silêncio de um script.

### 13. A rodada dirigida durante o trabalho; a inteira uma vez

Na rodada dos reparos do protótipo v6 eu rodei **a suíte inteira de jornadas
três vezes** — 16 minutos cada — quando três arquivos tinham mudado. A
rodada dirigida nesses três levava 4.

A prática 7 já dizia "a suíte inteira roda na CI, não aqui e lá", e eu a
descumpri de um jeito que ela não cobria: não foi "aqui **e** lá", foi aqui
**três vezes**.

**Prática:** durante o trabalho, `npx playwright test <arquivos afetados>`.
A inteira **uma vez**, antes de abrir o PR, com a porta 3000 livre. A CI
roda tudo de novo, em máquina limpa, e é ela a autoridade.

### 14. Um nome de arquivo repetido apagou o trabalho de uma hora

`features/eventos/lista.tsx` e `features/enquetes/lista.tsx` têm o **mesmo
nome de arquivo**. Eu copiei os dois para uma pasta de backup pelo nome
base, num laço, e o segundo sobrescreveu o primeiro. Quando precisei
restaurar, o de eventos não existia mais — e eu reapliquei cinco edições à
mão, do zero.

**Prática:** backup de arquivo guarda o **caminho inteiro**, nunca o nome
base. Neste repositório `lista.tsx`, `actions.ts`, `formulario.tsx` e
`shared.ts` existem em várias features: o nome base não identifica nada.

E a prática melhor, que eu não usei: o trabalho já estava **commitado** na
branch. Reverter um arquivo é `git show <ref>:<caminho>`, que não depende de
backup nenhum.

### 15. Escrever a conclusão em quatro lugares antes de medir

O erro mais caro desta sessão, e ele tem entrada própria na seção 2 pelo
lado do método. Pelo lado do custo: eu escrevi a mesma causa no plano, no
`CLAUDE.md`, num comentário de código e nesta página — **e depois reescrevi
as quatro**, quando a medida derrubou a causa.

Mais cinco rodadas de medição de 1,5 minuto cada, que eu poderia ter feito
em **uma**: eu variei a largura numa rodada, o conteúdo em outra, a versão
do código em outra. Era um laço só, com as três variações dentro.

**Prática:** conclusão entra num lugar só até estar medida. E medição
exploratória se faz **com todas as variações no mesmo laço** — o custo de
uma rodada é subir o servidor, não o que ela mede.

### 16. Ler o arquivo inteiro quando eu precisava de vinte linhas

Repetido a sessão toda: abri componentes de 400 linhas para trocar uma
classe. O `grep -n` diz a linha, e `sed -n 'a,bp'` traz o pedaço.

**Prática:** localizar com `grep -n`, ler a faixa. Arquivo inteiro só quando
vou reescrevê-lo.

### 17. Renomear sem varrer os testes na mesma passada

Eu centralizei o seletor de criar tópico em `apoio-tela.ts` — a prática 12bis
funcionando. E no **mesmo PR** renomeei "Novo encontro" para "Novo evento"
sem centralizar nada, e seis jornadas de eventos reprovaram depois, numa
rodada de 16 minutos.

**Prática:** antes de renomear qualquer texto de tela, `grep` pelo texto
antigo em `e2e/` **na mesma passada da renomeação**. O rename e a varredura
são uma tarefa, não duas.

---

### Descontar no código o que o gatilho do banco já desconta

Na F16, `removerMembro` apagava a linha de `memberships` **e** mandava
`membersCount` diminuir um. O banco tem `memberships_count_sync` desde a F02,
um gatilho que já desconta na exclusão. Resultado: cada remoção tirava **duas
pessoas** da contagem da comunidade.

*Por que passou:* lint, tipos e as 535 regras passaram. A contagem não quebra
nada — ela só fica errada, descendo até zero sem ninguém reclamar. Quem pegou
foi um teste de banco escrito no mesmo dia, que lia a contagem antes e depois.

*Como resolvi:* o desconto ficou **só** onde o gatilho não enxerga. Remover
apaga a linha e deixa o gatilho trabalhar; banir mantém a linha com a data —
não é exclusão, o gatilho não dispara — e aí sim o código desconta, na mesma
transação.

**Regra:** antes de somar ou subtrair um contador, pergunte ao banco quem já
mexe nele: `pg_trigger` sobre a tabela responde em dez segundos. Contador é o
tipo de erro que não derruba nada e fica errado para sempre.

👁 **Atenção** — hoje existem dois testes, um para cada caminho. Barreira de
verdade seria a contagem viver só no gatilho.

---

### Oferecer a porta a quem está banido

Depois de banir alguém da comunidade, a página dela continuava mostrando
"Entrar em <comunidade>" para a pessoa banida. O servidor recusava, como
devia — mas o que a pessoa via era um botão que só devolvia erro.

*Por que passou:* a camada de dados estava certa e tinha teste ("banido não
entra de novo", verde). O que faltava não era a regra: era a tela saber da
regra. `paginaDaComunidade` devolvia `souMembro: false` para banido e para
quem nunca entrou — dois estados diferentes com a mesma resposta.

*Como resolvi:* `estouBanida` virou campo próprio, e no lugar da porta a tela
diz "Você não pode entrar nesta comunidade." A jornada confere os dois: a
frase aparece e a porta não.

**Regra:** quando o servidor passa a recusar alguma coisa, procure a tela que
ainda a oferece. Regra nova no banco quase sempre deixa um botão órfão.

🔒 **Barrado** — a jornada da F16 falha se a porta voltar.


### O preview do pull request alterava o banco de produção

Na rodada de acabamento, o build de produção disse "nenhuma migration
pendente" logo depois do merge. Estranho, porque a rodada trazia uma. Os
registros da Vercel explicaram: o build de **preview**, oito minutos antes
do merge, já tinha aplicado — `Applying migration 20261017120000_cabine_unica`,
às 04:51, com o merge às 04:59.

O ambiente de Preview usa a **mesma** `DATABASE_URL` da produção, e o
`vercel-build` rodava `prisma migrate deploy` sem perguntar onde estava. Na
prática: **abrir um pull request mudava o banco de produção**, antes de
qualquer revisão. E a parte destrutiva daquela migration — fechar conversas
duplicadas, cancelar convites repetidos — rodou nos dados reais no instante
em que o PR foi aberto.

*Por que passou:* o sinal era bom demais. "Nenhuma migration pendente" num
build de produção parece a frase de quem já está em dia, e eu quase a li
como confirmação de sucesso. Foi só estranhar que ela aparecesse numa
rodada **com** migration que o caminho apareceu. Nada reclamava: o preview
migrava e dava verde, e o produto funcionava.

*Como resolvi:* `scripts/migrar-no-deploy.mts` roda as migrations só quando
`VERCEL_ENV=production`, e derruba o build se elas falharem. O preço, que é
escolha consciente: o preview de um PR com migration roda contra o banco
antigo e pode quebrar nas telas novas. Preview quebrado atrapalha uma
revisão; banco de produção alterado por código não revisado é outra
categoria de problema.

**Regra:** antes de dar um comando poder sobre produção, pergunte **de
quantos lugares** ele pode ser disparado. "Roda no deploy" não é um lugar
só — a Vercel tem três ambientes e o mesmo script serve aos três.

🔒 **Barrado** — o guarda está no script, e o ambiente é lido da Vercel, não
de configuração que alguém possa esquecer. A solução definitiva é um banco
separado para o preview (branch database no Supabase), e continua pendente.


### O Playwright reaproveitou um servidor com o código velho

Rodei 36 jornadas na máquina, todas verdes, e subi. A CI reprovou em cinco
delas. O código era o mesmo; o servidor é que não era: `playwright.config.ts`
tem `reuseExistingServer: !process.env.CI`, e um `npm run start` deixado de
pé por uma execução anterior é reaproveitado **sem rebuild**. Eu estava
testando a tela de antes da minha própria mudança.

*Por que passou:* o verde é indistinguível. O relatório não diz de onde o
servidor veio, e a mudança era de marcação — nada quebra, tudo passa,
porque a tela testada ainda era a antiga.

*Como resolvi:* rodei de novo com a porta livre e as cinco reprovaram aqui
também. O hábito que fica: **antes de confiar numa rodada de jornadas,
conferir que nada está escutando a porta** (`lsof -ti:3000`), ou matar o
servidor entre rodadas. Em caso de dúvida, a CI é quem decide, porque lá o
reaproveitamento é desligado.

**Regra:** teste de interface só vale sobre o build que eu acabei de fazer.
Verde de servidor velho é a forma mais convincente de falso verde que este
projeto já produziu.

👁 **Atenção** — nada avisa. A configuração é proposital (acelera o ciclo),
e desligá-la custaria um build por execução.

---

### Esconder atrás de uma aba o que outras telas esperavam encontrar

A lista da Cabine ganhou abas, e os convites foram para dentro de uma. Cinco
jornadas que procuravam o convite logo depois de abrir `/cabines` passaram a
não achar nada — e o erro era "não encontrei o link do convite", que parece
defeito do convite, não da aba.

*Por que passou:* a mudança foi pedida e implementada como visual. Mover
uma coisa para trás de um clique **não é visual**: é um passo a mais no
caminho de quem usa, e todo teste que conhecia o caminho antigo quebra.

*Como resolvi:* as jornadas abrem a aba antes de procurar, por um ajudante
só (`abrirConvites`), para o próximo arquivo não repetir o seletor — é o
mesmo remédio do `escolherComunidades()`.

**Regra:** antes de mover um elemento para dentro de aba, acordeão ou menu,
`grep` pelo texto dele em `e2e/`. Quem o procura hoje vai precisar do clique
novo — e, se forem muitos, talvez ele não devesse se esconder.

👁 **Atenção** — o `grep` é hábito, não barreira.


### Nenhuma imagem enviada aparecia em desenvolvimento

*O que aconteceu:* ao conferir a foto de perfil nova, o hexágono aparecia
preenchido de ink, como se não houvesse foto. O `<img>` estava lá, com o
`src` certo, e `naturalWidth` era **0**.

*A causa:* a CSP dizia `img-src 'self' blob: data: https:`. Em produção o
Supabase é https e está coberto; em desenvolvimento ele é
`http://127.0.0.1:54321`, que não é `self` nem https. O navegador bloqueava
**toda** imagem vinda do depósito — foto de perfil, capa de comunidade e
imagem de resposta —, sem erro na página e sem nada no terminal.

*Por que passou por tudo:* porque ninguém mede pixel. O build passa, o lint
passa, os testes de banco passam (a imagem é guardada de verdade, só não é
desenhada), e as jornadas conferem que o `<img>` existe e que o endereço não
vazou o caminho cru — nunca que a imagem **carregou**. Estava assim desde a
F12, quando as fotos chegaram.

*Como foi resolvido:* a origem do Supabase entra no `img-src`, pela mesma
função que já a põe no `connect-src`. Em produção nada muda; em
desenvolvimento as imagens passam a aparecer.

👁 **Solto** — a barreira de verdade seria uma jornada que confere
`naturalWidth > 0` numa imagem enviada. Fica anotado como dívida: hoje o que
protege é esta página.

**A lição maior:** três camadas de teste confirmavam que a imagem estava
guardada e entregue. Nenhuma confirmava que ela aparecia. Quando o que
importa é visual, alguma coisa tem de olhar o visual — nem que seja uma
pessoa, uma vez, antes de dizer que está pronto.

### A CI estourou o tempo, e não foi por causa de teste nenhum

*O que aconteceu:* o job da CI do perfil v3 foi cancelado em 20m20s. A
primeira leitura foi "a suíte cresceu demais" — 18 jornadas novas de perfil
e 47 testes de banco no arquivo.

*A causa real:* `npx playwright install --with-deps chromium` levou **9
minutos e 47 segundos** naquela rodada, de um teto de 20. Sobraram 7
minutos para as jornadas, que precisam de mais. Todo o resto do job é
rápido: lint em 10 s, tipos em 8 s, testes de unidade em 3 s, testes de
banco em 31 s, Supabase em 1m45.

*Por que a leitura errada era tentadora:* o sintoma ("demorou demais")
apontava para a coisa que eu tinha acabado de fazer crescer. A diferença
entre as duas explicações só aparece olhando **o tempo de cada passo**, e
isso a página do Actions não mostra de cara — é `gh api
repos/OWNER/REPO/actions/jobs/<id>`.

*Como foi resolvido:* cache de `~/.cache/ms-playwright`, com a chave no
`package-lock.json`, e `install-deps` em vez do download completo quando o
cache acerta. O teto subiu para 35 minutos, como folga para o dia em que o
cache errar — não como solução.

👁 **Solto** — nada impede o passo de voltar a inchar; o que protege é
olhar o tempo por passo antes de culpar o que mudou.

**A lição:** quando um limite de tempo estoura, a pergunta não é "o que
ficou mais lento?" e sim **"qual passo levou o tempo?"**. Sem medir, a
culpa cai no que mudou por último, que quase nunca é o culpado.

### O build depende de o Google estar no ar

*O que aconteceu:* a CI de um PR de acabamento ficou vermelha com 15 erros
do Turbopack ao resolver `next/font/google`. Os testes tinham passado —
624 de unidade, 404 de banco —, e o que morreu foi o build do servidor das
jornadas. Reexecutar o mesmo commit, sem tocar em nada, passou.

*A causa:* `design/fonts.ts` usa `next/font/google`. Em runtime isso é
bom: a fonte é servida do nosso domínio, sem requisição ao Google, o que
ajuda a privacidade e a CSP. Mas **o build baixa a fonte**, e o runner
precisa alcançar o Google para compilar. Quando não alcança, o erro que
aparece não fala de rede — fala de "import map" e de "queries have exactly
one entry", que parece defeito do código.

*Por que custou tempo:* o sintoma aponta para o lugar errado. A mensagem
não diz "não consegui baixar a fonte"; diz algo que soa como erro de
configuração do Next, e o reflexo é procurar no que mudou por último.

*Como foi resolvido:* nada — reexecutar bastou. O conserto de verdade é
guardar os arquivos da fonte no repositório e usar `next/font/local`, que
tira a chamada externa do caminho do build. Está em `docs/pendencias.md`.

👁 **Solto** — enquanto a fonte vier do Google no build, qualquer PR pode
ficar vermelho por um motivo que não está no repositório.

**A lição:** build que busca coisa na internet não é reprodutível, por mais
que pareça. Vale a pena saber **quais** dependências externas o build tem,
porque um dia uma delas cai no meio de uma revisão.

**Voltou em 31 de outubro, e desta vez cobrou.** Duas rodadas locais de
quinze minutos e a CI de um pull request morreram com
`next/font/google queries have exactly one entry` — um erro que fala de
"import map" e não diz uma palavra sobre rede. Entre as duas falhas locais
o build passou, o que me fez concluir errado que era oscilação; a CI
falhando logo depois desfez a dúvida.

🔒 **Com barreira, agora** — a fonte mora em `design/fontes/` e o carregador
é `next/font/local`. `design/fontes.test.ts` reprova se alguém importar
`next/font/google` de novo, e confere que o arquivo baixado é mesmo um
woff2 (assinatura `wOF2`), porque um HTML de erro salvo com o nome certo
passaria pelo nome e morreria no navegador.

**A lição que faltava:** dependência externa no caminho do build não é
risco teórico que se anota e adia. Ela não avisa quando vai cobrar, e
cobra no pior momento — aqui, no meio de uma entrega pronta.

### Desenhei a marca em vez de pedir o arquivo

*O que aconteceu:* a chave `{` do Hub tinha aparecido torta três vezes
porque era a **letra** da fonte, e a posição de uma letra vem das métricas
que cada sistema lê do arquivo. O conserto que eu propus e o PO aprovou foi
desenhá-la em SVG. Desenhei, apertei o teste de centro de 1 px para 0,25 px,
e entreguei. Na primeira vez que o PO olhou, ele mandou os arquivos de logo:
`hub-logo.svg`, `hub-icone-comunidade.svg` e o logo horizontal. O desenho
não era a marca — era uma imitação dela, com o traço no peso errado e os
braços no comprimento errado.

*A causa:* eu tratei "a letra está torta" como um problema de posição, e
resolvi a posição. O que estava em jogo era **qual desenho é a marca**, e
isso não é uma decisão de engenharia — é um arquivo que existia e que eu
não pedi.

*Por que passou pelas verificações:* o teste media o **centro**, não o
desenho. Um `{` imitado, centrado ao quarto de pixel, passa igual ao
verdadeiro. Nenhuma verificação automática sabe qual é a marca do Hub.

*Como foi resolvido:* os quatro arquivos entraram em
`docs/design-system/logo/`, e `design/icons/marks.tsx` passou a carregar o
contorno real da Bricolage em peso 800, com a posição que o arquivo dá. O
teste agora mede a **tinta** contra os números do arquivo — centro em 504,49
de 1024, altura de 634,88 —, então trocar o traçado por outro reprova.

🔒 **Com barreira** — o teste compara o desenho com o arquivo, não com o
meio do quadrado.

**A lição:** quando a correção é "como isso fica", pergunte se existe um
arquivo antes de desenhar. Teste de geometria confirma que o desenho está
no lugar; nenhum teste confirma que é o desenho certo.

### A logo quebrou porque `transform` de SVG é CSS

*O que aconteceu:* a animação da marca pedia que a chave crescesse "a
partir do centro", e para isso a classe levava `transform-box: fill-box` e
`transform-origin: center`. Eu pus a classe no próprio `<path>`. O traçado
que veio do arquivo de logo já tem um `transform` — `translate(...)
scale(...)` — e **atributo `transform` de SVG é a propriedade CSS
`transform`**: reancorar a origem reancorou o posicionamento inteiro. A
chave virou um risquinho miúdo num canto do quadrado amarelo. A logo foi
para produção assim.

*A causa:* reproduzi a animação do protótipo sem reproduzir a estrutura
dele. O `hub-logo-animado.html` do PO envolve o traçado num `<g>` e anima o
grupo, justamente por isso — eu li as curvas e os tempos, e passei pela
linha que importava.

*Por que passou pelas verificações:* três testes olhavam perto e nenhum
viu. O de centro media a marca da **tela de abertura**, que não carrega a
classe da animação. O de tamanho media o **quadrado**, que continuava com
40 px. O de animação conferia o **nome** da animação, que estava certo.
Nenhum media a tinta no lugar onde o risco estava. Eu também olhei
capturas de tela, mas as que tirei da marca isolada — e ali estava correta.

*Como foi resolvido:* a animação mora num `<g>` em volta do traçado, e o
teste da barra passa a medir a tinta **dentro da marca que tem a classe**:
altura de 62% do quadrado e centro a -0,733% dele.

🔒 **Com barreira** — o teste mede a tinta onde o risco está, não onde é
cômodo medir.

**A lição:** quando copio um comportamento de um protótipo, a estrutura faz
parte do comportamento. E teste de desenho tem que medir **a instância que
o usuário vê**, não uma parecida: a diferença entre as duas é exatamente
onde o defeito se esconde.

### Três defeitos num formulário, todos sem sintoma

*O que aconteceu:* a capa da comunidade passou a ser enviada e ajustada na
própria tela. Três coisas quebraram no caminho, e **nenhuma das três deu
erro**: a tela parecia funcionar e o banco guardava a coisa errada, ou nada.

1. **O campo de arquivo saía da árvore.** Escolher uma imagem abria o
   ajuste, que era outro caminho de desenho, e o `<input type="file">`
   morava dentro do caminho anterior. O React o removia, o arquivo ia
   junto, e a comunidade nascia sem capa.
2. **Depois, ele voltava — mas vazio.** Pondo o campo nos dois caminhos, o
   React ainda via duas árvores diferentes e **recriava** o elemento. Campo
   de arquivo recriado perde o arquivo escolhido. A correção foi pô-lo
   **fora dos dois**, numa posição estável.
3. **Os três números do enquadramento sumiam no clique do OK.** O OK fecha
   o ajuste e envia o formulário, nessa ordem; o React processa o
   fechamento primeiro, os campos escondidos saem da árvore, e o servidor
   recebia o envio sem eles. `Number(null)` vira 0, `dentroDoLimite`
   devolve o neutro, e a capa voltava para o centro — exatamente como se a
   pessoa não tivesse mexido em nada.

E uma quarta, de outra natureza: **o quadro de ajuste engolia o clique nos
próprios controles.** Ele chama `setPointerCapture` no `pointerdown` para o
arrasto não escapar quando o mouse sai da imagem; com os controles **dentro**
do quadro, o ponteiro era capturado antes de o clique chegar ao botão. O OK
não fazia nada. Nenhum erro, nenhum log.

*Por que passou pelas verificações:* tipos, lint e 628 testes de unidade
passaram em todas as quatro. São defeitos de **montagem do formulário** e
de **eventos do navegador** — não existe tipo que os descreva, e teste de
unidade de componente não envia formulário nem captura ponteiro. Quem pegou
as quatro foi a jornada, e só porque ela conferia **o que o banco guardou**,
não o que a tela mostrava.

*Como foi resolvido:* o campo de arquivo e os três números moram fora dos
caminhos de desenho, numa posição fixa da árvore; o quadro ignora o
`pointerdown` que começa num `[data-controles]`.

🔒 **Com barreira** — a jornada "escolher, arrastar, aproximar e dar OK"
confere `cover_url`, `cover_width = 600` e `cover_zoom > 1` no banco. Cada
um dos quatro defeitos reprova pelo menos uma dessas três colunas.

**A lição:** formulário que muda de cara enquanto é preenchido é um campo
minado, e a mina é sempre a mesma — **o que sai da árvore não é enviado**.
Campo que carrega dado fica fora do que troca. E teste de tela que olha a
tela não serve: ele confirma o que você acabou de desenhar. O que prova é
o que ficou no banco.

### Uma função exportada de arquivo de cliente, chamada no servidor

*O que aconteceu:* as abas da comunidade nasceram em
`features/comunidades/abas.tsx`, que começa com `"use client"`. Junto com o
componente, exportei `abaDaComunidade()`, a função de duas linhas que lê a
aba da URL — e a chamei na página, que é Server Component.

A página inteira passou a responder **"This page couldn't load. A server
error occurred"**. Cinco jornadas novas reprovaram de uma vez, todas na
primeira asserção, nenhuma dizendo nada sobre a causa.

*Por que passou:* `npm run typecheck` verde, `npm run lint` verde. Para o
TypeScript é uma função exportada de um módulo, importada por outro — não
existe tipo que diga "isto só existe no navegador". A fronteira entre
cliente e servidor **não é do sistema de tipos**: ela só existe em tempo de
execução, e o Next só reclama quando a função é chamada de verdade.

*Como foi resolvido:* a função foi para `features/comunidades/shared.ts`,
sem `"use client"`, que é exatamente o que o CLAUDE.md já mandava fazer com
o que a tela e o servidor compartilham. O componente importa o tipo de lá.

👁 **Protegido só pela página** — e é protegido de verdade: qualquer rota que
chame a função pelo servidor devolve 500, e a jornada que abre a comunidade
reprova na hora. O que falta é um aviso **antes** de rodar.

**A lição:** o `"use client"` contamina o arquivo inteiro, não só o
componente. Uma função utilitária pendurada num arquivo de cliente é uma
bomba-relógio que nenhuma ferramenta estática vê — e o sintoma é a tela
inteira morrer, longe da causa. Utilitário compartilhado nasce em
`shared.ts`; se está num arquivo com `"use client"`, ele é do navegador e
de mais ninguém.

### O `next dev` não enxerga rota paralela criada com ele de pé

*O que aconteceu:* criei o encaixe `@topico` e a rota interceptada
`(.)[topico]` com o servidor de desenvolvimento rodando. Abrir um tópico
pela lista passou a devolver **404**: endereço certo, servidor respondendo
200, e a tela em branco com o 404 do Next por cima.

Perdi três rodadas de depuração procurando no código. A causa era o
servidor: o `app-paths-manifest.json` não tinha a rota interceptada. Matar
o processo, apagar `.next` e subir de novo resolveu, sem mudar uma linha.

Aconteceu **três vezes** na mesma tarde, porque a cada ajuste de rota eu
confiava no recarregamento automático de novo.

*Por que passou:* não passou por conferência nenhuma — nenhuma ferramenta
olha o manifesto. O sinal é um 404 que não distingue "esta rota não existe"
de "esta rota ainda não foi compilada".

👁 **Protegido só pela página.**

**A lição:** mexeu em pasta de rota — `@encaixe`, `(.)interceptada`,
`default.tsx`, `layout.tsx` —, reinicie o `next dev` e apague o `.next`
antes de acreditar no que a tela mostra. Recarregamento automático é para
conteúdo de arquivo, não para a árvore de rotas.

### A rota interceptada engoliu as rotas irmãs

*O que aconteceu:* o painel do tópico nasceu como rota interceptada
(`@topico/(.)[topico]`), para o endereço virar `/c/<comunidade>/<topico>` e
a lista continuar visível atrás. Funcionou — e **quebrou "Criar tópico"**.

`(.)[topico]` é um segmento dinâmico: ela casa *qualquer* coisa abaixo de
`/c/<comunidade>/`, inclusive `novo` e `moderar`. Quando a interceptação
casa, o Next mantém o conteúdo anterior atrás do painel — essa é a graça
dela. Então clicar em "Criar tópico" dava o endereço `/c/<slug>/novo` com a
**comunidade** desenhada. A tela de criar simplesmente não abria mais.

Tentei devolver `null` do painel para os endereços reservados. Não adianta:
a interceptação já casou antes de o componente rodar, e quem fica para trás
é o `children`. Também não dá para excluir rotas no nível do sistema de
arquivos.

Outras duas armadilhas da mesma empreitada, no caminho:

- **Empurrar o endereço não desfazia a interceptação.** O X do painel
  chamava `router.push("/c/<comunidade>")` e o clique não fazia nada — nem
  erro, nem mudança de endereço. O encaixe paralelo guarda o último estado
  dele, o Next calculava a mesma árvore e a navegação virava um nada.
- **`waitForURL` não serve para navegação de cliente.** Ele espera um
  evento de `load` que não acontece, e o teste reprova por tempo esgotado —
  um sintoma que parece lentidão, não "o botão é um enfeite". O que mede é
  `expect.poll` sobre `location.pathname`.

*Por que passou:* nenhuma delas tem sintoma honesto. 404 sem causa, clique
que não faz nada, teste que estoura o tempo. E o `next dev` ainda mentia
por cima (entrada anterior).

*Como foi resolvido:* o PO escolheu trocar o endereço do painel. Ele virou
`?t=<endereço>` na própria página da comunidade — sem encaixe paralelo, sem
`default.tsx`, sem interceptação e sem jogo com o histórico.
`/c/<comunidade>/<topico>` continua existindo inteiro, com o 404 dele.

🔒 **Com barreira** — a jornada "a comunidade tem o caminho para criar
tópico" reprova se as rotas irmãs forem engolidas de novo, e cinco jornadas
cobrem abrir, fechar, pular e contribuir pelo painel.

**A lição:** rota interceptada com segmento dinâmico captura os irmãos
dela, e o preço aparece longe — numa tela que nada tem a ver com o painel.
Antes de escolher interceptação, conte quantos irmãos o segmento tem. Aqui
eram dois, e um parâmetro de busca resolvia o mesmo problema sem nenhuma
das quatro armadilhas.

### O gatilho que trocaria o endereço de toda comunidade renomeada

*O que aconteceu:* a janela de moderar trouxe a primeira tela do Hub que
**renomeia** uma comunidade. O primeiro teste de banco dela falhou com
"Comunidade não encontrado" ao reler a comunidade pelo endereço de antes.

O gatilho `communities_slug` roda `BEFORE INSERT OR UPDATE OF name` e
recalcula o slug. Renomear "Animação" para "Animação Brasileira" mudava
`/c/animacao` para `/c/animacao-brasileira` — e **todo link já
compartilhado parava de abrir**, incluindo os convites da F14, que são o
mecanismo de crescimento do produto.

*Por que passou:* o gatilho está no banco desde a F07, correto e inofensivo
por três semanas, porque **nada no produto renomeava uma comunidade**. O
nome era escrito na criação e ficava. Nenhum teste cobria o caminho porque
o caminho não existia; nenhuma revisão o pegaria, porque o código do
gatilho está certo para o que ele foi escrito.

O Hub já era explícito sobre isso em outro lugar — "endereço que já existiu
nunca volta a ser livre", no CLAUDE.md, sobre o `@u`. A regra existia; o
gatilho não a conhecia.

*Como foi resolvido:* o gatilho só calcula o endereço quando ele **não
existe**. A condição era "o nome não mudou"; passou a ser "o slug está
vazio". Zerar o slug continua forçando o recálculo, que é a saída de
emergência que o preenchimento das comunidades antigas usou.

🔒 **Com barreira** — teste de banco ("o endereço não muda junto com o
nome") e jornada ("renomear a comunidade não muda o endereço dela"), que
renomeia pela tela e volta pelo endereço antigo.

**A lição:** abrir uma tela nova ativa caminhos de banco que nunca
rodaram. Antes de escrever a primeira tela que faz algo pela primeira vez
— renomear, apagar, transferir —, leia os gatilhos da tabela e pergunte o
que eles fazem nesse caminho. Um gatilho que nunca disparou não tem
histórico de acerto: tem só ausência de erro.

### Renomear criou um seletor ambíguo, e o verde local era temporização

*O que aconteceu:* a troca de termo da rodada de acabamento renomeou o
campo de "Sua resposta" para "Sua contribuição", e o menu de cada
contribuição para "Opções da sua contribuição".

`getByLabel` casa **por trecho**. Depois que uma contribuição é publicada,
`getByLabel("Sua contribuição")` passa a achar dois elementos: o campo e o
botão do menu do cartão recém-criado. "Opções da sua contribuição" contém
"Sua contribuição".

*Por que passou:* a suíte inteira ficou **verde aqui, duas vezes**, e
reprovou na CI. A asserção corria antes de o cartão aparecer na tela;
nesta máquina ele ainda não existia, na CI já estava lá. Não é um teste
mal escrito que às vezes falha: é um seletor ambíguo que **sempre** estava
errado e só às vezes encontrava o segundo elemento.

Com o nome antigo a ambiguidade não existia — "Opções da sua resposta" e
"Sua resposta"... também casariam. Ela existia desde sempre e nunca tinha
sido exercitada no momento certo.

*Como foi resolvido:* `{ exact: true }` no ajudante `campoDeContribuicao`,
que já era o único caminho dos testes até o campo. A centralização feita
na rodada anterior transformou o conserto em uma linha.

🔒 **Com barreira** — o ajudante é exato, e qualquer teste que precise do
campo passa por ele.

**A lição:** `getByLabel` e `getByRole({ name })` casam por trecho, e
rótulo que é prefixo de outro rótulo é uma bomba de relógio. Quando um
nome novo contiver outro, use `exact`. E verde local que depende de o
elemento **ainda não ter aparecido** não é verde: é uma corrida que você
venceu dessa vez.

### Escrevi a causa no Faustão antes de medi-la, e ela estava errada

*O que aconteceu:* o PO mandou dez prints da tela da comunidade. Quatro
pareciam o mesmo defeito — "Criar ev…", "+ Conv…", "Convidar para mode…",
"Criar tópico" na borda direita. Lendo o código, achei a causa:
`features/comunidades/resumo.tsx` tinha

```
min-[1100px]:max-w-contextPanel flex w-full shrink-0 flex-col
```

e `w-full` com `shrink-0` num item de flex é um pedido contraditório — "me
dê tudo e não me tire nada". Abaixo de 1100 px nenhum teto segurava a
coluna. A história fechava: a página ficaria mais larga que a janela e todo
botão da borda sairia do campo de visão.

Escrevi isso no plano, no `CLAUDE.md`, num comentário do código e **nesta
página**. Depois escrevi a barreira — uma jornada que mede
`scrollWidth` contra `innerWidth` nas quatro abas — e, para conferir que ela
morde, reintroduzi a classe de propósito.

**Ela passou verde.** Com o defeito de volta.

Então medi. Uma jornada temporária, com conteúdo de verdade — comunidade de
nome comprido, tópico, evento de título longo, segundo membro de nome longo
—, varrendo **todo** elemento de `main` em onze larguras, de 1400 a 480 px,
e procurando duas coisas: o que passa da borda da janela e o que está
recortado por `overflow`. No código da rodada e no do `origin/main`, antes
dos meus consertos.

Resultado: **sobra zero em todas**. Nada passava da borda, nada era
recortado além do campo de arquivo oculto e de um texto de leitor de tela.
A causa que eu havia escrito não existe.

*Por que passou:* porque ninguém confere o Faustão. Teste, build e lint
reclamam; uma explicação não. Eu li o código, achei uma contradição real
(`w-full` com `shrink-0` é ruim, e o breakpoint proibido também era), e
**tratei "achei algo errado perto" como "achei a causa"**. As duas coisas se
parecem muito e a diferença só aparece na medida.

E o pior: a barreira passar verde era a informação, e eu quase a chamei de
"barreira verificada". Só não chamei porque reintroduzi o defeito antes de
dizer.

*Como foi resolvido:* a classe contraditória e o breakpoint saíram — eram
errados por conta própria, independentes do print. O resto dos consertos
(botão na `acao` do `SectionTitle`, ações da linha de membro em grupo que
não encolhe, cartão de evento refeito) ficou, porque põem a tela na forma do
protótipo, que é o que o PO pediu. **Mas nenhum deles é "o conserto de um
estouro medido", e esta página não vai dizer que é.**

👁 **Sem barreira para o print original**, porque não sei o que ele mostra.
As duas barreiras que ficaram valem pelo que provam:

- `design/components/components.test.tsx`, "texto de gente nunca fura o
  cartão" — desenha cada componente com uma palavra de 220 caracteres e
  exige `wrap-anywhere` ou `truncate` numa tag que envolva o texto. **Esta
  morde**: conferi tirando a classe.
- `e2e/comunidades.spec.ts`, "nada sai pela borda direita" — percorre as
  quatro abas em 1280 px e 800 px. É vigilância, não regressão: ela nunca
  viu o defeito vermelho, e o comentário dela diz isso.

**A lição, e é dupla.**

A primeira: **barreira que você não viu reprovar não é barreira.** O passo
"reintroduza o defeito e veja vermelho" não é zelo — foi ele que desmontou
um diagnóstico que já estava escrito em quatro lugares. Sem ele, eu teria
entregado a correção errada com a explicação errada e a página de erros
contaminada.

A segunda, maior: **o Faustão só vale se o que está nele foi medido.** Esta
página existe para não repetir erro; uma causa inventada aqui faz o próximo
erro parecer conhecido. Causa entra depois da medida, nunca antes — e
quando não houver medida, entra escrito "não sei", como está aqui.

Isso acrescenta um quinto hábito à seção 8: **explicar em vez de medir.** É
o mais sedutório dos cinco, porque uma boa explicação dá a mesma sensação de
um teste verde e não custa nada.

### Rótulo de tela mudou de novo, e eram onze jornadas

*O que aconteceu:* "Nome" virou "Título" e "Descrição" virou "Abertura" no
formulário de criar tópico, e onze jornadas em oito arquivos entravam pelos
rótulos antigos.

*Por que passou:* não passou — foi previsto. É a terceira vez
(`escolherComunidades`, `campoDeContribuicao`, e agora esta), e o Faustão já
registrava o padrão em "Mudou rótulo de tela? Os testes entram por ele".

*Como foi resolvido:* `criarTopico()` em `e2e/apoio-tela.ts`, e os onze
passam por lá.

🔒 **Com barreira** — pelo mesmo mecanismo das outras duas: um caminho só.

**A lição:** esta entrada existe para registrar que a lição **funcionou**.
A primeira vez custou uma tarde; esta custou dez minutos, porque o remédio
já estava escrito aqui.

### Tecla é evento único: clique se reespera, tecla não

*O que aconteceu:* a jornada do atalho `/` passou **sozinha** e reprovou na
suíte inteira. O teste apertava a tecla e depois esperava o campo ganhar
foco, com `toBeFocused`, que repete por cinco segundos.

*Por que passou:* porque a diferença entre clique e tecla não é óbvia.

Um clique que chega cedo **se reespera**: `locator.click()` aguarda o
elemento existir e estar clicável. Uma tecla não tem elemento — ela é
disparada no documento, uma vez. O atalho mora num `useEffect`, que só
existe depois de a página hidratar; apertada antes disso, a tecla
**simplesmente não aconteceu**, e os cinco segundos de `toBeFocused`
ficaram olhando um campo que nunca receberia foco.

Sozinho o teste passava porque a máquina estava livre e a hidratação chegava
antes. Na suíte, com 240 jornadas em série, não.

*Como foi resolvido:* a tecla foi para **dentro** do laço de espera —
`expect.poll` que aperta e confere, em vez de apertar e depois conferir.
Repetir é seguro porque o próprio atalho se cala quando o foco já está num
campo.

🔒 **Com barreira** — o teste é o próprio guarda, e agora pelo lado certo.

**A lição:** quando o teste depende de algo que **só existe depois da
hidratação** — atalho de teclado, listener de `window`, arrastar —, a ação
vai dentro da espera. A asserção repetida não recupera uma ação que não
aconteceu. Vale para tecla, rolagem e qualquer evento disparado no
documento, não num elemento.

### Mudar o que visitante vê desenterrou uma corrida de três anos

*O que aconteceu:* a jornada "lotado: o botão desaparece" nunca esperou a
terceira pessoa virar membro antes de abrir a aba de eventos. Passou
sempre — porque visitante não via **botão nenhum** na linha de presença, e
uma asserção sobre "Lotado" não distinguia "não sou membro" de "está
lotado".

Quando visitante passou a ver "Confirmar presença" — o botão que abre a
janela de entrar —, a corrida ganhou voz e o teste reprovou.

*Por que passou:* o teste estava errado desde que foi escrito, e **a
ausência de interface o escondia**. Um estado que não desenha nada é um
estado que nenhuma asserção consegue distinguir dos outros.

*Como foi resolvido:* esperar `Membro de` antes de abrir a aba, como a
primeira pessoa da mesma jornada já fazia.

👁 **Atenção** — o padrão não tem barreira: é "entrar na comunidade e seguir
sem esperar". Vale procurar `getByRole("button", { name: /^Entrar em/ })`
seguido de `goto` sem espera no meio.

**A lição:** tela que não desenha nada para um estado esconde os erros
daquele estado. Quando um estado vazio ganha interface, **espere testes
antigos reprovarem** — e leia cada um antes de culpar a mudança: ali foi o
teste que estava errado, não o código novo.

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

E dois que não são de produto e sim de ofício:

4. **Confiar no silêncio.** Substituição que não casa, teste que passa
   olhando o lugar errado, comando que termina sem fazer nada. Quase todo
   desperdício desta sessão começou com uma ferramenta que não reclamou — e
   a defesa é escolher ferramentas que reclamam, não prestar mais atenção.
5. **Explicar em vez de medir.** Ler o código, achar algo errado por perto e
   chamar aquilo de causa. Uma boa explicação dá a mesma sensação de um
   teste verde e não custa nada — e foi assim que uma causa inventada chegou
   a entrar nesta página. Causa entra depois da medida.
