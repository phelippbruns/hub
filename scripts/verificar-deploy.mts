/**
 * Confere que o site publicado **responde**, não só que compilou.
 *
 * Motivo de existir: a Vercel marcou o deploy como verde da F01 à F03 enquanto
 * publicava a pasta `public/` como site estático. O build rodava, o Next.js
 * compilava e era jogado fora. Toda rota dava 404, e o sinal verde escondia
 * isso porque ele mede o build, não o app.
 *
 * Uso: npm run verificar:deploy <url>
 */

const ROTAS = ["/", "/entrar", "/criar-conta"] as const;

/** Algo que só aparece se o Next.js renderizou de verdade. */
const MARCA_DO_HUB = /Conecte-se pelo que realmente importa|<title>[^<]*Hub/i;

const base = process.argv[2]?.replace(/\/$/, "");

if (!base) {
  console.error("Uso: npm run verificar:deploy <url>");
  process.exit(1);
}

type Falha = { rota: string; motivo: string };
const falhas: Falha[] = [];

for (const rota of ROTAS) {
  const url = `${base}${rota}`;
  let resposta: Response;

  try {
    resposta = await fetch(url, { redirect: "manual" });
  } catch (error) {
    falhas.push({ rota, motivo: `não respondeu: ${String(error)}` });
    continue;
  }

  // A proteção de acesso da Vercel redireciona para o login dela. Isso não é
  // o app quebrado, é configuração — e o verificador precisa dizer qual dos
  // dois é, senão manda procurar no lugar errado.
  const destino = resposta.headers.get("location") ?? "";
  if (destino.includes("vercel.com/sso-api")) {
    console.error(
      `\n${rota}: a Proteção de Deploy da Vercel está na frente — não dá para` +
        " verificar daqui.\nDesligue em Settings → Deployment Protection, ou rode" +
        " contra um ambiente sem proteção.",
    );
    process.exit(2);
  }

  if (resposta.status !== 200) {
    const plataforma = resposta.headers.get("x-vercel-error");
    falhas.push({
      rota,
      motivo:
        resposta.status === 404 && plataforma === "NOT_FOUND"
          ? "404 da plataforma: a Vercel não está servindo o Next.js (confira o framework em vercel.json)"
          : `respondeu ${resposta.status}`,
    });
    continue;
  }

  const corpo = await resposta.text();
  if (!MARCA_DO_HUB.test(corpo)) {
    falhas.push({ rota, motivo: "respondeu 200, mas o conteúdo não é o Hub" });
  }
}

if (falhas.length > 0) {
  console.error(`\nO site em ${base} não está no ar:\n`);
  for (const { rota, motivo } of falhas) console.error(`  ${rota} — ${motivo}`);
  console.error("");
  process.exit(1);
}

console.log(`${base}: ${ROTAS.length} rotas respondendo o Hub.`);
