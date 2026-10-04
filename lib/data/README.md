# lib/data/

Camada única de acesso ao banco (regra de segurança 1).

O Prisma conecta com permissão ampla e **ignora o Row Level Security**. Por isso
toda função daqui começa conferindo quem está pedindo e se pode:

```ts
export async function obterColecao(usuarioId: string, donoId: string) {
  // RN27: só o dono vê a própria Coleção.
  if (usuarioId !== donoId) throw new ForbiddenError();
  return prisma.topicoSeguido.findMany({ where: { usuarioId: donoId } });
}
```

Nenhum componente, Server Action ou rota importa `@prisma/client` nem
`lib/data/prisma` direto — o ESLint bloqueia (`eslint.config.mjs`).
