/**
 * Apoio aos testes de banco.
 *
 * Estes testes precisam de um Postgres de verdade: índice único, gatilho e RLS
 * não existem em dublê. Rodam contra o Supabase local (`npx supabase start`),
 * e por isso ficam num comando separado (`npm run test:db`).
 */
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "@/prisma/generated/client.ts";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!url) throw new Error("Defina DIRECT_URL para rodar os testes de banco");
if (!/localhost|127\.0\.0\.1/.test(url)) {
  throw new Error("Os testes de banco apagam dados. Só rodam em banco local.");
}

/** Cliente com permissão ampla, como a aplicação usa (ignora RLS). */
export const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const TABLES = [
  "auth_attempts",
  "analytics_events",
  "posts",
  "profile_statuses",
  "notifications",
  "moderation_actions",
  "moderator_invites",
  "platform_bans",
  "reports",
  "blocks",
  "messages",
  "cabin_invites",
  "cabin_members",
  "cabins",
  "hot_topics",
  "follows",
  "answer_stars",
  "answers",
  "topics",
  "memberships",
  "communities",
  "universes",
  "profiles",
] as const;

export async function resetDatabase() {
  await db.$executeRawUnsafe(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`);
  await db.$executeRawUnsafe(`DELETE FROM auth.users WHERE email LIKE '%@teste.hub'`);
}

let counter = 0;

/** Cria um perfil (e o usuário de autenticação por trás dele). */
export async function makeProfile(overrides: { handle?: string; name?: string } = {}) {
  counter += 1;
  const id = crypto.randomUUID();
  const handle = overrides.handle ?? `pessoa${counter}`;

  await db.$executeRawUnsafe(
    `INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                             email_confirmed_at, created_at, updated_at)
     VALUES ($1::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
             'authenticated', $2, '', now(), now(), now())`,
    id,
    `${handle}-${counter}@teste.hub`,
  );

  return db.profile.create({
    data: {
      id,
      handle,
      name: overrides.name ?? `Pessoa ${counter}`,
      birthDate: new Date(Date.UTC(1995, 4, 20)),
      ageVerificationStatus: "verified",
      ageVerificationMethod: "self_declared",
      ageVerifiedAt: new Date(),
      termsVersion: "2026-10-01",
    },
  });
}

export async function makeUniverse(name = `Universo ${++counter}`) {
  return db.universe.create({
    data: { name, slug: name.toLowerCase().replace(/\s+/g, "-") },
  });
}

export async function makeCommunity(
  universeId: string,
  createdById: string,
  name = `Comunidade ${++counter}`,
) {
  const community = await db.community.create({
    data: { universeId, name, nameNormalized: name, intro: "intro", createdById },
  });
  await db.membership.create({
    data: { communityId: community.id, profileId: createdById, role: "moderator" },
  });
  return community;
}

export async function joinAs(communityId: string, profileId: string) {
  return db.membership.create({ data: { communityId, profileId } });
}

/**
 * Conexão **sem** privilégio de dono, para testar o RLS de verdade.
 *
 * O Prisma conecta como dono do banco e passa por cima do RLS, então ele nunca
 * provaria que as políticas funcionam. Aqui a conexão usa um papel comum e se
 * identifica com `hub.viewer_id`, que é o que `hub_viewer_id()` lê quando não
 * há sessão do Supabase.
 *
 * **Os privilégios são devolvidos dentro de uma transação, e desfeitos no
 * fim.** Desde 24 de novembro de 2026 `anon` e `authenticated` não alcançam
 * tabela nenhuma: a chave publicável viaja em todo navegador, e o RLS é por
 * linha, nunca por coluna — foi assim que a data de nascimento de todo mundo
 * ficou legível.
 *
 * Só que o Hub tem **duas** barreiras de propósito (regra de segurança 2), e
 * sem os privilégios a consulta para antes da política: os testes de RLS
 * morreriam com "permission denied" sem nunca exercitar o que foram escritos
 * para provar. O `GRANT` aqui é o que mantém a segunda barreira **medida** —
 * se um dia alguém reabrir a primeira, estes testes dizem se a de baixo
 * ainda segura.
 *
 * `GRANT` é transacional no Postgres, então o `ROLLBACK` do fim o desfaz
 * sozinho, inclusive quando o teste estoura no meio. Nada vaza para a
 * próxima conexão — e `lib/data/privilegios.db.test.ts` confere o estado
 * real, fora daqui.
 */
export async function asViewer<T>(
  viewerId: string | null,
  run: (client: pg.Client) => Promise<T>,
): Promise<T> {
  const client = new pg.Client(url);
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated");

    // `authenticated` é o papel que o Supabase usa para quem está logado: tem
    // acesso às tabelas, mas está sujeito ao RLS.
    await client.query("SET ROLE authenticated");
    if (viewerId) {
      await client.query("SELECT set_config('hub.viewer_id', $1, false)", [viewerId]);
    }
    return await run(client);
  } finally {
    /*
     * `ROLLBACK` e não `COMMIT`: o que interessa destes testes é o que a
     * política respondeu, nunca o que ficou gravado. E é ele que devolve os
     * privilégios ao estado fechado.
     */
    await client.query("ROLLBACK").catch(() => {});
    await client.end();
  }
}

/**
 * Uma conexão como o navegador a tem: papel `authenticated` e **nenhum
 * privilégio devolvido**.
 *
 * Diferente de `asViewer`, que concede tudo para medir o RLS. Aqui o que se
 * mede é o contrário: se os privilégios que sobraram bastam para as
 * políticas **rodarem**.
 *
 * A distinção custou uma CI vermelha em 24 de novembro de 2026. A política
 * de `messages` chama `hub_is_cabin_member()`, que lê `cabin_members` como
 * quem perguntou; sem aquele privilégio a política falha por dentro e o
 * Postgres recusa a consulta inteira. A tabela `messages` seguia
 * alcançável, o teste de privilégio mínimo passava, e a mensagem da Cabine
 * não chegava — sem erro na tela nem no servidor.
 */
export async function comoNavegador<T>(run: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client(url);
  await client.connect();
  try {
    await client.query("SET ROLE authenticated");
    return await run(client);
  } finally {
    await client.end();
  }
}

/**
 * Duas transações abertas ao mesmo tempo, para provar barreira de corrida.
 *
 * **Por que não `Promise.all` sobre o Prisma:** medido em 15 de novembro de
 * 2026, duas chamadas da camada de dados em paralelo serializam no cliente —
 * a segunda só sai depois que a primeira volta. Um teste escrito assim passa
 * do mesmo jeito com a trava arrancada do gatilho.
 *
 * **E por que não basta disparar as duas e olhar o resultado:** medido no
 * mesmo dia, com a trava arrancada o teste continuava verde — a segunda
 * transação às vezes chega ao servidor depois do `COMMIT` da primeira, e aí
 * ela vê a linha e recusa sozinha. Verde por sorte de temporização, não por
 * barreira: uma moeda, não um teste.
 *
 * Por isso `run` recebe `esperarBloqueioDeB`, que pergunta ao próprio
 * Postgres se a segunda está **parada esperando trava**. É a única pergunta
 * que distingue "foi barrada" de "chegou tarde". Sem a trava no gatilho ela
 * nunca fica em espera, e o teste reprova — que é o que se quer de uma
 * barreira.
 *
 * Conecta como dono (sem `SET ROLE`), porque o que se testa é o gatilho, não
 * o RLS — para RLS existe `asViewer`.
 */
export async function duasTransacoes<T>(
  run: (contexto: {
    a: pg.Client;
    b: pg.Client;
    /** Confirma a primeira, liberando quem espera por ela. */
    commitA: () => Promise<void>;
    /** `true` se a segunda ficou parada esperando trava dentro do prazo. */
    esperarBloqueioDeB: (prazoEmMs?: number) => Promise<boolean>;
  }) => Promise<T>,
): Promise<T> {
  const a = new pg.Client(url);
  const b = new pg.Client(url);
  const observador = new pg.Client(url);
  await Promise.all([a.connect(), b.connect(), observador.connect()]);

  const pidDeB = (await b.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")).rows[0]!.pid;

  let aConfirmada = false;
  const commitA = async () => {
    if (aConfirmada) return;
    aConfirmada = true;
    await a.query("COMMIT");
  };

  /*
   * Um terceiro cliente para observar, porque `a` e `b` estão ocupados: `b`
   * está justamente parado, e perguntar por ele a ele mesmo nunca
   * responderia.
   */
  const esperarBloqueioDeB = async (prazoEmMs = 2000) => {
    const limite = Date.now() + prazoEmMs;
    while (Date.now() < limite) {
      const { rows } = await observador.query<{ esperando: boolean }>(
        `SELECT wait_event_type = 'Lock' AS esperando
           FROM pg_stat_activity WHERE pid = $1`,
        [pidDeB],
      );
      if (rows[0]?.esperando) return true;
      await new Promise((pronto) => setTimeout(pronto, 25));
    }
    return false;
  };

  try {
    await Promise.all([a.query("BEGIN"), b.query("BEGIN")]);
    const resultado = await run({ a, b, commitA, esperarBloqueioDeB });
    await commitA();
    // `COMMIT` numa transação já abortada é `ROLLBACK`, e o Postgres não
    // reclama: não é preciso saber qual das duas falhou.
    await b.query("COMMIT");
    return resultado;
  } finally {
    await Promise.all([a.end(), b.end(), observador.end()]);
  }
}
