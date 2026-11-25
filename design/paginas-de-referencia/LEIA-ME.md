# Páginas de referência do Hub

O Hub inteiro retratado, para servir de ponto de partida a quem for **aplicar
modo escuro** ou **trocar o design**.

Comece por [`index.html`](index.html) — abra do disco, não precisa de servidor.
Para ler em texto (é o arquivo a dar para uma IA), [`MAPA.md`](MAPA.md).

## O que tem aqui

| | |
| --- | --- |
| `retratos/` | 40 PNG, um por estado de tela |
| `paginas/` | 6 HTML de verdade, das telas mais densas |
| `MAPA.md` e `mapa.json` | tela → arquivo que a desenha, e componente → telas |
| `ativos/` | o CSS do build (com a fonte embutida), as imagens e o interruptor de tema |

**40 estados, não 40 rotas.** O Início aparece duas vezes porque cheio e vazio
são dois desenhos, e o vazio some de qualquer captura feita depois de criar
conteúdo.

## Três coisas antes de confiar no que você vê

**Isto é um retrato, com data e commit.** Cada página diz no topo quando foi
capturada e de qual commit. Nada aqui se atualiza sozinho: depois de mexer no
Hub, rode `npm run referencia` de novo.

**Nada é interativo.** As seis páginas em HTML não têm JavaScript — sem os
scripts do Next não há React. Menu não abre, painel não arrasta, contador não
conta. Os estados que importam (janela aberta, painel aberto, tópico no
painel) foram capturados como **telas próprias**, que é o que torna isso
suportável.

**`npm run referencia` apaga o banco local.** Ele roda o seed, e o seed trunca
tudo. Se você tem dados locais que importam, não rode.

## Para escurecer o Hub

O tema **não mora aqui**, de propósito. Se morasse, preencher valores nesta
pasta seria trabalho que nunca chega ao produto — alguém teria de portar à mão
depois.

1. preencha o campo `dark` dos 21 tokens de cor em
   `docs/design-system/tokens.json`;
2. rode `npm run tokens`. Isso acende o Hub inteiro: app, galeria `/design` e,
   na próxima captura, estas páginas;
3. rode `npm run verificar`. O teste de contraste passa a cobrar os 16 pares e
   os 8 fundos de perfil **no escuro**, pelos mesmos limites do claro — 4,5:1
   para texto, 3:1 para texto grande, e um teto de 3:1 nos pares que são
   sutis de propósito. Paleta ilegível não entra, e o teste diz qual par e
   qual número;
4. rode `npm run referencia` para os retratos mostrarem o tema novo.

**É tudo ou nada:** o gerador recusa 1 a 20 valores preenchidos. A cor
esquecida ficaria clara e viraria texto claro sobre fundo claro num canto que
ninguém abre.

**E há um obstáculo que não é de cor, é de estrutura.** Medido em 24 de
novembro de 2026, com uma paleta plausível: `ink` sobre `sun` cai de 12,26:1
para 1,21:1, e `paper` sobre `lavender` **inverte** — de proibido a legível.
Nenhuma escolha de 21 hex resolve, porque destaque é claro nos dois temas e
`ink` precisa ser claro no escuro. As duas saídas possíveis estão em
[`../../docs/design-system/README.md`](../../docs/design-system/README.md),
seção "O que o modo escuro exige".

## Para trocar o design

Quase todo o CSS do Hub é movido por tokens — `app/globals.css` não tem um
único hex, e nenhuma utilidade do Tailwind guarda valor: todas resolvem por
`var()`. Então mudar os valores em `tokens.json` re-veste o Hub inteiro, e
isso vale para **tipografia, espaçamento, raio e as 44 medidas de controle**,
não só para cor.

O que a troca de tokens **não** alcança está listado no `index.html`, medido
no HTML capturado.

Para ir da tela ao código, use o `MAPA.md`: ele diz qual `page.tsx` desenha
cada tela, quais layouts entram, e em que telas cada um dos 62 componentes
aparece. A lista é dos componentes **no caminho da rota**, não dos visíveis
naquele estado — para mexer, basta; para afirmar que algo aparece, olhe o
retrato.

## Como isto é feito

`npm run referencia` sobe o Hub, cria três contas, constrói o conteúdo
**pelas telas** (comunidade, tópicos, contribuições com imagem, estrelas,
enquete, evento, Cabine com conversa, denúncia) e só então retrata. Leva uns
dois minutos.

Construir clicando, e não escrevendo no banco, é o que garante que nenhum
estado retratado seja um estado que o produto não permitiria. As duas
exceções estão em `capturas/semente-sql.ts`, cada uma com o motivo: o post de
blog (não há editor até a F7) e o ciclo do Hot Topic (ele olha o dia
anterior, e nenhuma tela deixa escolher quando algo aconteceu).

O código mora em `design/referencia/` (as partes puras e testadas) e em
`capturas/` (o que precisa de navegador).
