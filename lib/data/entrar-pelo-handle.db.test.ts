/**
 * Entrar pelo @: a tradução do @ no email que o Supabase Auth espera.
 *
 * O email encontrado aqui **nunca** chega à tela — ele serve só para a
 * chamada de login. O que estes testes protegem é que a tradução acerte a
 * pessoa certa, e não acerte ninguém quando não deve.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db, makeProfile, resetDatabase } from "./testing/db";
import { emailDeQuemTemOHandle } from "./profiles";

beforeEach(resetDatabase);

/** O email que o `makeProfile` gravou em auth.users para este perfil. */
async function emailGravado(id: string): Promise<string> {
  const linhas = await db.$queryRawUnsafe<{ email: string }[]>(
    `SELECT email FROM auth.users WHERE id = $1::uuid`,
    id,
  );
  return linhas[0]!.email;
}

describe("achar a conta pelo @", () => {
  it("acha o email de quem tem aquele @", async () => {
    const lia = await makeProfile({ handle: "liasouza" });

    expect(await emailDeQuemTemOHandle("liasouza")).toBe(await emailGravado(lia.id));
  });

  it("não diferencia maiúsculas: o @ é guardado em minúsculas", async () => {
    const lia = await makeProfile({ handle: "liasouza" });

    expect(await emailDeQuemTemOHandle("LiaSouza")).toBe(await emailGravado(lia.id));
  });

  it("@ que não existe não acha nada, em vez de achar qualquer um", async () => {
    await makeProfile({ handle: "liasouza" });

    expect(await emailDeQuemTemOHandle("naoexiste")).toBeNull();
  });

  it("perfil apagado não entra mais", async () => {
    const jo = await makeProfile({ handle: "joramos" });
    await db.profile.update({ where: { id: jo.id }, data: { deletedAt: new Date() } });

    // RN30: quem excluiu a conta não volta pela porta dos fundos.
    expect(await emailDeQuemTemOHandle("joramos")).toBeNull();
  });

  it("cada @ leva à sua própria conta", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const jo = await makeProfile({ handle: "jo" });

    expect(await emailDeQuemTemOHandle("lia")).toBe(await emailGravado(lia.id));
    expect(await emailDeQuemTemOHandle("jo")).toBe(await emailGravado(jo.id));
    expect(await emailDeQuemTemOHandle("lia")).not.toBe(await emailGravado(jo.id));
  });
});
