# Pendências do Hub

Atualizado em 4 de outubro de 2026, depois da F06.

O que falta para o Hub existir. Separado pelo que **impede o lançamento**, pelo
que é **decisão sua**, pelo que é **dívida técnica** e pela **fila de features**.

Para o que já foi construído e como mexer nele, veja [CLAUDE.md](../CLAUDE.md).
Para as regras de negócio, [escopo.md](escopo.md).

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

Hoje há 4 Universos e 19 comunidades que eu escolhi como ponto de partida
(`npm run conteudo:inicial`). Quais entram no lançamento é decisão de produto.

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

## 2. Cadastro: o que o PO pediu em 4 de outubro

Quatro pedidos, com o custo de cada um medido no código de hoje.

### Tornar o @ obrigatório — **custo baixo**

Hoje o campo é "@ (opcional)": em branco, o Hub gera um a partir do nome.
Tornar obrigatório é mudar o rótulo, exigir o campo e tirar o `.optional()`
do schema em [features/autenticacao/actions.ts](../features/autenticacao/actions.ts).

Uma consequência a decidir: o caminho do **Google** não tem como pedir o @ na
mesma tela, porque a pessoa volta do Google já autenticada. Hoje existe uma
tela de "completar cadastro" para isso, e ela continuaria sendo o lugar.

### Avisar que o @ já existe — **já funciona**

Já está pronto, em três camadas: a tela avisa enquanto a pessoa digita (sem
esperar o envio), o servidor confere de novo antes de criar, e o banco tem
índice único por trás. Nada a fazer.

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

Feito: **F00 a F06**. Faltam 15.

| | Feature | Depende de | O que entrega |
|---|---|---|---|
| F07 | Comunidades | F06 | Criar, entrar, sair, página da comunidade |
| F08 | Tópicos | F07 | Criar e ver tópicos |
| F09 | Respostas | F08 | O conteúdo principal do Hub |
| F10 | Ciclo do Hot Topic | F09 | A virada das 00h, que é o motivo de voltar |
| F11 | Início | F10 | A primeira tela de quem entra |
| F12 | Perfil, seguir e Coleção | F09 | Afinidade entre pessoas |
| F13 | Cabine | F12 | Conversa privada |
| F14 | Compartilhar e convite por link | F13 | Crescimento |
| F15 | Notificações | F13 | Motivo de voltar |
| F16 | Denúncia, bloqueio e moderação | F09, F13 | Segurança |
| F17 | Configurações e LGPD | F15 | Exportar e excluir conta |
| F18 | Termos e privacidade | F03 | Texto completo — **já destravada**, só falta o texto |
| F19 | Métricas e eventos | F14 | Saber se funciona |
| F20 | Qualidade final da web | todas | Revisão geral |
| F21 | Versão de celular | F20 | O mesmo código, acima e abaixo de 768 px |

**Atalhos que precisam ser preenchidos:** `/inicio`, `/topico/[id]` e `/termos`
existem como páginas mínimas, só para os caminhos não caírem em 404. Serão
substituídas pela F11, F08 e F18.

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
