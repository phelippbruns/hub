# Hub: backlog de prompts do MVP para Claude Code

Oct 2, 2026 · @Phelipp Bruns

## Como usar

Cada feature tem um prompt fechado: o que construir, quais regras de negócio valem, como saber que terminou. Assim, quando uma regra mudar, você reabre só o prompt daquela feature, sem mexer no resto.

1. **Uma feature por sessão.** Abra uma conversa nova no Claude Code para cada prompt. O contexto fica limpo e o histórico de cada feature fica separado.
2. **Planeje antes de codar.** Comece cada prompt no modo de planejamento (Shift+Tab duas vezes no Claude Code). Leia o plano, corrija e só então libere a execução.
3. **Um branch por feature.** Exemplo: `feat/f08-topicos`. Ao terminar, abra um pull request com o código da feature no título.
4. **Siga a ordem.** A tabela de dependências mostra o que precisa existir antes. Pular etapas gera retrabalho.
5. **Registre mudanças no prompt, não só no código.** Se uma regra mudar durante a construção, atualize o prompt e o escopo. O prompt é a fonte da verdade da feature.
6. **Revise como PO.** Ao fim de cada feature, confira os critérios de aceite no app rodando, não só no relatório do Claude Code.

**Web primeiro.** Da F00 à F20, construa só o layout de computador (acima de 768 px), seguindo a versão web de cada tela do protótipo. A versão de celular, no mesmo código, entra na F21, depois que os fluxos estiverem validados na web. Acrescente esta frase a todo prompt da F00 à F20: "Nesta fase, implemente só o layout acima de 768 px; não crie estilos de celular."

## Premissas técnicas

A stack foi definida pelo time: Next.js, Prisma e Supabase, com prioridade para segurança no código. Como o Next.js gera aplicação web, o MVP será uma **web responsiva instalável (PWA)**: no celular, a pessoa abre pelo navegador ou instala na tela inicial; no computador, usa a versão com navegação lateral. Apps nativos de loja ficam para depois do MVP.

| Camada | Tecnologia | Uso no Hub |
| --- | --- | --- |
| Aplicação | Next.js (App Router) com TypeScript estrito | Telas, rotas, Server Components e Server Actions |
| Acesso a dados | Prisma | Schema, migrations e consultas no servidor |
| Banco | Supabase Postgres | Dados, funções de regra, Row Level Security e pg\_cron para o ciclo das 00h |
| Login | Supabase Auth com @supabase/ssr | Email e senha, Google, sessão em cookie seguro |
| Arquivos | Supabase Storage | Capas, fotos de perfil e imagens de respostas |
| Tempo real | Supabase Realtime | Mensagens da Cabine |
| Validação | Zod | Toda entrada de formulário e de Server Action |
| GIFs | API do GIPHY chamada pelo servidor | Chave nunca exposta ao navegador |
| Notificações | Web Push com service worker | Push na PWA instalada |
| Estilo | Tailwind CSS mapeado para os tokens do design system | Nenhuma cor fora dos tokens |
| Testes | Vitest para regras, Playwright para jornadas | Cobrir regras de negócio e fluxos |

**Arquivos de referência no repositório.** Antes da F00, coloque na pasta `docs/`:

1. `docs/escopo.md`: exportação em Markdown do documento Hub: Escopo do MVP. É a fonte das regras RN01 a RN34.
2. `docs/telas.html`: o protótipo hub-telas-final.html, com celular e web.
3. `docs/design-system/`: os tokens (tokens.json) e o guia (README.md) do design system do Hub.

Todo prompt manda o Claude Code ler esses arquivos. Quando o escopo mudar, substitua o arquivo e rode o prompt de manutenção "mudar regra".

### Regras de segurança para todos os prompts

Estas regras valem para toda feature e estão repetidas no CLAUDE.md criado na F00.

1. **Autorização no servidor, sempre.** O Prisma conecta ao banco com permissão ampla e ignora o Row Level Security. Por isso, toda leitura e escrita passa por uma camada única de acesso a dados (`lib/data/`) que confere quem está pedindo e se pode. Nenhum componente chama o Prisma direto.
2. **Row Level Security ligado mesmo assim.** Serve de segunda barreira e é obrigatório onde o navegador fala direto com o Supabase, como o Realtime da Cabine e o Storage.
3. **Segredos só no servidor.** Chave de serviço do Supabase, chave do GIPHY e URL do banco nunca em variáveis com prefixo `NEXT_PUBLIC_`. Variáveis de ambiente validadas com Zod na inicialização.
4. **Toda entrada validada com Zod** no servidor, inclusive limites de caracteres, tipos de arquivo e tamanhos, mesmo que a tela já valide.
5. **Server Actions protegidas**: cada uma confere a sessão e a permissão no início, e as regras com limite (tópico por dia, convites por dia) têm limitação de taxa.
6. **Cabeçalhos de segurança**: Content Security Policy, HSTS, X Frame Options e Referrer Policy configurados no next.config.
7. **Uploads seguros**: tipos permitidos, tamanho máximo, URLs assinadas com validade curta e remoção de metadados de localização das fotos.
8. **Sem HTML vindo do usuário**: texto de resposta, tópico e mensagem é sempre renderizado como texto.
9. **Dependências**: Dependabot e npm audit na CI; pull request não passa com vulnerabilidade alta.
10. **Dados mínimos em logs e eventos**: só ids internos, nunca email, nome ou conteúdo.

## Modelo de prompt e definição de pronto

Todos os prompts seguem a mesma estrutura. Se você precisar criar um prompt novo, copie este modelo.

```text
Feature: [código e nome]
Antes de tudo, leia CLAUDE.md, docs/escopo.md, docs/design-system/ e as telas indicadas em docs/telas.html.

Objetivo: [o que a pessoa usuária consegue fazer ao final]
Telas: [números do mapa de telas, celular e web]
Regras de negócio: [RNxx com resumo]
Escopo: [lista do que construir]
Fora do escopo: [o que não fazer agora]
Critérios de aceite: [comportamentos verificáveis]
Testes: [o que precisa de teste automatizado]

Comece em modo de planejamento. Liste arquivos que vai criar ou alterar e perguntas sobre ambiguidades. Só implemente depois da minha aprovação.
```

**Definição de pronto, válida para toda feature**

1. Funciona na web, acima de 768 px, com a versão web das telas do protótipo como referência visual. O celular é tratado na F21.
2. Usa só tokens e componentes do design system. Nenhuma cor ou tamanho solto no código.
3. Cada regra de negócio citada tem teste automatizado.
4. Estados de carregando, vazio e erro existem para cada lista e cada envio.
5. Textos em português, sem links no conteúdo do usuário, com rótulos de acessibilidade em ícones sem texto.
6. O Claude Code atualiza o CLAUDE.md se criou uma convenção nova.

   Cumpre as regras de segurança e tem ao menos um teste que tenta acessar ou alterar dado de outra pessoa e falha.

## Ordem de execução e dependências

São 22 features em 8 fases: a web primeiro (F00 a F20) e o celular depois (F21). Dentro de uma fase, as features sem dependência entre si podem ser feitas em paralelo, por pessoas diferentes.

| Código | Feature | Depende de | Telas |
| --- | --- | --- | --- |
| F00 | Fundação do repositório e CLAUDE.md | nada | nenhuma |
| F01 | Design system no código | F00 | 29 |
| F02 | Modelo de dados e regras de acesso | F00 | nenhuma |
| F03 | Autenticação e cadastro | F01, F02 | 1, 3, 4 |
| F04 | Onboarding | F03 | 5 |
| F05 | Navegação e layout | F01 | todas |
| F06 | Explorar, busca e Universos | F05 | 9, 10, 11 |
| F07 | Comunidades | F06 | 12, 13, 14 |
| F08 | Tópicos | F07 | 15, 16 |
| F09 | Respostas | F08 | 15 |
| F10 | Ciclo do Hot Topic | F09 | 14 |
| F11 | Início | F10 | 6, 7 |
| F12 | Perfil, seguir e Coleção | F09 | 21, 22, 23, 24 |
| F13 | Cabine | F12 | 17, 18, 19, 20 |
| F14 | Compartilhar e convite por link | F13 | 2, 14, 15 |
| F15 | Notificações | F13 | 8, 25 |
| F16 | Denúncia, bloqueio e moderação | F09, F13 | 26, 27 |
| F17 | Configurações e LGPD | F15 | 25 |
| F18 | Termos e privacidade | F03 | 28 |
| F19 | Métricas e eventos | F14 | nenhuma |
| F20 | Qualidade final da web | todas | todas |
| F21 | Versão de celular | F20 | todas, versão celular |

Os números de tela seguem o mapa de telas do escopo, organizado por feature.

## Fase 1: fundação, design system e dados

### F00. Fundação do repositório e CLAUDE.md

```text
Feature: F00 Fundação do repositório
Leia docs/escopo.md (seções Visão, Estrutura, Princípios e Escopo funcional) e docs/telas.html.

Objetivo: criar o projeto base do Hub como web responsiva instalável (PWA), com segurança desde o primeiro commit.

Escopo:
1. Next.js com App Router, TypeScript estrito e Tailwind CSS.
2. Prisma configurado para o Postgres do Supabase, com DATABASE_URL e DIRECT_URL separadas.
3. Supabase local (supabase init) e cliente @supabase/ssr para servidor, navegador e middleware.
4. Validação de variáveis de ambiente com Zod em lib/env.ts. O build falha se faltar variável. Segredos nunca com prefixo NEXT_PUBLIC_.
5. Estrutura por feature: app/ (rotas), features/<nome>/ (componentes, actions, regras e testes da feature), lib/data/ (única camada que fala com o Prisma e confere permissão), design/ (tokens e componentes base), prisma/ (schema e migrations), supabase/ (políticas RLS e funções SQL).
6. Cabeçalhos de segurança no next.config: Content Security Policy, HSTS, X Frame Options, Referrer Policy e Permissions Policy.
7. ESLint (com regras de segurança), Prettier, Vitest e Playwright, cada um com um teste de exemplo passando.
8. CI no GitHub Actions: lint, tipos, testes, npm audit com falha em vulnerabilidade alta, e Dependabot ligado.
9. Manifest e service worker básicos da PWA.
10. CLAUDE.md na raiz com: visão do produto em 5 linhas, stack, estrutura de pastas, as 10 regras de segurança deste backlog, regra de nunca usar cor ou tamanho fora dos tokens, regra de citar o código da RN em comentários e testes, comandos para rodar app, testes e banco.

Fora do escopo: telas do produto, schema do banco, login.
Critérios de aceite: npm run dev abre uma página vazia; a página responde com os cabeçalhos de segurança; build falha sem variável obrigatória; a CI roda no primeiro pull request.

Comece em modo de planejamento e só implemente depois da minha aprovação.
```

### F01. Design system no código

```text
Feature: F01 Design system
Leia CLAUDE.md, docs/design-system/tokens.json, docs/design-system/README.md e a tela 29 (Estados do sistema) em docs/telas.html.

Objetivo: ter todos os tokens, ícones e componentes base prontos antes de qualquer tela.

Escopo:
1. Tokens em design/tokens.ts gerados a partir de tokens.json e expostos como variáveis CSS e tema do Tailwind: cores (ink, inkMuted, paper, surfacePage, lavender, sun, line, error, success), escala tipográfica, espaçamentos e raios.
2. Fonte Bricolage Grotesque carregada com next/font, com fallback do sistema.
3. Ícones em SVG com traço de 2 px numa grade de 24 px. Ícones de navegação (casa, # em quadrado, balão com reticências, pessoa, sino) seguem a regra: inativo em contorno; ativo preenchido com detalhes internos vazados por máscara, funcionando em fundo claro e escuro.
4. Marcas de nível: { em amarelo para Universo, # em lavanda para comunidade, asterisco desenhado de cinco braços em branco sobre preto para tópico. O asterisco também existe em tamanho de texto para nomes de tópico.
5. Componentes: Botão (primário, secundário, destaque amarelo, ícone), Chip com ✓ quando selecionado, Campo de texto com contador, Marca de nível, Cartão de Hot Topic, Cartão de resposta, Linha de comunidade com miniatura de capa, Linha de tópico, Abas, Folha inferior (bottom sheet), Caixa de seleção, Interruptor.
6. Estados: carregando com blocos estáticos, erro com tentar de novo, vazio, fim de lista "Você está em dia", desativado com texto explicativo.
7. Uma tela interna /design que mostra tudo isso, para conferência visual.

Fora do escopo: telas do produto.
Critérios de aceite: a tela /design reproduz a tela 29 do protótipo; nenhum componente usa cor fora dos tokens; ícones sem texto têm rótulo de acessibilidade; contraste de texto segue a tabela do design system.
Testes: snapshot dos componentes e teste do contraste dos pares de cor permitidos.

Comece em modo de planejamento e só implemente depois da minha aprovação.
```

### F02. Modelo de dados e regras de acesso

```text
Feature: F02 Modelo de dados e acesso
Leia CLAUDE.md e docs/escopo.md inteiro, com atenção às regras RN01 a RN34.

Objetivo: criar o banco com todas as tabelas, relações, regras e camada de acesso segura.

Escopo:
1. Schema Prisma para: profiles (nome, @ único, foto opcional, descrição até 120, data de verificação de idade, versão dos termos aceita), universes, communities (nome único normalizado, intro até 240, capa, universo, contagem de membros), memberships (membro ou moderador, data de entrada), topics (nome, descrição até 240, mídia, autor, comunidade, apagado), answers (texto até 240, mídia, autor, tópico, apagado), follows (comunidade, tópico ou pessoa), hot_topics (comunidade, tópico, data do ciclo), cabins, cabin_members, cabin_invites (pendente, aceito, recusado, cancelado), messages, blocks, reports, moderation_actions, notifications, analytics_events.
2. Migrations geradas pelo Prisma. Funções SQL, gatilhos e políticas RLS em migrations SQL próprias, versionadas junto.
3. Normalização do nome de comunidade para RN04: ignora maiúsculas, acentos, espaços e plural simples, com índice único.
4. Regras garantidas no banco, não só no app: 1 tópico por pessoa por dia por comunidade (RN07); 10 convites de Cabine por dia contando pendentes (RN21); Cabine de 2 a 5 pessoas (RN20); apagar tópico só com menos de 5 respostas de outras pessoas (RN08).
5. Row Level Security em todas as tabelas, como segunda barreira, e obrigatório em messages, cabin_members e storage, que o navegador acessa direto.
6. Camada lib/data/ com funções por caso de uso (por exemplo getTopicForViewer, createAnswer). Cada função recebe o usuário da sessão, confere permissão e bloqueios e só então chama o Prisma. Proibido importar o Prisma fora de lib/data/.
7. Regra de lint ou teste que falha se o Prisma for importado fora de lib/data/.
8. Seed com os Universos, comunidades e pessoas do protótipo.

Fora do escopo: telas e tarefa agendada do ciclo.
Critérios de aceite: migrations rodam do zero; seed popula o banco; cada regra citada tem teste que tenta violá-la e falha; um usuário não consegue ler Coleção, mensagens ou lista de seguindo de outro, nem pela camada de dados nem pelo Supabase direto.
Testes: RN04, RN07, RN08, RN20, RN21, políticas RLS e autorização da camada lib/data/.

Comece em modo de planejamento e só implemente depois da minha aprovação.
```

## Fase 2: autenticação, onboarding e navegação

### F03. Autenticação e cadastro

```text
Feature: F03 Autenticação
Leia CLAUDE.md, docs/escopo.md (RN17, RN29, RN30) e as telas 1, 3 e 4 em docs/telas.html.

Objetivo: a pessoa cria conta, entra e recupera a senha.

Escopo:
1. Tela inicial com a frase "Conecte-se pelo que realmente importa.", Criar conta, Entrar e link para Termos e privacidade. Na web, marca e frase no centro e botões embaixo.
2. Entrar com email e senha; Google como opção abaixo, depois de "ou".
3. Criar conta com nome, email, senha e caixa obrigatória "Li e concordo com os Termos de uso e a Política de privacidade" (RN29).
4. Etapa de verificação de idade como interface plugável: um serviço AgeVerifier com método verify(). No MVP, implemente um verificador falso para desenvolvimento e deixe um comentário TODO apontando a pendência jurídica. Nunca aceitar só a data informada (RN29).
5. Continuar com Google: abre a escolha de conta do Google. Conta já cadastrada entra direto no Início. Conta nova cai em "Complete seu cadastro", com nome e foto vindos do Google (editáveis), @ sugerido, verificação de idade e aceite dos termos. O Google não substitui a verificação de idade.
6. Esqueci a senha: pedir código por email, digitar código de 6 dígitos e nova senha com mínimo de 8 caracteres.
7. Foto opcional; sem foto, avatar padrão (RN30).
8. Telas de entrada sem a navegação do app.
9. Supabase Auth com @supabase/ssr: sessão em cookie httpOnly renovada no middleware; retorno do Google validado contra uma lista de destinos permitidos, para evitar redirecionamento aberto.
10. Limite de tentativas em login, cadastro e recuperação de senha. Mensagens de erro que não revelam se o email existe.

Fora do escopo: onboarding, escolha do provedor real de verificação de idade.
Critérios de aceite: não é possível criar conta sem aceitar os termos; não é possível concluir o cadastro sem passar pelo AgeVerifier; recuperação de senha funciona de ponta a ponta no ambiente local.
Testes: aceite obrigatório, verificação obrigatória, @ gerado único.

Comece em modo de planejamento e só implemente depois da minha aprovação.
```

### F04. Onboarding

```text
Feature: F04 Onboarding
Leia CLAUDE.md, docs/escopo.md (RN31, RN34) e a tela 5 em docs/telas.html, com seus três estados.

Objetivo: a pessoa entende o Hub, entra em ao menos 3 comunidades e decide sobre notificações.

Escopo:
1. Tela "Como o Hub funciona" com três passos: comunidades, tópicos e Hot Topic, Cabines.
2. Escolha de Universos (chips amarelos) e comunidades (chips lavanda). Botão Continuar desativado até 3 comunidades, com contador "2 de 3 escolhidas".
3. Estado vindo de convite: a comunidade do link já vem marcada como "Do seu convite" e conta como uma das 3. Ao terminar, a pessoa volta para o tópico do link, não para o Início.
4. Última tela pede permissão de notificações, com o título "Não perca nada", o texto "Avisamos sobre novidades nos seus tópicos, convites de Cabine e atualizações em comunidades que você segue." e os botões Ativar notificações e Agora não.

Fora do escopo: envio de notificações.
Critérios de aceite: impossível avançar com menos de 3; convite leva de volta ao tópico; recusar notificações não bloqueia o uso.
Testes: regra de 3 comunidades e retorno ao tópico do convite.

Comece em modo de planejamento e só implemente depois da minha aprovação.
```

### F05. Navegação e layout

```text
Feature: F05 Navegação e layout
Leia CLAUDE.md e as telas 6, 9, 20 e 21 em docs/telas.html, versões celular e web.

Objetivo: estrutura de navegação responsiva, igual em todas as telas.

Escopo:
1. (Implementar só na F21) Até 768 px de largura: barra inferior só com ícones (Início, Explorar, Comunidades, Cabine, Perfil), cada um com aria-label. Ícone ativo preenchido, inativos em contorno. Sino de notificações no cabeçalho do Início.
2. Acima de 768 px: navegação lateral estreita só com ícones (com title e aria-label), na ordem Início, Explorar (lupa), Comunidades, Cabine, Perfil e Notificações. Explorar é item próprio no celular e na web, e Comunidades mostra só Minhas comunidades. Embaixo da barra, dois botões: Criar tópico (asterisco) e Criar comunidade (#); conteúdo central com largura máxima (720 px centralizado em todas as telas de conteúdo, com o título alinhado à mesma coluna; largura total no tópico e na página da comunidade). Espaçamento na grade de 8 px, igual no celular e na web: no celular, 16 px nas laterais e 12 px entre componentes; na web, 32 px nas laterais e no topo do conteúdo, 16 px entre componentes, 32 px entre seções, 16 px dentro de cartões e linhas; os botões de criar usam as marcas padrão do design system, reduzidas por escala; painel de contexto à direita quando a tela tiver um.
3. Layout de rotas autenticadas no App Router, com o middleware do Supabase redirecionando quem não tem sessão para a Tela inicial. Telas de entrada e a página de convite ficam fora desse layout.
4. Rotas de todas as telas do mapa, ainda vazias, para as próximas features preencherem.
5. Margens seguras (safe area) para a PWA instalada no iPhone e no Android.
6. PWA instalável: ícones, nome Hub, cor de tema e tela de abertura.

Fora do escopo: conteúdo das telas.
Critérios de aceite: navegar entre as quatro áreas em 390 px e em 1280 px; leitor de tela anuncia o nome de cada ícone; rota autenticada sem sessão redireciona; a PWA instala no Chrome do Android e no Safari do iPhone.
Testes: Playwright navegando pelas quatro áreas nas duas larguras e teste de redirecionamento sem sessão.

Comece em modo de planejamento e só implemente depois da minha aprovação.
```

## Fase 3: descoberta, comunidades, tópicos e respostas

### F06. Explorar, busca e Universos

```text
Feature: F06 Explorar e Universos
Leia CLAUDE.md, docs/escopo.md (RN02, RN05) e as telas 9, 10 e 11 em docs/telas.html.

Objetivo: a pessoa descobre comunidades e pessoas.

Escopo:
1. Explorar: tela própria aberta pela lupa da navegação, com o campo de busca de comunidades, tópicos e pessoas e os filtros Tudo, Comunidades, Tópicos e Pessoas já na tela inicial; na web, centralizada em 720 px e sem painel lateral; campo "Buscar comunidades ou pessoas", grade de Universos com marca { amarela, lista Para você.
2. Cada linha de comunidade mostra miniatura da capa, nome, membros e a marca # que entra na comunidade com um toque.
3. Resultado da busca com abas Tudo, Comunidades e Pessoas. Pessoas mostram @, comunidades em comum e olho para seguir.
4. Comunidade com menos de 20 membros não aparece em Explorar nem em Universos, só na busca (RN05).
5. Página do Universo: busca por nome dentro do Universo e ordem por atividade (padrão) ou mais recentes, com a frase "Toque no # para entrar em uma comunidade".
6. Membros e respostas do dia em linhas separadas na lista.

Fora do escopo: recomendação avançada.
Critérios de aceite: comunidade com 19 membros só aparece na busca; com 20 aparece em Explorar; entrar pelo # atualiza a contagem de membros.
Testes: RN05 e busca sem diferenciar acentos.

Comece em modo de planejamento e só implemente depois da minha aprovação.
```

### F07. Comunidades

```text
Feature: F07 Comunidades
Leia CLAUDE.md, docs/escopo.md (RN03, RN04, RN05, RN06) e as telas 12, 13 e 14 em docs/telas.html, com todos os estados da tela 14.

Objetivo: criar, entrar, sair e navegar numa comunidade.

Escopo:
1. Criar comunidade: área de capa roxa com ícone de imagem em marca d'água para enviar foto; nome; intro até 240 caracteres sem links, em campo alto; Universo. Sem capa enviada, usa a capa padrão do Universo (RN03).
2. Checagem de nome no envio, com a mensagem "Já existe X. Entre nela ou escolha outro nome." (RN04).
3. Aviso "A comunidade fica disponível na aba Explorar ao atingir 20 membros. Enquanto isso, pode ser encontrada pela busca."
4. Página da comunidade: capa com nome no topo; botões voltar, compartilhar e três pontos sobre a capa, que ficam amarelos enquanto a folha de opções está aberta; marca # como botão de entrar e sair ao lado do número de membros; descrição; seção Hot Topic; lista de tópicos.
5. Ordenação dos tópicos por mais respostas (padrão) ou mais recentes, mais uma lupa que abre a busca de tópicos dentro da comunidade.
6. Sair pede confirmação. Se quem sai é moderador, a moderação passa para o membro mais ativo (RN06). Deixe o critério de "mais ativo" numa função isolada, porque ainda está em aberto no escopo.
7. Menu de três pontos: Moderada por, Moderar (só moderadores), Denunciar comunidade.
   Na web, descrição, membros, explicação do Hot Topic e tópicos seguidos da comunidade ficam no painel direito, visível em todos os estados da página, inclusive busca, compartilhar e menu. A capa e o conteúdo ocupam toda a área central. O menu de três pontos tem Ocultar painel lateral (só na web); oculto, o conteúdo ocupa a tela inteira, e a mesma opção do menu traz o painel de volta. Guardar a preferência por pessoa.
   Minhas Comunidades, no celular e na web: título "Minhas Comunidades", busca por texto, ordem alfabética e comunidades fixadas no topo.
8. Minhas comunidades: miniatura, membros e tópicos ativos; linha extra quando o tópico da pessoa está em 2º no ciclo.

Fora do escopo: compartilhar (F14), moderação (F16), Hot Topic real (F10).
Critérios de aceite: nome duplicado é recusado com acento e plural diferentes; criador vira moderador; moderador que sai transfere a moderação.
Testes: RN04, RN06 e ordenação padrão.

Comece em modo de planejamento e só implemente depois da minha aprovação.
```

### F08. Tópicos

```text
Feature: F08 Tópicos
Leia CLAUDE.md, docs/escopo.md (RN07, RN08, RN12, RN15, RN18) e as telas 15 e 16 em docs/telas.html, com todos os estados.

Objetivo: criar, ler, seguir e apagar tópicos.

Escopo:
1. Criar tópico "na comunidade de X": nome com asterisco desenhado, descrição até 240 caracteres, imagem ou GIF como ícones do mesmo tamanho, e o texto "Você pode criar 1 tópico por dia nesta comunidade. O tópico com mais pessoas respondendo até o fim do ciclo, às 00h, fica em destaque."
2. Limite de 1 tópico por pessoa por dia em cada comunidade, com mensagem clara ao atingir (RN07).
3. Página do tópico: cabeçalho com compartilhar em círculo branco e olho para seguir; descrição em cartão escuro, separado das respostas; número de pessoas e de respostas sempre visível (RN15); ordenação por mais respostas ou mais recentes.
4. Seguir pelo olho é sempre manual e salva o tópico na Coleção (RN18).
5. Apagar tópico: disponível só com menos de 5 respostas de outras pessoas, sem contar as do autor, com aviso de que as respostas serão apagadas. Acima disso, a opção aparece desativada com explicação (RN08). Guarde o limite numa configuração, porque pode mudar com a escala.
6. Nomes de tópico em qualquer texto usam o asterisco desenhado no lugar do caractere *.
7. Na web, o tópico ocupa toda a largura, sem painel lateral.

Fora do escopo: respostas (F09) e ciclo (F10).
Critérios de aceite: segundo tópico no mesmo dia é recusado; com 4 respostas de outros o autor apaga, com 5 não; respostas do próprio autor não contam.
Testes: RN07, RN08 e RN18.

Comece em modo de planejamento e só implemente depois da minha aprovação.
```

### F09. Respostas

```text
Feature: F09 Respostas
Leia CLAUDE.md, docs/escopo.md (RN13, RN14, RN15, RN16, RN17) e a tela 15 em docs/telas.html.

Objetivo: responder com texto, imagem ou GIF, e apagar a própria resposta.

Escopo:
1. Campo de resposta com ícones de imagem e GIF do mesmo tamanho, limite de 240 caracteres e contador.
2. Uma imagem ou um GIF por resposta. GIFs pela API do GIPHY com classificação restrita, chamada por rota do servidor, sem expor a chave. Imagens enviadas ao Storage com tipo e tamanho validados no servidor e metadados de localização removidos.
3. Bloqueio de links, inclusive endereços digitados por extenso, com aviso enquanto a pessoa digita e marcação do trecho (RN16). Crie a detecção como função isolada e testada, porque ela será usada em tópicos, descrições, intros e Cabine.
4. Sem respostas encadeadas e sem curtidas (RN13, RN15).
5. Sem edição. O menu da própria resposta tem Apagar resposta, com a dica "Para corrigir, apague e responda de novo" (RN14).
6. Cada resposta mostra foto ou avatar padrão, nome e @; tocar leva ao perfil (RN17).
7. Menu de resposta de outra pessoa: Denunciar e Bloquear (ligados em F16).

Fora do escopo: moderação de imagem automática (anotar como pendência técnica).
Critérios de aceite: "meusite ponto com" e "www.exemplo.com" são bloqueados; 241 caracteres não envia; resposta apagada some para todos.
Testes: detecção de links com pelo menos 15 casos, limite de caracteres, apagar.

Comece em modo de planejamento e só implemente depois da minha aprovação.
```

## Fase 4: ciclo do Hot Topic e Início

### F10. Ciclo do Hot Topic

```text
Feature: F10 Ciclo do Hot Topic
Leia CLAUDE.md, docs/escopo.md (seção Ritual e ciclo, RN09, RN10, RN11) e a tela 14 em docs/telas.html.

Objetivo: todo dia às 00h, cada comunidade ganha um Hot Topic escolhido pela participação.

Escopo:
1. Tarefa agendada com pg_cron às 00h no fuso America/Sao_Paulo (premissa do escopo, ainda em aberto; deixe o fuso numa configuração).
2. Para cada comunidade, escolher o tópico com mais pessoas diferentes respondendo no ciclo anterior (RN09). Uma pessoa vale uma vez, mesmo com várias respostas.
3. O Hot Topic de ontem não pode vencer hoje (RN10). Empate: o tópico mais antigo vence.
4. Comunidade sem respostas no ciclo fica sem Hot Topic; a página mostra os tópicos por ordem padrão.
5. Tópico ativo: ao menos uma resposta nas últimas 24 horas (RN11). Expor a contagem para Minhas comunidades.
6. Posição do tópico de cada pessoa no ciclo em andamento, para a linha "Seu tópico está em 2º".
7. Gravar o resultado em hot_topics e disparar o evento para a notificação "Seu tópico virou Hot Topic" (ligada em F15).

Fora do escopo: mínimo de pessoas para virar Hot Topic (decidido manter sem mínimo por enquanto).
Critérios de aceite: com dados de teste, o vencedor é o de mais pessoas distintas; o vencedor de ontem é pulado; a tarefa pode ser rodada manualmente para testes.
Testes: RN09, RN10, RN11, empate e comunidade vazia.

Comece em modo de planejamento e só implemente depois da minha aprovação.
```

### F11. Início

```text
Feature: F11 Início
Leia CLAUDE.md, docs/escopo.md (Princípios 1 e 3, RN19) e as telas 6 e 7 em docs/telas.html.

Objetivo: o Início mostra o que importa e termina.

Escopo:
1. Seção Hot Topics: o primeiro em cartão escuro com nome da comunidade, pergunta, pessoas e respostas e botão Responder amarelo em largura total; os demais em linhas.
2. Seção Pessoas que você segue: até 3 interações recentes (respondeu ou criou tópico), com Ver todas levando à lista de pessoas seguidas.
3. Seção Suas últimas interações: tópicos em que a pessoa respondeu, com quantas respostas chegaram depois da dela.
4. Seção Tópicos que você segue: com respostas novas e link Ver coleção.
5. Fim de lista "Você está em dia". Nada de rolagem infinita.
6. Estado vazio sem comunidades: sugestões em linhas com seta, que abrem a página da comunidade, e botão Explorar comunidades em largura total.
7. Sino de notificações com ponto amarelo quando há novidade.
8. Web: sem painel lateral, conteúdo centralizado em 720 px.
9. Web: logo abaixo dos Hot Topics vêm os tópicos seguidos com respostas novas; depois, pessoas que você segue e suas últimas interações.

Fora do escopo: central de notificações (F15).
Critérios de aceite: o Início sempre termina; com 0 comunidades mostra o estado vazio; a seção de pessoas nunca passa de 3 itens.
Testes: limite de 3, fim de lista e estado vazio.

Comece em modo de planejamento e só implemente depois da minha aprovação.
```

## Fase 5: perfil, Cabine e compartilhamento

### F12. Perfil, seguir e Coleção

```text
Feature: F12 Perfil
Leia CLAUDE.md, docs/escopo.md (RN18, RN27, RN28) e as telas 21, 22, 23 e 24 em docs/telas.html, com todos os estados.

Objetivo: ver perfis, seguir pessoas, editar o próprio perfil e consultar a Coleção.

Escopo:
1. Perfil de outra pessoa: foto, nome, @, número de seguidores (só informativo, não abre lista), descrição; contadores de respostas, comunidades e dias ativos em três caixas iguais; botões Seguir (olho) e Cabine (balão) dividindo a linha; abas Respostas e Comunidades.
2. Aba Respostas: cada item mostra tópico, pergunta e resposta; tópicos criados aparecem marcados. Aba Comunidades: comunidades em comum primeiro, com selo Em comum.
3. Menu de três pontos: Denunciar perfil, Bloquear, Silenciar no Início.
4. Perfil próprio: seguidores e seguindo lado a lado; seguindo abre a lista de pessoas seguidas, que só o dono vê; menu de três pontos com Editar perfil e Configurações; abas Respostas, Comunidades e Coleção.
5. Coleção, privada: todos os tópicos seguidos, organizáveis por Universo ({ amarelo), comunidade (# lavanda) ou ordem cronológica (relógio), com os ícones à direita.
6. Editar perfil em uma tela: foto centralizada com "Toque na foto para trocar", nome, @ único, descrição até 120 caracteres sem links, Salvar embaixo.
7. Dia ativo conta dias com ao menos uma resposta ou tópico (RN28).
8. Na web, os perfis ficam centralizados, com as informações do topo centradas e sem painel lateral.

Fora do escopo: Cabine (F13).
Critérios de aceite: visitante nunca vê Coleção nem número de pessoas seguidas; @ repetido é recusado; responder não segue o tópico.
Testes: RN27, RN28 e privacidade da Coleção.

Comece em modo de planejamento e só implemente depois da minha aprovação.
```

### F13. Cabine

```text
Feature: F13 Cabine
Leia CLAUDE.md, docs/escopo.md (RN20 a RN26) e as telas 17, 18, 19 e 20 em docs/telas.html, com todos os estados.

Objetivo: conversas privadas que começam por convite aceito.

Escopo:
1. Nova Cabine: mensagem do convite opcional (até 240 caracteres, sem links), busca de pessoas e sugestões com base nas comunidades em comum; seleção de até 4 pessoas; cada uma recebe convite com a mensagem.
2. Só é possível convidar quem divide ao menos uma comunidade; máximo de 10 convites por dia, contando pendentes (RN21).
3. Convite: foto, nome, mensagem de quem convidou, comunidades em comum, Aceitar e Recusar lado a lado, em tamanho normal e centralizados, Bloquear. Fica aberto até resposta; recusa silenciosa; quem convidou pode cancelar (RN22).
4. Privacidade: a pessoa define quem pode convidá-la, membros das suas comunidades ou ninguém (RN23).
5. Lista de Cabines: convites no topo, depois conversas com prévia e contador de não lidas.
6. Conversa em tempo real com Supabase Realtime. O Realtime respeita o RLS e não passa pelo Prisma, então as políticas de messages devem liberar leitura só para participantes da Cabine. Mensagens aceitam imagem ou GIF por mensagem e cartões de comunidade ou tópico compartilhados (RN25). Bloqueio de links no texto.
7. Menu: Convidar pessoas, Denunciar, Bloquear alguém, Ocultar participantes (só na web, esconde o painel lateral) e Sair da Cabine. Com uma pessoa restante, a Cabine se encerra; quem sai volta só por novo convite (RN24).
8. Bloquear tira você das Cabines em comum sem aviso e impede novos convites (RN26).

Fora do escopo: modo história (feature posterior).
Critérios de aceite: 11º convite do dia é recusado; Cabine não abre antes do aceite; mensagem chega em menos de 2 segundos no ambiente local.
Testes: RN20, RN21, RN22, RN24 e RN26.

Comece em modo de planejamento e só implemente depois da minha aprovação.
```

### F14. Compartilhar e convite por link

```text
Feature: F14 Compartilhar
Leia CLAUDE.md, docs/escopo.md (RN16, RN31) e as telas 2, 14 e 15 em docs/telas.html, com o estado Compartilhar.

Objetivo: levar comunidades e tópicos para Cabines e para fora do Hub, transformando o link em convite.

Escopo:
1. Folha de compartilhar, aberta pelo ícone na capa da comunidade e no cabeçalho do tópico: campo Buscar pessoas, lista com seleção múltipla, botão "Enviar para N pessoas", Copiar link e Outros apps.
2. Envio para pessoas cria ou reutiliza uma Cabine e manda o cartão do item.
3. URLs públicas e estáveis para comunidade e tópico, que abrem a PWA quando instalada e o navegador nos demais casos.
4. Página de convite para quem não tem conta, com o mesmo layout da página da comunidade e do tópico (na web, capa em largura total): capa, nome da comunidade, "Compartilhado por @x", membros, descrição, tópico e pergunta. Nomes de quem respondeu também ficam ocultos. Respostas desfocadas sob cadeado com "N respostas de N pessoas". O texto real das respostas nunca é enviado ao navegador de quem não tem conta: o desfoque usa conteúdo de exemplo. Botões Criar conta para ver as respostas e Entrar.
5. Depois do cadastro, a pessoa passa pelo onboarding com a comunidade do convite marcada e volta ao tópico (RN31).
6. Fora do Hub, o nome do tópico aparece sem o asterisco.
7. Metadados de prévia (Open Graph) com nome e capa, sem o texto das respostas.

Fora do escopo: indexação por buscadores (as respostas ficam fechadas por decisão de produto).
Critérios de aceite: link aberto sem conta nunca mostra o texto de respostas; após cadastro, a pessoa cai no tópico do link.
Testes: Playwright do fluxo link, cadastro, onboarding e retorno ao tópico.

Comece em modo de planejamento e só implemente depois da minha aprovação.
```

## Fase 6: notificações, segurança, configurações e termos

### F15. Notificações

```text
Feature: F15 Notificações
Leia CLAUDE.md, docs/escopo.md (RN33, RN34) e as telas 8 e 25 em docs/telas.html.

Objetivo: avisar sobre o que importa, sem excesso.

Escopo:
1. Central de notificações: Agora e Ontem; ações com prazo ou pessoais no topo e destacadas.
2. Tipos: seu tópico virou Hot Topic; convite de Cabine; mensagens de Cabine; respostas novas em tópicos seguidos, agrupadas em um aviso diário; novo Hot Topic em comunidade seguida; sua resposta ou tópico foi removido, com o motivo (RN33).
3. Web Push com service worker na PWA instalada, com chaves VAPID só no servidor. Ligados por padrão: Hot Topic do seu tópico, Cabine e aviso diário de tópicos seguidos. Desligado por padrão: novos tópicos nas comunidades (RN34).
4. Respeitar a escolha feita no onboarding e os ajustes em Configurações.
5. Sem ajuste por comunidade no MVP.

Fora do escopo: email de marketing.
Critérios de aceite: push chega no dispositivo de teste; desligar um tipo para de enviar; aviso diário agrupa várias respostas em uma notificação.
Testes: regras de padrão e agrupamento.

Comece em modo de planejamento e só implemente depois da minha aprovação.
```

### F16. Denúncia, bloqueio e moderação

```text
Feature: F16 Segurança e moderação
Leia CLAUDE.md, docs/escopo.md (RN06, RN26, RN33) e as telas 26 e 27 em docs/telas.html.

Objetivo: manter as comunidades seguras.

Escopo:
1. Denúncia de resposta, tópico, perfil ou comunidade com motivos fixos (assédio ou ódio, conteúdo sexual, spam ou golpe, informação falsa, outro) e texto livre em Outro.
2. Bloquear no mesmo fluxo da denúncia. Bloqueio esconde conteúdo nos dois sentidos, tira das Cabines em comum e impede convites.
3. Tela de moderação para moderadores, com três abas. Denúncias: remover, manter ou banir. Membros: busca por nome ou @, botão Remover com confirmação que oferece também Banir (removido pode voltar, banido não). Moderadores: lista, Adicionar moderador (busca entre membros e convite que precisa ser aceito) e Remover da moderação com confirmação. Quem criou a comunidade não pode ser removido; quem sai da moderação continua membro e é avisado.
4. Remover conteúdo dispara notificação ao autor com o motivo (RN33).
5. Banir da plataforma fica fora do app, como ferramenta interna do Hub. Crie só a tabela e uma função administrativa.
6. Registro de todas as ações em moderation_actions.

Fora do escopo: filtro automático de imagens (pendência técnica).
Critérios de aceite: membro comum não acessa a moderação; banido não vê nem posta na comunidade; denúncia aparece na fila do moderador.
Testes: permissões de moderação e efeitos do bloqueio.

Comece em modo de planejamento e só implemente depois da minha aprovação.
```

### F17. Configurações e LGPD

```text
Feature: F17 Configurações
Leia CLAUDE.md, docs/escopo.md (RN12, RN23, RN26, RN32, RN34) e a tela 25 em docs/telas.html, com todos os estados.

Objetivo: a pessoa controla conta, privacidade, notificações e dados.

Escopo:
1. Conta (nome, foto, email, descrição), Privacidade (quem pode convidar para Cabine), Ordem padrão (mais respostas por padrão), Histórico de atividade, Seus dados, Pessoas bloqueadas e interruptores de notificação.
2. Pessoas bloqueadas: lista com Desbloquear.
3. Seus dados: gerar arquivo com uma cópia dos dados da pessoa.
4. Excluir conta com escolha: manter respostas e tópicos como "Conta excluída" ou apagar tudo. Cabines, perfil e Coleção são apagados nos dois casos (RN32). Prazo para desfazer ainda em aberto: deixe numa configuração com valor zero.

Fora do escopo: atendimento por chat.
Critérios de aceite: exclusão com "manter" troca autor por Conta excluída; exclusão com "apagar" remove tudo; arquivo de dados contém perfil, respostas, tópicos e mensagens.
Testes: os dois caminhos de exclusão.

Comece em modo de planejamento e só implemente depois da minha aprovação.
```

### F18. Termos e privacidade

```text
Feature: F18 Termos e privacidade
Leia CLAUDE.md e a tela 28 em docs/telas.html.

Objetivo: textos legais acessíveis e compreensíveis.

Escopo:
1. Resumo em linguagem simples no topo, em destaque amarelo.
2. Abas Termos de uso e Privacidade, com o texto legal carregado de arquivos Markdown versionados em content/legal/.
3. Registro da versão aceita no cadastro, para exigir novo aceite quando o texto mudar.

Fora do escopo: redação jurídica, que vem do time jurídico.
Critérios de aceite: trocar o arquivo muda o texto sem nova versão do app na web; nova versão dos termos pede novo aceite.

Comece em modo de planejamento e só implemente depois da minha aprovação.
```

## Fase 7: métricas e qualidade final

### F19. Métricas e eventos

```text
Feature: F19 Métricas
Leia CLAUDE.md e docs/escopo.md (seção Hipótese, objetivos e métricas).

Objetivo: medir cada métrica do escopo desde o primeiro dia.

Escopo:
1. Função única track(evento, propriedades) gravando em analytics_events, sem dados pessoais além do id interno.
2. Eventos: resposta criada, tópico criado, Hot Topic definido, visita a perfil com origem (tópico, resposta, busca, Início), convite de Cabine enviado, aceito e recusado com origem, mensagem enviada, comunidade criada e entrada ou saída, denúncia criada, notificação aberta.
3. Visões no banco (views) para Participação, Ritual, Criação, Concentração, Conversa, Afinidade, Relação, Permanência, Retenção e Saúde, seguindo as definições do escopo.
4. Página interna /metricas, só para administradores, com os números do dia e dos últimos 30 dias.

Fora do escopo: ferramenta de analytics externa.
Critérios de aceite: visitar um perfil a partir de uma resposta registra origem "resposta"; cada visão retorna número com dados de exemplo.
Testes: cálculo de cada visão com dados controlados.

Comece em modo de planejamento e só implemente depois da minha aprovação.
```

### F20. Qualidade final

```text
Feature: F20 Qualidade final
Leia CLAUDE.md, docs/escopo.md inteiro e docs/telas.html inteiro.

Objetivo: conferir o MVP contra o escopo antes do teste com usuários.

Escopo:
1. Auditoria de regras: para cada RN01 a RN34, aponte onde está implementada e qual teste a cobre. Liste as que faltam.
2. Auditoria visual: compare cada uma das 28 telas e a tela de estados com o protótipo, no celular e na web. Liste divergências.
3. Acessibilidade: rótulos em ícones sem texto, ordem de foco, contraste conforme o design system, tamanhos de toque de no mínimo 44 px.
4. Testes ponta a ponta com Playwright das jornadas: cadastro e onboarding; convite por link; entrar em comunidade, criar tópico e responder; ciclo do Hot Topic rodado manualmente; convite e conversa de Cabine; denúncia e bloqueio; exclusão de conta.
5. Segurança: conferir as 10 regras de segurança; tentar ler e alterar dados de outra pessoa por URL e chamando as Server Actions direto; conferir cabeçalhos; procurar segredos no código enviado ao navegador; rodar npm audit.
6. Desempenho: Início e página de comunidade carregando em até 2 segundos com dados de exemplo.

Entrega: relatório em docs/auditoria-mvp.md com o que passou, o que falhou e prioridade de correção. Não corrija nada nesta sessão; cada correção vira um prompt de manutenção.

Comece em modo de planejamento e só implemente depois da minha aprovação.
```

## Fase 8: celular

### F21. Versão de celular

```text
Feature: F21 Versão de celular
Leia CLAUDE.md, docs/escopo.md e a versão celular de todas as telas em docs/telas.html.

Objetivo: o mesmo app, já validado na web, funcionando bem em telas de até 768 px.

Escopo:
1. Barra inferior só com ícones (Início, Explorar, Comunidades, Cabine, Perfil), com aria-label; sino no cabeçalho do Início.
2. Painéis laterais da web viram conteúdo da própria tela ou somem, conforme o protótipo.
3. Espaçamento do celular: 16 px nas laterais, 12 px entre componentes, capas encostando nas bordas.
4. Folhas inferiores (bottom sheets) no lugar dos modais centrais da web.
5. Margens seguras para recortes de tela e PWA instalável no iPhone e no Android.
6. Toques de no mínimo 44 px em todos os controles.

Fora do escopo: novas funções. Tudo que existe na web deve existir no celular, exceto ocultar painéis.
Critérios de aceite: cada tela em 390 px bate com a versão celular do protótipo; nenhuma função da web some no celular; a PWA instala nos dois sistemas.
Testes: Playwright repetindo as jornadas da F20 em 390 px.

Comece em modo de planejamento e só implemente depois da minha aprovação.
```

## Prompts de manutenção

Use estes modelos depois que uma feature estiver pronta. Eles mantêm a mudança pequena e rastreável.

### Mudar uma regra de negócio

```text
Manutenção: mudança de regra
Leia CLAUDE.md e o docs/escopo.md atualizado.

Regra alterada: [RNxx, texto antigo e texto novo]
Motivo: [por que mudou]

1. Encontre todos os lugares onde a regra está implementada: banco, funções, telas e testes. Liste antes de alterar.
2. Atualize primeiro os testes da regra para o comportamento novo e confirme que falham.
3. Altere a implementação até os testes passarem.
4. Se a regra tiver um número configurável, altere só a configuração.
5. Atualize o prompt da feature neste backlog e me diga o trecho novo.

Comece em modo de planejamento.
```

### Mudar o design

```text
Manutenção: mudança de design
Leia CLAUDE.md, docs/design-system/ e docs/telas.html atualizados.

Mudança: [token, componente ou ícone, como era e como fica]
Telas afetadas: [números]

1. Altere só o token ou o componente no design/, nunca a tela diretamente.
2. Liste todas as telas que usam o que mudou.
3. Atualize a tela /design e os snapshots.
4. Confira contraste e tamanho de toque depois da mudança.

Comece em modo de planejamento.
```

### Corrigir um bug

```text
Manutenção: correção de bug
Leia CLAUDE.md.

Bug: [o que acontece]
Esperado: [o que deveria acontecer, com a RN se houver]
Como reproduzir: [passos, celular ou web]

1. Escreva primeiro um teste que reproduz o bug e falha.
2. Corrija com a menor mudança possível.
3. Confirme que o teste passa e que nenhum outro quebrou.
4. Explique a causa em duas frases.
```

### Adicionar uma feature nova

Copie o modelo da seção "Modelo de prompt e definição de pronto", dê o próximo código livre (F21 em diante) e acrescente a linha na tabela de dependências.
