# Pendências do Hub

Atualizado em 4 de outubro de 2026, depois da F04.

O que falta para o Hub existir. Separado pelo que **impede o lançamento**, pelo
que é **decisão sua**, pelo que é **dívida técnica** e pela **fila de features**.

Para o que já foi construído e como mexer nele, veja [CLAUDE.md](../CLAUDE.md).
Para as regras de negócio, [escopo.md](escopo.md).

---

## 1. Impede o lançamento

Três coisas. Nenhuma é de código: todas dependem de decisão ou de contrato.

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

---

## 2. Decisões suas, fora do código

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

## 3. Dívida técnica

Coisas que funcionam, mas que vão cobrar caro se ficarem como estão.

### 3.1 Um banco só para tudo

Produção e os previews de cada PR usam **o mesmo banco**. Um teste num PR mexe
no mesmo lugar que os dados de verdade. Enquanto só há contas de teste, tudo
bem; depois, não.

O caminho é um projeto Supabase separado para homologação.

### 3.2 `prisma migrate dev` não funciona

Ele introspecta o banco e esbarra na chave de `profiles` para `auth.users`, que
é schema do Supabase e não do Prisma (erro P4002). Banco de sombra não resolve.

Por isso **toda migration é escrita à mão**. Funciona e está documentado, mas é
um passo manual a mais e uma chance a mais de erro.

### 3.3 Avisos de dependência sem correção

O `eslint-config-next` depende de `braces`, que tem um aviso alto **sem versão
corrigida publicada**. A CI bloqueia por vulnerabilidade só nas dependências de
produção; a árvore completa roda como aviso.

Revisar quando o Next publicar correção.

### 3.4 Ícones da PWA são provisórios

Quadrados sólidos gerados por script. Os definitivos dependem da identidade
visual.

### 3.5 Jornadas rodam em série

As 30 jornadas rodam uma de cada vez, porque em paralelo disputam banco,
servidor e o limite de autenticação do Supabase. Custa cerca de um minuto. Se a
suíte crescer muito, vai precisar de bancos isolados por trabalhador.

---

## 4. Fila de features

Feito: **F00 a F04**. Faltam 17.

| | Feature | Depende de | O que entrega |
|---|---|---|---|
| F05 | Navegação e layout | F01 | A casca do app: navegação lateral e painel de contexto |
| F06 | Explorar, busca e Universos | F05 | Achar comunidades e pessoas |
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
| F18 | Termos e privacidade | F03 | Texto completo |
| F19 | Métricas e eventos | F14 | Saber se funciona |
| F20 | Qualidade final da web | todas | Revisão geral |
| F21 | Versão de celular | F20 | O mesmo código, acima e abaixo de 768 px |

**Atalhos que precisam ser preenchidos:** `/inicio`, `/topico/[id]` e `/termos`
existem como páginas mínimas, só para os caminhos não caírem em 404. Serão
substituídas pela F11, F08 e F18.

---

## 5. Pontos em aberto do escopo

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

## 6. O que fazer agora

1. **Criar sua conta** em `/criar-conta` com o @ `phebruns`
2. Rodar `npm run moderacao:atribuir` para as 19 comunidades ganharem dono
3. Seguir para a **F05**, que destrava toda a sequência de telas

Em paralelo, e sem pressa de código: começar a conversa jurídica sobre
verificação de idade. É o item que mais demora e o que mais bloqueia.
