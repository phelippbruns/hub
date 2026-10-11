# Pendências do Hub

Atualizado em 4 de outubro de 2026, depois da F06.

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

### 1.2 Idade mínima: 16, 17 ou 18

O código usa **18**, por decisão sua. O escopo e a RN29 dizem **16**, e há um
ponto em aberto sobre 16 ou 17 por causa do ECA Digital.

**Os documentos e o código discordam.** Alinhar os dois é rápido; decidir qual
é o número certo é revisão jurídica.

### 1.3 Universos e comunidades curadas

Hoje há 5 Universos e 23 comunidades como ponto de partida
(`npm run conteudo:inicial`). Quais entram no lançamento é decisão de produto.
Cerâmica foi pedida por você em 11 de outubro, com Torno, Esmaltes, Queima e
Modelagem Manual — Universo sem comunidade nenhuma aparece no Explorar e não
leva a lugar nenhum.

Ligado a isto: **quem modera as comunidades da plataforma.** Hoje a resposta é
"a conta do Phelipp", o que é um remendo — toda denúncia nas 23 cai no seu
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

## 2. Cadastro: o que o PO pediu em 4 de outubro

Quatro pedidos, com o custo de cada um medido no código de hoje.

### Tornar o @ obrigatório — **feito em 10 de outubro**

O campo era "@ (opcional)" e o Hub gerava um a partir do nome. Agora é
obrigatório: um @ que a pessoa não escolheu é um @ que ela não lembra — e
desde a mesma data o @ também serve para entrar.

O caminho do **Google** continua sugerindo um, porque lá a pessoa volta já
autenticada; quem pede o @ é a tela de completar cadastro.

### Avisar que o @ já existe — **já funcionava**

Três camadas: a tela avisa enquanto a pessoa digita (sem esperar o envio), o
servidor confere de novo antes de criar, e o banco tem índice único por trás.

### Entrar pelo @ — **feito em 10 de outubro**

Um campo só, "Email ou @", que aceita os dois; com ou sem o arroba na frente.
O Supabase Auth só conhece email, então o servidor traduz o @ no email antes
de chamar o login, e o email nunca chega à tela.

Duas coisas que valem saber:

- **Não abre a porta de enumeração.** O @ já é público no Hub: aparece na
  busca de pessoas e no endereço do perfil. O que continua escondido é quais
  **emails** têm conta.
- **A limitação de taxa é pelo email**, mesmo quando se entra pelo @ — senão
  bastaria alternar entre o @ e o email da mesma conta para dobrar o número
  de senhas que dá para testar.

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

### Editar a capa da comunidade — **feito em 10 de outubro**

Entrou junto com a F09, porque a F09 construiu o caminho de upload inteiro e
a capa passou a reusá-lo: a mesma conferência de bytes, a mesma remoção de
localização, o mesmo depósito.

Só quem modera troca. A capa antiga sai do depósito; a capa padrão do
Universo nunca, porque é compartilhada.

O texto abaixo fica como registro do que foi decidido antes.

### Como era quando foi anotado — **junto com a F20**

Pedido do PO em 10 de outubro: uma opção "Editar capa" no menu de três
pontos da comunidade.

Não é o ajuste pequeno que parece. Hoje **o Hub não envia arquivo nenhum** —
a comunidade nasce com a capa do Universo, e a tela de criar diz isso. Fazer
a edição de verdade é construir o caminho de upload inteiro, que a regra de
segurança 7 define: tipos permitidos, tamanho máximo, URLs assinadas com
validade curta e **remoção dos metadados de localização das fotos** (uma foto
de celular carrega onde foi tirada; publicar isso sem querer é um problema
sério numa rede social).

Era para ser da F20. Virou F09 quando o PO escolheu construir o envio de
imagem junto com as respostas, e as três perguntas em aberto foram
respondidas: **só quem modera**, a capa antiga **é apagada**, e a imagem de
resposta entrou junto.

Fica para a F20 só a foto de perfil e a imagem da Cabine.

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

### Ver quem me segue — **custo baixo, 1 dia**

Pedido do PO em 11 de outubro: a lista de quem me segue, igual à de quem eu
sigo, só que ao contrário. **Só o dono vê.** O link fica no mesmo lugar: no
número de "seguidores" do perfil próprio.

É a menor das três. Quase tudo já existe: a tela de `/perfil/seguindo`, a
busca dentro dela, a função que recusa quem não é o dono. Falta a consulta
espelhada, uma rota e o número virar link.

**Muda a RN28**, que hoje diz que o número de seguidores "não abre lista,
para evitar comparação entre perfis". A razão dela continua de pé — ninguém
vê os seguidores de outra pessoa —, mas o texto precisa ser corrigido para
dizer "só o dono abre".

### Marcar pessoas com @ nas respostas — **médio, 3 a 4 dias; entrou na F15**

Pedido do PO em 11 de outubro: escrever `@lia` numa resposta e isso virar um
caminho para o perfil dela.

Não é só pintar o texto de outra cor. São quatro partes, e a última é a que
pesa:

1. **Achar o @ no texto** e transformar em link ao desenhar — perto do que
   `lib/texto/links.ts` já faz para a RN16, com os mesmos cuidados de
   acento, pontuação e @ que não existe.
2. **Sugerir enquanto digita**, senão a pessoa precisa decorar o @ exato.
3. **Guardar quem foi marcado**, para a notificação não depender de reler o
   texto depois.
4. **Notificar quem foi marcado** — e isto é a F15. Marcar sem avisar não
   serve para nada, então ou esta parte espera a F15, ou a F15 vem antes.

**Decidido em 11 de outubro: vai junto com a F15**, que passou a se chamar
"Notificações e marcar com @" no [backlog](backlog.md). Lá ficam o escopo
inteiro, os critérios de aceite e a resposta à pergunta de produto abaixo:
marcar vale só entre membros da mesma comunidade, e respeita bloqueio e
silenciamento.

Tem também uma pergunta de produto: **marcação é convite ou intromissão?**
Numa rede sem curtida, ser arrastado para uma conversa por qualquer pessoa é
um vetor de incômodo. Vale decidir se dá para desligar, e se marcar só vale
para quem está na mesma comunidade.

### Comunidade sem Universo, e o Hubverso — **médio no mínimo, grande se os Universos saírem**

Pedido do PO em 11 de outubro: deixar criar comunidade sem escolher Universo;
ela cai num Universo de banco chamado **Hubverso**. E a ideia maior por trás:
**acabar com os Universos.**

São duas coisas de tamanho muito diferente, e vale decidir qual é a de agora.

**A pequena — 1 a 2 dias.** O Hubverso existe no banco, o campo Universo sai
do formulário de criar (ou vira opcional), e quem não escolhe cai nele. O
Universo continua existindo em todo lugar; só deixa de ser uma pergunta na
hora de criar. Pontos a resolver: o Hubverso aparece no Explorar como os
outros? E a **capa**, que hoje a comunidade herda do Universo quando não
envia uma (RN03) — o Hubverso precisa de uma capa padrão própria.

**A grande — 1 a 2 semanas, e é uma mudança de produto.** Universo é o
primeiro degrau da hierarquia do Hub (RN01) e aparece em 25 arquivos: o
Explorar é uma lista de Universos, o onboarding escolhe comunidades **por
Universo** (RN31), a Coleção agrupa por Universo, a capa padrão vem dele, e
existe a tela `/u/<universo>`. Tirar isso não é apagar uma coluna: é
responder **como alguém descobre comunidade sem eles**, e hoje a resposta
inteira do Explorar depende deles.

Minha leitura, para você decidir: a pequena resolve o incômodo real — ter de
escolher um Universo para criar uma comunidade — e não fecha nenhuma porta.
A grande vale a pena se a descoberta for repensada junto, não antes.

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

---

## 4. Dívida técnica

Coisas que funcionam, mas que vão cobrar caro se ficarem como estão.

### 4.1 Um banco só para tudo

Produção e os previews de cada PR usam **o mesmo banco**. Um teste num PR mexe
no mesmo lugar que os dados de verdade. Enquanto só há contas de teste, tudo
bem; depois, não.

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

## 5. Fila de features

Feito: **F00 a F12**. Faltam 9.

| | Feature | Depende de | O que entrega |
|---|---|---|---|
| F13 | Cabine | F12 | Conversa privada |
| F14 | Compartilhar e convite por link | F13 | Crescimento |
| F15 | Notificações | F13 | Motivo de voltar |
| F16 | Denúncia, bloqueio e moderação | F09, F13 | Segurança |
| F17 | Configurações e LGPD | F15 | Exportar e excluir conta |
| F18 | Termos e privacidade | F03 | Texto completo — **já destravada**, só falta o texto |
| F19 | Métricas e eventos | F14 | Saber se funciona |
| F20 | Qualidade final da web | todas | Revisão geral, mais a imagem da Cabine (o resto do upload saiu na F09 e na F12) |
| F21 | Versão de celular | F20 | O mesmo código, acima e abaixo de 768 px |

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

## 7. O que fazer agora

1. **Decidir sobre o aviso de email duplicado** (seção 2): na tela ou por
   email. É a única das quatro que não é só execução.
2. **Mandar o texto dos Termos e da Política**, se já tiver.
3. Seguir para a **F07**, que traz as comunidades por dentro.

Em paralelo, e sem pressa de código: começar a conversa jurídica sobre
verificação de idade. É o item que mais demora e o que mais bloqueia.
