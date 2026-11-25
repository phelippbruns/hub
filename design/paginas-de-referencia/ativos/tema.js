/*
 * Interruptor claro/escuro das páginas de referência.
 *
 * GERADO? Não: este arquivo é escrito à mão e copiado pelo gerador. Ele não
 * faz parte do Hub — é ferramenta da pasta.
 *
 * **Script clássico, não módulo.** Por `file://` o navegador recusa
 * `type="module"` por CORS, e a página abriria sem interruptor e sem erro
 * visível. É a mesma razão de a fonte ir embutida em base64 no `app.css`.
 *
 * O que ele faz é só escrever `data-theme` no `<html>`. Quem pinta é o
 * `app.css` ao lado, que é **uma cópia do CSS que o Hub compilou** — e esse
 * CSS vem do `design/tokens.css`, gerado do `tokens.json`.
 *
 * **Três consequências que valem estar escritas:**
 *
 * 1. enquanto ninguém preencher os valores escuros no `tokens.json`, apertar
 *    o botão não muda nada. É o esperado: a pasta **não tem tema próprio**,
 *    de propósito — uma segunda verdade do tema seria trabalho que não chega
 *    ao Hub;
 * 2. depois de preencher, é preciso **rodar `npm run referencia` de novo**
 *    para esta cópia ser atualizada. Ela é um retrato, como o resto da pasta;
 * 3. para experimentar sem recapturar, dá para editar o `app.css` à mão —
 *    mas o que vale é o `tokens.json`, e a próxima execução sobrescreve.
 */
(function () {
  "use strict";

  var CHAVE = "hub-referencia-tema";

  function lido() {
    var daUrl = new URLSearchParams(location.search).get("tema");
    if (daUrl === "dark" || daUrl === "light") return daUrl;

    try {
      var guardado = localStorage.getItem(CHAVE);
      if (guardado === "dark" || guardado === "light") return guardado;
    } catch {
      /* janela anônima, ou dados do site bloqueados: segue no claro. */
    }

    return "light";
  }

  function aplicar(tema) {
    document.documentElement.setAttribute("data-theme", tema);
    try {
      localStorage.setItem(CHAVE, tema);
    } catch {
      /* não poder guardar não impede de aplicar. */
    }
  }

  function desenharBotao(tema) {
    var botao = document.createElement("button");
    botao.type = "button";
    botao.setAttribute("data-hub-tema-botao", "");
    botao.style.cssText =
      "position:fixed;bottom:12px;left:12px;z-index:99999;font:12px/1 system-ui;" +
      "background:#1E1A33;color:#fff;border:0;border-radius:999px;padding:8px 12px;" +
      "cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.25)";

    function rotular(t) {
      botao.textContent = t === "dark" ? "☾ escuro" : "☀ claro";
      botao.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
      botao.title =
        "Alterna data-theme no <html>. Quem pinta é design/tokens.css — " +
        "sem valores escuros no tokens.json, nada muda.";
    }

    rotular(tema);
    botao.addEventListener("click", function () {
      var novo = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      aplicar(novo);
      rotular(novo);
    });

    document.body.appendChild(botao);
  }

  var inicial = lido();
  aplicar(inicial);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      desenharBotao(inicial);
    });
  } else {
    desenharBotao(inicial);
  }
})();
