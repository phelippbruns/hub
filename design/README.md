# design/

Tokens, ícones e componentes base do Hub.

## Como mudar um valor

`docs/design-system/tokens.json` é a fonte da verdade. Mude lá e rode:

```bash
npm run tokens
```

Isso regera `tokens.ts` (para o código TypeScript) e `tokens.css` (o tema do
Tailwind). **Nunca edite esses dois à mão** — a CI confere com `npm run tokens:check`.

`sizes.css` é a exceção: concentra as medidas de controle que o tokens.json
ainda não tem (botão de ícone, marca, avatar, miniatura, interruptor). É o único
arquivo onde pixel é escrito à mão, e mexer nele é mudança de design.

## A regra dos tokens

Nenhuma cor, tamanho de fonte, espaçamento ou raio solto no código.

`tokens.css` zera as escalas padrão do Tailwind (`--color-*: initial`), então
`bg-red-500` e `p-7` nem existem. O que escapa por fora do Tailwind — hex,
`rgb()`, valor arbitrário em px — é pego por `tokens.test.ts`.

## Conferência visual

A galeria em `/design` mostra tudo: a tela 29 do protótipo (Estados do sistema),
a paleta, a escala tipográfica e cada componente. Componente novo entra lá junto.
