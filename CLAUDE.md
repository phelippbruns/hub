# Hub

## Visão do produto

O Hub é uma rede social que transforma interesses em relações: começa pelo interesse compartilhado, não pela pessoa.
A cadeia que o produto sustenta é Interesse → Comunidade → Tópico → Resposta → Afinidade → Conversa → Relação.
Universo organiza, comunidade conecta, tópico provoca, resposta participa, cabine aproxima.
Não há curtidas, contador por resposta nem feed infinito: o Início termina em "Você está em dia".
O motivo para voltar é o ciclo diário — às 00h, o tópico com mais pessoas diferentes respondendo vira o Hot Topic da comunidade.

Fonte completa: [docs/escopo.md](docs/escopo.md). Backlog e ordem das features: [docs/backlog.md](docs/backlog.md).

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
lib/supabase/        clientes @supabase/ssr (server, client, session)
design/              tokens e componentes base (F01)
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

**Nunca use cor ou tamanho fora dos tokens.** Nenhum hex, nenhum `px` solto, nenhuma classe arbitrária do Tailwind (`text-[#1E1A33]`, `p-[13px]`). Cor, tipografia, espaçamento e raio vêm de `design/tokens.ts`, gerado a partir de [docs/design-system/tokens.json](docs/design-system/tokens.json). Precisa de um valor que não existe? Discuta o token antes de escrever a classe.

**Cite o código da RN em comentários e testes.** Toda regra de negócio implementada leva o código da regra no comentário, e o teste que a cobre leva o código no nome:

```ts
// RN07: cada pessoa cria no máximo 1 tópico por dia em cada comunidade.
it("RN07: recusa o segundo tópico do dia na mesma comunidade", async () => { … });
```

As regras RN01 a RN34 estão em [docs/escopo.md](docs/escopo.md).

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
npm run test         # Vitest: regras de negócio
npm run test:watch   # Vitest em modo contínuo
npm run test:e2e     # Playwright: jornadas (sobe o build sozinho)
```

### Banco

```bash
npm run supabase:start   # Supabase local (exige Docker rodando)
npm run supabase:stop
npm run db:generate      # gerar o cliente Prisma
npm run db:migrate       # criar e aplicar migration em desenvolvimento
npm run db:deploy        # aplicar migrations existentes
npm run db:studio        # inspecionar os dados
```

### Ambiente

Copie `.env.example` para `.env.local` e preencha com os valores do projeto Supabase. `DATABASE_URL` é o pooler (porta 6543); `DIRECT_URL` é a conexão direta (porta 5432), exigida pelas migrations. Nenhum valor real entra no repositório.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
