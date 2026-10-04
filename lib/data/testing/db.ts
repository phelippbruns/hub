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
  "notifications",
  "moderation_actions",
  "reports",
  "blocks",
  "messages",
  "cabin_invites",
  "cabin_members",
  "cabins",
  "hot_topics",
  "follows",
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
 */
export async function asViewer<T>(
  viewerId: string | null,
  run: (client: pg.Client) => Promise<T>,
): Promise<T> {
  const client = new pg.Client(url);
  await client.connect();
  try {
    // `authenticated` é o papel que o Supabase usa para quem está logado: tem
    // acesso às tabelas, mas está sujeito ao RLS.
    await client.query("SET ROLE authenticated");
    if (viewerId) {
      await client.query("SELECT set_config('hub.viewer_id', $1, false)", [viewerId]);
    }
    return await run(client);
  } finally {
    await client.end();
  }
}
