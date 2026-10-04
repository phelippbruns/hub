# supabase/policies/

**O SQL não mora aqui.** Funções, gatilhos e políticas de Row Level Security
ficam em `prisma/migrations/`, junto com as migrations do schema:

| Migration           | O que tem                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| `*_schema_inicial`  | as 16 tabelas, geradas pelo Prisma                                                                |
| `*_regras_no_banco` | normalização do nome (RN04), gatilhos de RN05, RN07, RN08, RN20 e RN21, e os CHECK de integridade |
| `*_rls`             | RLS ligado em todas as tabelas e as políticas                                                     |

Migration aplicada não se edita: para mudar uma regra, crie uma migration nova.
Assim `prisma migrate deploy` reconstrói o banco inteiro do zero, na ordem
certa, que é o primeiro critério de aceite da F02.

## Por que o RLS existe, se o Prisma o ignora

O Prisma conecta como dono do banco e passa por cima do RLS. A autorização de
verdade está em [lib/data/](../../lib/data/) (regra de segurança 1). O RLS é a
segunda barreira, e é obrigatório onde o navegador fala direto com o Supabase:

- **`messages` e `cabin_members`** — o Realtime da Cabine
- **Storage** — capas, fotos de perfil e mídia das respostas
- **`follows`** — a Coleção e a lista de seguindo, que são privadas (RN18, RN27)

## Como o banco sabe quem está pedindo

`hub_viewer_id()` devolve `auth.uid()` quando há sessão do Supabase. Em teste,
onde não existe sessão, cai para `current_setting('hub.viewer_id')` — é assim
que os testes de RLS se passam por cada pessoa.
