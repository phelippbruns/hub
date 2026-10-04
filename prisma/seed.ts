/**
 * Seed de desenvolvimento, com os Universos, comunidades e pessoas do
 * protótipo (docs/telas.html).
 *
 * Só para o banco local. Como `profiles.id` referencia `auth.users`, o seed
 * cria primeiro os usuários de autenticação — o Supabase local permite inserir
 * direto, o que num projeto remoto passaria pela API de administração.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client.ts";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("Defina DIRECT_URL ou DATABASE_URL para rodar o seed");

if (!/localhost|127\.0\.0\.1/.test(url)) {
  // Rede de segurança: o seed apaga tudo antes de popular. Rodá-lo contra o
  // banco de produção apagaria dados de gente de verdade.
  throw new Error(
    "O seed só roda em banco local. A URL atual não aponta para localhost — abortando.",
  );
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

/** Ids fixos para o seed ser repetível e os testes poderem apontar para eles. */
const PEOPLE = [
  { id: "11111111-1111-4111-8111-111111111111", handle: "liasouza", name: "Lia Souza" },
  { id: "22222222-2222-4222-8222-222222222222", handle: "joramos", name: "Jo Ramos" },
  { id: "33333333-3333-4333-8333-333333333333", handle: "rafalima", name: "Rafa Lima" },
  { id: "44444444-4444-4444-8444-444444444444", handle: "caiomendes", name: "Caio Mendes" },
  { id: "55555555-5555-4555-8555-555555555555", handle: "biatorres", name: "Bia Torres" },
  { id: "66666666-6666-4666-8666-666666666666", handle: "analima", name: "Ana Lima" },
] as const;

const UNIVERSES = [
  { slug: "musica", name: "Música" },
  { slug: "cinema", name: "Cinema" },
  { slug: "fotografia", name: "Fotografia" },
  { slug: "games", name: "Games" },
] as const;

const COMMUNITIES = [
  { universe: "musica", name: "Música Eletrônica", intro: "Pistas, sets e descobertas." },
  { universe: "musica", name: "Vinil", intro: "Prensagens, sebos e o ritual da agulha." },
  { universe: "musica", name: "Produção Musical", intro: "Do primeiro loop ao master." },
  { universe: "musica", name: "Techno Minimal", intro: "Menos elementos, mais hipnose." },
  { universe: "musica", name: "DJs", intro: "Transições, leitura de pista e seleção." },
  { universe: "fotografia", name: "Fotografia de Paisagem", intro: "Luz, espera e horizonte." },
  { universe: "cinema", name: "Terror", intro: "O que assusta e por que a gente volta." },
] as const;

async function main() {
  console.log("limpando…");
  // Ordem importa por causa das chaves estrangeiras.
  await prisma.$executeRawUnsafe(`
    TRUNCATE analytics_events, notifications, moderation_actions, reports, blocks,
             messages, cabin_invites, cabin_members, cabins, hot_topics, follows,
             answers, topics, memberships, communities, universes, profiles
    RESTART IDENTITY CASCADE
  `);
  await prisma.$executeRawUnsafe(`DELETE FROM auth.users WHERE email LIKE '%@hub.test'`);

  console.log("criando usuários de autenticação…");
  for (const person of PEOPLE) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                               email_confirmed_at, created_at, updated_at)
       VALUES ($1::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
               'authenticated', $2, '', now(), now(), now())
       ON CONFLICT (id) DO NOTHING`,
      person.id,
      `${person.handle}@hub.test`,
    );
  }

  console.log("criando perfis…");
  await prisma.profile.createMany({
    data: PEOPLE.map((person) => ({
      id: person.id,
      handle: person.handle,
      name: person.name,
      // RN29: no seed as pessoas já passaram pela verificação de idade.
      ageVerifiedAt: new Date(),
      termsVersion: "2026-10-01",
    })),
  });

  console.log("criando Universos…");
  const universes = new Map<string, string>();
  for (const universe of UNIVERSES) {
    const created = await prisma.universe.create({ data: universe });
    universes.set(universe.slug, created.id);
  }

  console.log("criando comunidades…");
  const communities = new Map<string, string>();
  for (const community of COMMUNITIES) {
    const created = await prisma.community.create({
      data: {
        universeId: universes.get(community.universe)!,
        name: community.name,
        nameNormalized: community.name, // o gatilho do RN04 reescreve
        intro: community.intro,
        createdById: PEOPLE[0].id,
      },
    });
    communities.set(community.name, created.id);

    // Quem cria é moderador (RN06); o resto entra como membro.
    await prisma.membership.create({
      data: { communityId: created.id, profileId: PEOPLE[0].id, role: "moderator" },
    });
    await prisma.membership.createMany({
      data: PEOPLE.slice(1).map((person) => ({
        communityId: created.id,
        profileId: person.id,
      })),
    });
  }

  console.log("criando tópicos e respostas…");
  const eletronica = communities.get("Música Eletrônica")!;

  // RN07: 1 tópico por pessoa por dia em cada comunidade — por isso cada
  // tópico da mesma comunidade tem um autor diferente.
  const primeiraFesta = await prisma.topic.create({
    data: {
      communityId: eletronica,
      authorId: PEOPLE[0].id,
      name: "primeira festa",
      description: "Como foi a primeira festa que te fez gostar de música eletrônica?",
      cycleDate: new Date(),
    },
  });

  await prisma.answer.createMany({
    data: [
      {
        topicId: primeiraFesta.id,
        authorId: PEOPLE[1].id,
        text: "Um set de 6 horas num galpão. Saí de lá sabendo que era isso.",
      },
      {
        topicId: primeiraFesta.id,
        authorId: PEOPLE[2].id,
        text: "Festa pequena, 60 pessoas, sistema de som honesto. Nunca mais achei igual.",
      },
      {
        topicId: primeiraFesta.id,
        authorId: PEOPLE[3].id,
        text: "Fui arrastado por um amigo e fiquei até o sol nascer.",
      },
    ],
  });

  await prisma.topic.create({
    data: {
      communityId: communities.get("Vinil")!,
      authorId: PEOPLE[1].id,
      name: "achado de sebo",
      description: "Qual foi o melhor disco que você achou sem estar procurando?",
      cycleDate: new Date(),
    },
  });

  // RN18: seguir é manual. Lia segue o tópico, então ele vai para a Coleção
  // dela — é o dado que os testes de privacidade usam.
  await prisma.follow.create({
    data: { followerId: PEOPLE[0].id, target: "topic", topicId: primeiraFesta.id },
  });
  await prisma.follow.create({
    data: { followerId: PEOPLE[0].id, target: "profile", followedProfileId: PEOPLE[1].id },
  });

  const counts = {
    pessoas: await prisma.profile.count(),
    universos: await prisma.universe.count(),
    comunidades: await prisma.community.count(),
    tópicos: await prisma.topic.count(),
    respostas: await prisma.answer.count(),
  };
  console.log("pronto:", counts);
}

await main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
