# Faustão

> ERROU!

Erros que eu já cometi neste projeto, e a regra que cada um deixou. Existe
para eu não repetir — e para quem vier depois não tropeçar no mesmo lugar.

**Como usar:** antes de dizer que algo está pronto, passe os olhos na seção 1.
Ao escrever teste, na 2. Ao mexer em ambiente ou banco, na 4.

Entrada nova vai no fim da seção que couber, com o que aconteceu, **por que
passou** e a regra. O "por que passou" é a parte que importa: todo erro aqui
atravessou alguma verificação que eu achava suficiente.

---

## 1. Achar que está pronto

### Build verde não é app no ar

Reportei "Vercel: pass" da F01 à F03. O site respondia **404 em todas as
rotas** o tempo todo: a Vercel rodava `next build` e publicava só a pasta
`public/`, porque o framework estava marcado como "Other".

*Por que passou:* o sinal verde mede se o código compila, não se o app
responde. Tratei um como o outro e nunca abri a página.

**Regra:** antes de dizer que está no ar, rodar `npm run verificar:deploy <url>`
**e abrir a página no navegador**. Sempre.

### Migrations não sobem junto com o código

Duas vezes — F02 e F04 — mergeei uma feature com migration e deixei o banco
remoto atrás. O build passava, o site subia, e o erro só aparecia quando
alguém usava a tela: `The column profiles.onboarded_at does not exist`.

*Por que passou:* funcionava na minha máquina, onde a migration já estava
aplicada.

**Regra:** o deploy aplica as migrations (`vercel-build`). Nunca depender de
lembrar.

### Ler resultado de servidor obsoleto

Investigando a CSP, concluí que o nonce não funcionava e quase reescrevi a
configuração. Eu tinha vários `next start` rodando de testes anteriores e
estava lendo a resposta de um build velho.

**Regra:** antes de diagnosticar, matar o que está na porta e subir de novo.
Resultado que contraria o código merece primeiro a pergunta "estou medindo a
coisa certa?".

---

## 2. Testes que não testam

### Todo teste pelo mesmo caminho

A tela de notificações tem dois botões. **Todos os meus testes clicavam em
"Agora não".** O caminho de "Ativar notificações" travava a tela — botão
desativado, sem mensagem, sem saída — e 30 jornadas verdes não acusaram nada.
Quem encontrou foi o PO, no primeiro cadastro de verdade.

**Regra:** tela com duas saídas precisa de dois testes. Se existe um botão que
nenhum teste aperta, ele não existe para a suíte.

### Teste que passa com e sem a correção

Depois de corrigir aquele travamento, quase mandei o PR sem conferir se o
teste novo pegava o bug.

**Regra:** ao corrigir um bug, **desfazer a correção e ver o teste falhar**.
Teste que passa dos dois jeitos não testa nada.

### Espera fixa em navegação

Verificando a F05 no deploy, usei `waitForTimeout(900)` entre cliques.
Explorar, Comunidades e Cabine pareceram todos cair no Início — ia reportar
como bug sério. Era a espera: na Vercel cada rota sobe do zero na primeira
visita.

**Regra:** `waitForURL` e `expect`, nunca espera por tempo. E antes de chamar
algo de bug no ambiente publicado, desconfiar do teste primeiro.

### Corrida entre testes

As jornadas em paralelo falhavam, nunca as mesmas duas vezes. Persegui o
sintoma — afrouxei o limite de autenticação do Supabase — antes de achar a
causa: elas compartilham um banco, um servidor e um limite real.

**Regra:** teste instável é problema de estado compartilhado até prova em
contrário. Rodar com um trabalhador só é o primeiro diagnóstico, não a última
tentativa.

### Teste disputando com outro teste

O teste de tokens varria `app/` enquanto o de fronteira escrevia arquivos
temporários lá. A contagem oscilava entre execuções.

**Regra:** teste que escreve arquivo escreve onde ninguém mais olha, ou usa
nome que os outros ignoram.

---

## 3. Português e produto

### "Faltam 1 comunidade"

Concordância errada na interface, pega por um teste.

**Regra:** singular e plural são casos diferentes, não um `${n} coisa(s)`.

### Tirar o "s" não singulariza português

A RN04 ignora plural ao comparar nomes de comunidade. Minha primeira versão
transformava "Paisagens" em `paisagen`, que não bate com `paisagem` — justo o
caso que a regra existe para pegar.

**Regra:** regra de idioma se testa com palavra de verdade do domínio, não com
"teste1"/"teste2".

### Limite que barra um nome real

Pus mínimo de 3 caracteres no `@`. Isso recusa "jo" — e **Jo Ramos está no
protótipo do Hub**.

**Regra:** antes de fixar um limite, procurar um caso real que ele barraria.
Os dados do protótipo são o primeiro lugar para procurar.

### Citar número de feature de memória

Escrevi "chega na F05", "é da F09", "F19 traz os termos" em comentários e em
texto de tela. Cinco estavam errados.

**Regra:** conferir no backlog antes de citar. Comentário que aponta para o
lugar errado é pior do que comentário nenhum.

---

## 4. Ambiente e operação

### "Funciona na minha máquina" com IPv6

Configurei `DIRECT_URL` com a conexão direta do Supabase. Funcionava aqui e
falhava no build da Vercel: a conexão direta só responde em **IPv6**, e o
ambiente de build é IPv4.

**Regra:** conexão de banco para ambiente remoto é o pooler de sessão. E
diferença entre minha máquina e o build é suspeita número um quando algo só
quebra lá.

### Senha com caractere especial quebra a URL

`#`, `/`, `:` e `?` têm significado dentro de um endereço. A senha crua
cortava a URL e o Prisma respondia "scheme is not recognized", que não diz
nada sobre a causa.

**Regra:** senha em URL vai codificada. Existe `npm run db:deploy:remoto` para
não fazer isso à mão.

### Chave parecida com segredo dentro do repositório

Chumbei a chave do Supabase local no arquivo da CI. O GitHub bloqueou o push —
com razão, mesmo o valor sendo público e idêntico em toda máquina.

**Regra:** nada com cara de segredo em arquivo versionado. A CI lê do próprio
CLI.

### `INSERT` cru esquecendo `updated_at`

`@updatedAt` do Prisma é preenchido pelo cliente, então a coluna é `NOT NULL`
sem valor padrão. Todo SQL escrito à mão esbarra nisso.

**Regra:** `INSERT` fora do Prisma escreve `updated_at`.

### Apagar a branch base fechou o PR dependente

Mergeei a F00 com `--delete-branch`. O PR da F01 apontava para aquela branch e
o GitHub **fechou** o PR em vez de reapontar.

**Regra:** com PRs encadeados, reapontar a base antes de apagar a branch.

### Deixar o ambiente mexer no repositório

`vercel env pull` acrescentou `.env*` ao fim do `.gitignore`, o que anularia a
exceção do `.env.example`.

**Regra:** depois de rodar ferramenta de terceiro, olhar `git status`.

---

## 5. Limites de camada

### Componente de cliente puxando o banco

Uma constante compartilhada entre a tela e `lib/data/` foi parar num reexport.
O componente de cliente importou, e isso arrastou o Prisma e o `pg` para o
pacote do navegador. O erro foi `Can't resolve 'dns'`, que não diz nada.

**Regra:** valor compartilhado entre tela e camada de dados mora em
`features/<nome>/shared.ts`. A camada de dados importa de lá, nunca o
contrário.

### Constante exportada em arquivo `"use server"`

Num arquivo de Server Actions, **todo export precisa ser função assíncrona**.
Uma constante exportada apaga os exports do módulo inteiro, e o erro do Next
não menciona isso.

**Regra:** só actions em `actions.ts`. Constante e tipo vão para `shared.ts`.

### Edição que não aplicou, e eu nem olhei

Troquei texto num arquivo com um `replace` que não bateu com o conteúdo real.
Segui adiante achando que tinha mudado; quem avisou foi o compilador, dois
passos depois.

**Regra:** edição por substituição de texto se confirma lendo o resultado, não
se presume.

---

## 6. O padrão por trás

Olhando a lista, quase tudo cai em três hábitos:

1. **Confiar num sinal verde em vez de olhar a coisa.** Build, teste, deploy —
   todos medem *alguma* coisa, nunca a coisa toda.
2. **Testar o caminho que eu tinha em mente.** O bug mora no caminho que eu
   não imaginei: o outro botão, o nome curto, a palavra no plural.
3. **Tratar minha máquina como o mundo.** IPv6, migration já aplicada,
   servidor já aquecido — tudo que é verdade aqui e não é lá.
