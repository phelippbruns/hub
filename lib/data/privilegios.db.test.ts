import { describe, expect, it } from "vitest";
import { db } from "./testing/db";

/**
 * O que o navegador alcança no banco, e só isso.
 *
 * **O Supabase concede tudo por padrão.** `anon` e `authenticated` nascem
 * com todos os privilégios em todas as tabelas de `public`, e a chave
 * publicável viaja dentro de todo navegador. Sobra o RLS como única
 * barreira — e ele é por **linha**, nunca por coluna.
 *
 * Foi assim que a data de nascimento de todo mundo ficou legível: a
 * política `profiles_read` existe para cumprir a RN17 ("nome, @ e foto são
 * públicos") e, ao liberar a linha, liberava as 27 colunas. Medido em 24 de
 * novembro de 2026 com a chave publicável e mais nada.
 *
 * O Hub não precisa desse caminho: a **única** coisa que o navegador
 * consulta direto no Supabase é o canal de tempo real da Cabine. Então a
 * porta está fechada, e este arquivo é o que impede alguém de reabri-la sem
 * perceber.
 */

type Linha = { role: string; tabela: string; privilegio: string };

async function privilegiosDoNavegador(): Promise<Linha[]> {
  return db.$queryRaw<Linha[]>`
    SELECT grantee AS role, table_name AS tabela, privilege_type AS privilegio
      FROM information_schema.role_table_grants
     WHERE table_schema = 'public'
       AND grantee IN ('anon', 'authenticated')
     ORDER BY grantee, table_name, privilege_type
  `;
}

describe("privilégios de quem chega pelo navegador", () => {
  it("`anon` não alcança tabela nenhuma", async () => {
    const dele = (await privilegiosDoNavegador()).filter((l) => l.role === "anon");

    expect(
      dele.map((l) => `${l.tabela}.${l.privilegio}`),
      "quem está anônimo não lê nada direto: as telas públicas são servidas pelo Prisma",
    ).toEqual([]);
  });

  /**
   * A fresta, e só ela: a Cabine assina `messages` pelo Realtime, e o RLS
   * (`messages_read_member`) é quem autoriza. Para a política ser avaliada,
   * o papel precisa do privilégio de leitura na tabela.
   */
  it("`authenticated` só lê `messages`, e só lê", async () => {
    const dele = (await privilegiosDoNavegador()).filter((l) => l.role === "authenticated");

    expect(dele.map((l) => `${l.tabela}.${l.privilegio}`)).toEqual(["messages.SELECT"]);
  });

  /**
   * **E a tabela que ainda não existe.**
   *
   * Sem isto, a próxima migration que criar tabela a entrega aberta, e
   * ninguém seria avisado. É o mesmo formato do menu suspenso que nasceu
   * errado quatro vezes: a correção que não vale para o próximo não é
   * correção, é conserto.
   */
  it("tabela nova nasce fechada", async () => {
    const linhas = await db.$queryRaw<{ padrao: string | null }[]>`
      SELECT array_to_string(d.defaclacl, ' ') AS padrao
        FROM pg_default_acl d
        JOIN pg_namespace n ON n.oid = d.defaclnamespace
       WHERE n.nspname = 'public'
         AND d.defaclobjtype = 'r'
         AND d.defaclrole = 'postgres'::regrole
    `;

    const padrao = linhas[0]?.padrao ?? "";
    expect(padrao, "o padrão voltou a conceder para anon").not.toContain("anon=");
    expect(padrao, "o padrão voltou a conceder para authenticated").not.toContain("authenticated=");
  });

  /**
   * A conferência de ponta: a coluna que começou tudo. Se um dia a leitura
   * de `profiles` voltar, é esta linha que diz o que vaza junto.
   */
  it("a data de nascimento não é alcançável pelo navegador", async () => {
    const alcance = await db.$queryRaw<{ alcanca: boolean }[]>`
      SELECT has_column_privilege('anon', 'profiles', 'birth_date', 'SELECT')
          OR has_column_privilege('authenticated', 'profiles', 'birth_date', 'SELECT') AS alcanca
    `;

    expect(alcance[0]?.alcanca, "birth_date voltou a ser legível pela chave publicável").toBe(
      false,
    );
  });
});
