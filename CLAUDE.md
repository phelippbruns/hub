# Hub

## Visão do produto

O Hub é uma rede social que transforma interesses em relações: começa pelo interesse compartilhado, não pela pessoa.
A cadeia que o produto sustenta é Interesse → Comunidade → Tópico → Resposta → Afinidade → Conversa → Relação.
Universo organiza, comunidade conecta, tópico provoca, resposta participa, cabine aproxima.
Não há curtidas, contador por resposta nem feed infinito: o Início termina em "Você está em dia".
O motivo para voltar é o ciclo diário — às 00h, o tópico com mais pessoas diferentes respondendo vira o Hot Topic da comunidade.

Fonte completa: [docs/escopo.md](docs/escopo.md). Backlog e ordem das features: [docs/backlog.md](docs/backlog.md). O que falta: [docs/pendencias.md](docs/pendencias.md).

**Leia [docs/faustao.md](docs/faustao.md) antes de dizer que algo está pronto.** É o registro dos erros já cometidos neste projeto: o que aconteceu, por que passou pelas verificações, como foi resolvido e se já existe barreira automática. Quase todos passaram por alguma conferência que parecia suficiente. Erro novo entra lá.

## Para quem você escreve

**Phelipp é pessoa de produto, não engenheiro.** Ele decide o que o Hub é; não decifra rastro de pilha.

- Lidere pela **decisão e pela consequência**: o que muda para quem usa, o que custa, o que trava se nada for feito.
- Detalhe técnico entra quando muda uma escolha dele — e vem explicado, não como jargão.
- Quando algo depender dele, dê **o passo exato**: onde clicar, o que colar, como saber que deu certo.
- Seja franco sobre o que quebrou e por quê. Ele quer saber dos erros; só não quer traduzi-los.

Isso muda a **comunicação**, não o rigor: teste, verificação no ambiente publicado e Faustão seguem iguais.

## Stack

| Camada         | Tecnologia                                           | Uso no Hub                                                                 |
| -------------- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| Aplicação      | Next.js (App Router) com TypeScript estrito          | Telas, rotas, Server Components e Server Actions                           |
| Acesso a dados | Prisma                                               | Schema, migrations e consultas no servidor                                 |
| Banco          | Supabase Postgres                                    | Dados, funções de regra, Row Level Security e pg_cron para o ciclo das 00h |
| Login          | Supabase Auth com `@supabase/ssr`                    | Email e senha, Google, sessão em cookie seguro                             |
| Arquivos       | Supabase Storage                                     | Capas, fotos de perfil e imagens de respostas                              |
| Tempo real     | Supabase Realtime                                    | Mensagens da Cabine                                                        |
| Validação      | Zod                                                  | Toda entrada de formulário e de Server Action                              |
| GIFs           | API do GIPHY chamada pelo servidor                   | Chave nunca exposta ao navegador                                           |
| Notificações   | Web Push com service worker                          | Push na PWA instalada                                                      |
| Estilo         | Tailwind CSS mapeado para os tokens do design system | Nenhuma cor fora dos tokens                                                |
| Testes         | Vitest para regras, Playwright para jornadas         | Cobrir regras de negócio e fluxos                                          |

O MVP é uma **web responsiva instalável (PWA)**. Apps de loja ficam para depois.

## Estrutura de pastas

```
app/                 rotas, layouts e rotas de metadata (manifest)
features/<nome>/     componentes, actions, regras e testes de cada feature
lib/env.ts           validação Zod das variáveis de ambiente
lib/data/            ÚNICA camada que fala com o Prisma e confere permissão
lib/data/viewer.ts   quem está pedindo: anônimo ou pessoa com sessão
lib/data/errors.ts   erros tipados, e a tradução do erro do banco em RN
lib/data/validation.ts  schemas Zod, inclusive o bloqueio de links (RN16)
lib/data/access.ts   conferências reaproveitadas: bloqueio, membro, comunidade em comum
lib/supabase/        clientes @supabase/ssr (server, client, session)
lib/auth/            sessão, verificação de idade, geração do @ e destinos permitidos
design/tokens.ts     tokens GERADOS de docs/design-system/tokens.json
design/tokens.css    os mesmos tokens como tema do Tailwind
design/icons/        ícones em SVG, 2 px numa grade de 24
design/components/   componentes base
design/gallery.tsx   a galeria servida em /design
prisma/              schema e migrations
supabase/            config local, políticas RLS e funções SQL
e2e/                 jornadas no Playwright
docs/                escopo, backlog, design system e protótipo de telas
proxy.ts             Content-Security-Policy com nonce + refresh da sessão
next.config.ts       cabeçalhos de segurança estáticos
```

Uma feature não importa de outra. O que é compartilhado sobe para `design/` (visual) ou `lib/` (lógica).

## As 10 regras de segurança

Valem para toda feature, sem exceção.

1. **Autorização no servidor, sempre.** O Prisma conecta ao banco com permissão ampla e ignora o Row Level Security. Por isso toda leitura e escrita passa por uma camada única de acesso a dados (`lib/data/`) que confere quem está pedindo e se pode. Nenhum componente chama o Prisma direto.
2. **Row Level Security ligado mesmo assim.** Serve de segunda barreira e é obrigatório onde o navegador fala direto com o Supabase, como o Realtime da Cabine e o Storage.
3. **Segredos só no servidor.** Chave de serviço do Supabase, chave do GIPHY e URL do banco nunca em variáveis com prefixo `NEXT_PUBLIC_`. Variáveis de ambiente validadas com Zod na inicialização.
4. **Toda entrada validada com Zod** no servidor, inclusive limites de caracteres, tipos de arquivo e tamanhos, mesmo que a tela já valide.
5. **Server Actions protegidas**: cada uma confere a sessão e a permissão no início, e as regras com limite (tópico por dia, convites por dia) têm limitação de taxa.
6. **Cabeçalhos de segurança**: Content Security Policy, HSTS, X Frame Options e Referrer Policy configurados no next.config.
7. **Uploads seguros**: tipos permitidos, tamanho máximo, URLs assinadas com validade curta e remoção de metadados de localização das fotos.
8. **Sem HTML vindo do usuário**: texto de resposta, tópico e mensagem é sempre renderizado como texto.
9. **Dependências**: Dependabot e npm audit na CI; pull request não passa com vulnerabilidade alta.
10. **Dados mínimos em logs e eventos**: só ids internos, nunca email, nome ou conteúdo.

O `npm audit` bloqueante na CI olha as dependências de produção. A árvore completa roda em seguida, informativa: hoje o ESLint do Next puxa `braces` com um aviso alto e sem correção publicada. Quando um aviso tiver correção, resolva com `overrides` no `package.json`, como já é feito para `mysql2` e `deepmerge-ts`.

Onde cada uma está implementada hoje: 1 em `lib/data/` + regra de lint em `eslint.config.mjs`; 3 em `lib/env.ts`; 6 em `next.config.ts` (estáticos) e `proxy.ts` (CSP com nonce); 9 em `.github/workflows/ci.yml` e `.github/dependabot.yml`. As demais entram com as features que as exercem.

## Regras de código

**Nunca use cor ou tamanho fora dos tokens.** Nenhum hex, nenhum `px` solto, nenhuma classe arbitrária do Tailwind (`text-[#1E1A33]`, `p-[13px]`). Cor, tipografia, espaçamento e raio vêm de [design/tokens.ts](design/tokens.ts), gerado a partir de [docs/design-system/tokens.json](docs/design-system/tokens.json).

Duas defesas sustentam a regra. A primeira é estrutural: [design/tokens.css](design/tokens.css) zera as escalas padrão do Tailwind com `--color-*: initial`, então `bg-red-500` e `p-7` **não existem**. A segunda é [design/tokens.test.ts](design/tokens.test.ts), que falha se aparecer hex, `rgb()` ou valor arbitrário em px/rem no código.

Para mudar um valor, mude o JSON e rode `npm run tokens`. Nunca edite `design/tokens.ts` ou `design/tokens.css` à mão — a CI confere com `npm run tokens:check`.

As medidas de controle (ícone, marca, avatar, miniatura, interruptor, coluna de conteúdo) também são tokens, na seção `size` do JSON, e viram utilitário do Tailwind: `size-mark`, `h-toggleH`, `max-w-contentColumn`. Não existe pixel escrito à mão no código.

**O id de quem está pedindo vem da sessão, nunca do formulário.** `getViewer()` ([lib/auth/session.ts](lib/auth/session.ts)) é a única ponte entre o Supabase Auth e a camada de dados. Server Action que aceitasse um `profileId` do corpo da requisição deixaria qualquer pessoa agir como outra.

**Verificação de idade é plugável e nega por padrão** (RN29). `resolveAgeVerifier()` só devolve o verificador falso com `AGE_VERIFIER=fake`, e [lib/env.ts](lib/env.ts) derruba o build se essa variável aparecer com um Supabase que não é local. Sem provedor configurado, produção **recusa o cadastro** — liberar sem verificar seria descumprir a regra calado.

**Mensagem de erro de autenticação nunca diz se o email existe.** Senha errada e email desconhecido respondem igual; pedir código responde igual nos dois casos. Senão o formulário vira ferramenta de descobrir quem tem conta no Hub.

**Toda função de `lib/data/` recebe o `Viewer` como primeiro argumento.** É o que torna a conferência de permissão obrigatória por construção, em vez de depender de lembrar. A forma é sempre: valida com Zod → confere sessão, permissão e bloqueio → só então chama o Prisma.

```ts
export async function createAnswer(viewer: Viewer, input: unknown) {
  const me = requireProfileId(viewer);           // RN: exige sessão
  const data = createAnswerSchema.parse(input);  // regra de segurança 4
  await requireActiveMembership(me, communityId); // regras 1 e 5
  return prisma.answer.create({ ... });
}
```

**Regra que tem gatilho no banco também tem checagem no app** — mas por motivos diferentes. A checagem no app dá a mensagem boa; o gatilho é quem garante a regra quando duas requisições chegam ao mesmo tempo. Quando o gatilho dispara, `translateDatabaseError` converte o erro do Postgres na RN certa. Nunca remova um dos dois.

**Cite o código da RN em comentários e testes.** Toda regra de negócio implementada leva o código da regra no comentário, e o teste que a cobre leva o código no nome:

```ts
// RN07: cada pessoa cria no máximo 1 tópico por dia em cada comunidade.
it("RN07: recusa o segundo tópico do dia na mesma comunidade", async () => { … });
```

As regras RN01 a RN34 estão em [docs/escopo.md](docs/escopo.md).

**As rotas vêm do protótipo.** A barra de endereço de cada tela em [docs/telas.html](docs/telas.html) define a URL: `/c/<comunidade>/<topico>`, `/u/<universo>`, `/perfil`, e o perfil de outra pessoa **na raiz** (`/lia`).

**Rota nova de primeiro nível exige @ reservado.** Como o perfil mora na raiz, quem registrasse `@inicio` ficaria inalcançável para sempre — o Next casa rota estática antes de dinâmica e nada avisaria. A lista está em [lib/data/validation.ts](lib/data/validation.ts) e [lib/data/rotas.test.ts](lib/data/rotas.test.ts) varre `app/` e falha se faltar alguma.

**As jornadas rodam em série.** Elas compartilham um banco, um servidor Next e um Supabase com limite de autenticação de verdade; em paralelo falham por 429 ou tempo esgotado, nunca pelo que queriam verificar. `playwright.config.ts` fixa `workers: 1`.

**Componente de cliente não importa `lib/data/`.** Mesmo indiretamente: um reexport inocente arrasta o Prisma e o `pg` para o pacote do navegador, e o build quebra com _"Can't resolve 'dns'"_, que não diz nada sobre a causa. Constantes que a tela e a camada de dados compartilham moram em `features/<nome>/shared.ts`.

**A tela /design mostra o sistema inteiro.** Antes de criar um componente, olhe [design/components/](design/components/) e a galeria em `/design`. Componente novo entra na galeria junto.

**Toda rota renderiza por requisição.** [app/layout.tsx](app/layout.tsx) marca `export const dynamic = "force-dynamic"` para o app inteiro. Motivo: a CSP exige nonce nos scripts, e o Next só injeta o nonce fora do prerender estático — numa rota estática o navegador bloqueia todos os scripts, sem erro no build e sem teste vermelho. Como quase tudo no Hub é por usuário, o prerender valeria para pouca coisa. Vale só para o HTML: JavaScript, CSS, fontes e imagens continuam no cache da borda.

Não remova essa linha, e não marque rota como estática. O teste `todo script de <rota> leva nonce` ([e2e/design-system.spec.ts](e2e/design-system.spec.ts)) guarda isso — acrescente cada rota nova à lista dele.

**Só layout de computador até a F21.** Da F00 à F20, implemente apenas o layout acima de 768 px, seguindo a versão web de cada tela em [docs/telas.html](docs/telas.html). Não crie estilos de celular nem breakpoints.

## Comandos

### App

```bash
npm run dev          # desenvolvimento em http://localhost:3000
npm run build        # build de produção (falha se faltar variável de ambiente)
npm run start        # servir o build
npm run lint         # ESLint, com as regras de segurança
npm run format       # Prettier
npm run typecheck    # tsc --noEmit
```

### Testes

```bash
npm run tokens       # regerar design/tokens.ts e tokens.css do JSON
npm run test         # Vitest: regras, contraste, snapshots (sem banco)
npm run test:db      # regras no banco e RLS (exige `npm run supabase:start`)
npm run test:e2e     # jornadas; a recuperação de senha lê o email no Mailpit
                     # (http://localhost:54324), então exige o Supabase local
npm run test:watch   # Vitest em modo contínuo
npm run test:e2e     # Playwright: jornadas (sobe o build sozinho)
```

### Banco

```bash
npm run supabase:start   # Supabase local (exige o Docker Desktop aberto)
npm run supabase:stop
npm run db:generate      # gerar o cliente Prisma
npm run db:migrate       # aplicar migrations em desenvolvimento
npm run db:deploy        # aplicar migrations no banco local
npm run db:deploy:remoto # aplicar migrations num banco remoto, pedindo a
                         # conexão e a senha (que não aparece na tela nem
                         # entra no histórico do terminal)
npm run db:seed          # popular com os dados do protótipo (só banco local)
npm run db:studio        # inspecionar os dados
```

### Migrations são escritas à mão

`prisma migrate dev` **não funciona neste projeto**: ele introspecta o banco e
esbarra na chave estrangeira de `profiles` para `auth.users`, que é schema do
Supabase e não do Prisma (erro P4002). Banco de sombra não resolve, porque a
leitura que falha é a do banco de desenvolvimento.

Para mudar o schema: edite `prisma/schema.prisma`, escreva o SQL em
`prisma/migrations/<data>_<nome>/migration.sql` e rode `npm run db:deploy`
seguido de `npm run db:generate`. É o mesmo caminho das funções, gatilhos e
políticas desde a F02.

### Idade mínima

**18 anos**, definida pelo PO e fixada em `MINIMUM_AGE` ([lib/auth/age-verifier.ts](lib/auth/age-verifier.ts)).
O escopo e a RN29 ainda falam em 16 — vale alinhar o documento.

A verificação usa **só a data declarada** (`AGE_VERIFIER=self_declared`), o que
a RN29 proíbe. É decisão registrada do PO para permitir cadastros de teste, e
precisa sair antes do lançamento. O perfil guarda `birthDate`,
`ageVerificationStatus`, `ageVerificationMethod` e `ageVerifiedAt` justamente
para dar para encontrar depois quem passou por autodeclaração.

### Deploy

```bash
npm run verificar:deploy <url>   # confere que o site publicado responde
```

**O deploy aplica as migrations sozinho.** `vercel-build` roda `prisma migrate deploy` antes do `next build`, e a Vercel prefere esse script ao `build`. Sem isso, mergear uma feature com migration deixava o banco remoto atrás do código, e o erro só aparecia quando alguém usava a tela — aconteceu duas vezes.

Para aplicar à mão num banco remoto, `npm run db:deploy:remoto`.

**Comunidade sem moderador é um buraco.** A RN06 liga a moderação a quem criou, e as comunidades da plataforma nascem sem criador — ou seja, sem ninguém para atender denúncia. `npm run moderacao:atribuir` dá um dono às que estão órfãs, e só a elas. É a ponte até a plataforma ter um dono de moderação próprio.

**Banco novo também precisa de conteúdo.** `npm run conteudo:inicial` acrescenta os Universos e as comunidades de partida. Diferente de `npm run db:seed`, que é de desenvolvimento e **trunca tudo**, este só acrescenta — roda quantas vezes quiser, em qualquer ambiente. Sem ele o onboarding é impossível de concluir, porque a RN31 exige escolher 3 comunidades.

**`DIRECT_URL` é o pooler de sessão, não a conexão direta.** `db.PROJETO.supabase.co` só responde em IPv6, e ambientes de build como a Vercel são IPv4: de lá ela falha com `P1001: Can't reach database server`. Funciona da máquina de quem tem IPv6, que é como o erro passa despercebido.

**`updated_at` não tem valor padrão no banco.** O `@updatedAt` do Prisma é preenchido pelo cliente, então todo `INSERT` em SQL cru precisa escrever a coluna.

**Build verde não é app no ar.** A Vercel marca o deploy como bem-sucedido quando o código compila, não quando o app responde. Da F01 à F03 ela publicou a pasta `public/` como site estático enquanto o Next.js compilado era descartado: toda rota dava 404, com o sinal verde o tempo todo.

[vercel.json](vercel.json) fixa `framework: nextjs` no repositório, para a configuração não depender do painel. E `npm run verificar:deploy` busca as rotas de verdade. **Rode-o, e abra a página, antes de dizer que uma feature está pronta.**

### Ambiente

Copie `.env.example` para `.env.local` e preencha com os valores do projeto Supabase. `DATABASE_URL` é o pooler (porta 6543); `DIRECT_URL` é a conexão direta (porta 5432), exigida pelas migrations. Nenhum valor real entra no repositório.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
