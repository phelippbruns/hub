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

## 6. Placar

Dos erros registrados, os que **não podem voltar** são os que ganharam
barreira: migrations no deploy, jornadas em série, plural do português,
segredo no repositório, corrida entre testes, e os dois limites de camada que
o build recusa.

O resto é 👁 — protegido só por esta página. **Cada um desses é uma dívida**, e
a pergunta a fazer em cada revisão é: dá para virar teste?

## 7. O padrão por trás

Olhando a lista, quase tudo cai em três hábitos:

1. **Confiar num sinal verde em vez de olhar a coisa.** Build, teste, deploy —
   todos medem *alguma* coisa, nunca a coisa toda.
2. **Testar o caminho que eu tinha em mente.** O bug mora no caminho que eu
   não imaginei: o outro botão, o nome curto, a palavra no plural.
3. **Tratar minha máquina como o mundo.** IPv6, migration já aplicada,
   servidor já aquecido — tudo que é verdade aqui e não é lá.
