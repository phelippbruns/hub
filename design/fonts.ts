import localFont from "next/font/local";

/**
 * Bricolage Grotesque é a única família do Hub (docs/design-system/README.md).
 * Pesos: 800 em title e question, 700 em subtitle, 400 a 600 em texto.
 *
 * **Os arquivos moram no repositório**, e não são baixados na hora de
 * compilar.
 *
 * Era `next/font/google`, que busca a fonte no Google **durante o build**.
 * Em 31 de outubro isso derrubou duas rodadas locais de quinze minutos e
 * a CI de um pull request, com um erro que fala de "import map" e não diz
 * uma palavra sobre rede. Build que depende de um serviço de terceiros no
 * ar não é build: é uma aposta repetida a cada deploy.
 *
 * É a mesma fonte, no mesmo formato, servida do próprio domínio — como já
 * era em execução. O que muda é que agora ela também está aqui na hora de
 * compilar.
 *
 * **Só o subconjunto latino.** É o que o português usa inteiro: os acentos
 * todos vivem em U+0000-00FF. Um nome com caractere de fora — `Łukasz`,
 * `Þór` — cai na fonte seguinte da lista, que é a do sistema. O arquivo
 * `latin-ext` está no repositório para quando isso incomodar; servir os
 * dois exige `unicode-range` por arquivo, que o `next/font/local` não
 * expõe, e a saída seria escrever o `@font-face` à mão.
 *
 * Para atualizar a fonte: pegue a URL em
 * https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800
 * e substitua os arquivos em `design/fontes/`.
 */
export const bricolageGrotesque = localFont({
  src: [
    {
      path: "./fontes/bricolage-grotesque-latin.woff2",
      // Variável de 400 a 800: um arquivo só cobre os cinco pesos.
      weight: "400 800",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--hub-font-sans",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});
