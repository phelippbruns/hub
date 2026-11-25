import type { Mapa } from "./mapa";
import type { Area } from "./paginas";

/**
 * O `index.html` da pasta: a porta de entrada.
 *
 * Ele não é bonito de propósito — é uma folha de contato. O que importa é
 * responder quatro perguntas sem ninguém ter de abrir quarenta arquivos:
 * **o que o Hub tem**, **onde cada tela mora no código**, **onde um
 * componente aparece**, e **o que a troca de tokens não alcança**.
 *
 * Estilo próprio e mínimo, sem os tokens do Hub: se ele usasse a mesma folha
 * das páginas, um redesenho em andamento deixaria o índice ilegível
 * exatamente no momento em que ele é mais necessário.
 */

const AREAS: { id: Area; nome: string }[] = [
  { id: "entrada", nome: "Entrada e cadastro" },
  { id: "onboarding", nome: "Primeiros passos" },
  { id: "inicio", nome: "Início" },
  { id: "descoberta", nome: "Descoberta" },
  { id: "comunidade", nome: "Comunidade" },
  { id: "topico", nome: "Tópico e convite" },
  { id: "perfil", nome: "Perfil e blog" },
  { id: "cabine", nome: "Cabine" },
  { id: "moderacao", nome: "Moderação" },
  { id: "sistema", nome: "Sistema" },
];

const esc = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function montarIndice(
  mapa: Mapa,
  dados: { congeladas: string[]; foraDoTema: string[] },
): string {
  const congeladas = new Set(dados.congeladas);

  const secoes = AREAS.map((area) => {
    const telas = mapa.telas.filter((t) => t.area === area.id);
    if (telas.length === 0) return "";

    const cartoes = telas
      .map(
        (t) => `      <figure>
        <a href="retratos/${t.id}.png"><img src="retratos/${t.id}.png" alt="${esc(t.titulo)}" loading="lazy" /></a>
        <figcaption>
          <b>${esc(t.titulo)}</b>
          <code>${esc(t.rota)}</code>
          <span>${esc(t.estado)}</span>
          <span class="arq">${esc(t.origem)}</span>
          ${congeladas.has(t.id) ? `<a class="html" href="paginas/${t.id}.html">abrir em HTML</a>` : ""}
        </figcaption>
      </figure>`,
      )
      .join("\n");

    return `    <h2 id="${area.id}">${esc(area.nome)} <small>${telas.length}</small></h2>
    <div class="grade">
${cartoes}
    </div>`;
  })
    .filter(Boolean)
    .join("\n\n");

  const porComponente = Object.entries(mapa.componentes)
    .filter(([, c]) => c.telas.length > 0)
    .map(
      ([nome, c]) => `      <tr>
        <td><code>${esc(nome)}</code></td>
        <td><code>${esc(c.arquivo)}</code></td>
        <td>${c.telas.length}</td>
        <td>${c.telas.map((id) => `<a href="#${esc(id)}">${esc(id)}</a>`).join(", ")}</td>
      </tr>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Páginas de referência do Hub</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; padding: 24px; font: 15px/1.6 system-ui, sans-serif; background: #faf9ff; color: #1b1930; }
  h1 { font-size: 26px; margin: 0 0 4px; }
  h2 { font-size: 18px; margin: 36px 0 10px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
  h2 small { font-weight: 400; color: #777; }
  p.intro { max-width: 70ch; color: #444; }
  .aviso { max-width: 70ch; background: #fff6d8; border: 1px solid #e8d9a0; border-radius: 8px; padding: 10px 14px; margin: 16px 0; }
  .grade { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px; }
  figure { margin: 0; background: #fff; border: 1px solid #e3e1ee; border-radius: 10px; overflow: hidden; }
  figure img { display: block; width: 100%; height: 190px; object-fit: cover; object-position: top; background: #eee; }
  figcaption { padding: 10px 12px; display: flex; flex-direction: column; gap: 3px; font-size: 13px; }
  figcaption code { font-size: 12px; color: #5a5577; }
  figcaption span { color: #555; }
  figcaption .arq { font-family: ui-monospace, monospace; font-size: 11px; color: #8a86a8; }
  figcaption .html { font-size: 12px; font-weight: 600; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
  th { background: #f2f0fb; }
  td a { color: #4b3fcf; text-decoration: none; }
  ul.lacuna { max-width: 70ch; }
</style>
</head>
<body>

<h1>Páginas de referência do Hub</h1>
<p class="intro">
  ${mapa.telas.length} telas do Hub, retratadas em ${mapa.geradoEm} do commit
  <code>${esc(mapa.commit)}</code>. Existe para servir de ponto de partida a quem for
  <b>aplicar modo escuro</b> ou <b>trocar o design</b>.
</p>

<div class="aviso">
  <b>Isto é um retrato, não o app.</b> As imagens são estáticas e as seis páginas em
  HTML não têm JavaScript: menu não abre, painel não arrasta. Os estados que importam
  foram capturados como telas próprias. Para a coisa viva, rode o Hub.
  <br /><br />
  <b>O tema não mora aqui.</b> Para escurecer, preencha os valores escuros em
  <code>docs/design-system/tokens.json</code> e rode <code>npm run tokens</code>: isso
  acende o Hub inteiro. Depois rode <code>npm run referencia</code> para estas páginas
  retratarem o novo tema.
</div>

<p class="intro">
  <a href="MAPA.md">MAPA.md</a> tem a mesma informação em texto, para ler de uma vez —
  é o arquivo a dar para uma IA. <a href="mapa.json">mapa.json</a> é a versão de máquina.
</p>

${secoes}

<h2>Componente → telas</h2>
<p class="intro">
  Para mexer num componente, estas são as telas em que conferir. São os componentes
  <b>no caminho da rota</b>, não necessariamente visíveis naquele estado.
</p>
<table>
  <thead><tr><th>Componente</th><th>Arquivo</th><th>Telas</th><th>Quais</th></tr></thead>
  <tbody>
${porComponente}
  </tbody>
</table>

${
  mapa.semTela.length > 0
    ? `<h2>Componentes sem tela</h2>
<p class="intro">${mapa.semTela.length} do design system não aparecem em tela nenhuma do catálogo.</p>
<ul class="lacuna">${mapa.semTela.map((n) => `<li><code>${esc(n)}</code></li>`).join("")}</ul>`
    : ""
}

<h2>O que a troca de tokens não alcança</h2>
<p class="intro">
  Quase todo o CSS do Hub é movido por tokens — <code>app/globals.css</code> não tem um
  único hex. Estes são os pontos que escapam, e que um redesenho precisa tratar à mão:
</p>
<ul class="lacuna">
${dados.foraDoTema.map((t) => `  <li>${esc(t)}</li>`).join("\n")}
</ul>

<h2>Telas fora da pasta, e por quê</h2>
<ul class="lacuna">
${mapa.ausentes.map((a) => `  <li><code>${esc(a.rota)}</code> — ${esc(a.porque)}</li>`).join("\n")}
</ul>

</body>
</html>
`;
}
