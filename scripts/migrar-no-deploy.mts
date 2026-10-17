/**
 * Aplica as migrations **só no deploy de produção**.
 *
 * Antes era `prisma migrate deploy` direto no `vercel-build`, e o ambiente
 * de Preview da Vercel usa a **mesma** `DATABASE_URL` da produção. Na
 * prática: abrir um pull request já alterava o banco de produção, minutos
 * antes de qualquer revisão. Aconteceu na rodada de acabamento — a
 * migration da Cabine, que fecha conversas duplicadas e cancela convites
 * repetidos, rodou nos dados reais no instante em que o PR foi aberto, e o
 * build de produção depois só encontrou "nenhuma migration pendente".
 *
 * O preço desta escolha, escrito para quem for estranhar: o preview de um
 * PR que traz migration roda contra o banco **antigo**, e as telas novas
 * podem quebrar lá. É de propósito. Preview quebrado é um inconveniente de
 * revisão; banco de produção alterado por código não revisado é outra
 * categoria de problema.
 *
 * A solução definitiva é um banco separado para o preview (branch database
 * no Supabase). Enquanto ela não existe, este guarda é o que impede o
 * preview de tocar em produção.
 */
import { spawnSync } from "node:child_process";

const ambiente = process.env.VERCEL_ENV ?? "desconhecido";

if (ambiente !== "production") {
  console.log(
    `Ambiente "${ambiente}": as migrations não rodam aqui.\n` +
      "Só o deploy de produção aplica migrations — o preview divide o banco " +
      "com ela, e migrar a partir dele mudaria produção antes da revisão.",
  );
  process.exit(0);
}

console.log("Deploy de produção: aplicando as migrations pendentes.");

const resultado = spawnSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit" });

// O build **não** pode seguir se a migration falhar: subiria código novo
// sobre um banco velho, e o erro apareceria só quando alguém usasse a tela.
process.exit(resultado.status ?? 1);
