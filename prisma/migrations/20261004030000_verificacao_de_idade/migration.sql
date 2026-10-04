-- Verificação de idade: data de nascimento, status e método.
--
-- Antes havia só `age_verified_at`, que diz *quando* mas não *como* nem *em
-- que pé*. Com os três campos dá para, quando o provedor real existir,
-- encontrar quem foi aprovado por autodeclaração e pedir a verificação de
-- verdade — sem refazer o cadastro de ninguém.
--
-- Escrita à mão porque `prisma migrate dev` não roda neste projeto: ele
-- introspecta o banco e esbarra na chave estrangeira de `profiles` para
-- `auth.users`, que é schema do Supabase e não do Prisma (erro P4002).

CREATE TYPE age_verification_status AS ENUM ('pending', 'verified', 'rejected');

CREATE TYPE age_verification_method AS ENUM (
  'self_declared',
  -- Ainda não implementados. Entram no tipo desde já para integrar um
  -- provedor externo depois sem migration nova.
  'document',
  'facial',
  'external_provider'
);

ALTER TABLE profiles
  -- `date`, sem hora nem fuso: nascimento é um dia do calendário, e carregar
  -- fuso junto faria a idade mudar conforme o servidor.
  ADD COLUMN birth_date date,
  ADD COLUMN age_verification_status age_verification_status NOT NULL DEFAULT 'pending',
  ADD COLUMN age_verification_method age_verification_method;

COMMENT ON COLUMN profiles.birth_date IS
  'Data de nascimento informada no cadastro. Opcional no banco por causa dos perfis anteriores ao campo; o cadastro exige.';
COMMENT ON COLUMN profiles.age_verification_status IS
  'pending cobre o provedor externo que responde depois do cadastro.';

/*
 * Perfis que já tinham `age_verified_at` foram aprovados pelo único método que
 * existia: a data declarada. Registrar isso agora é o que vai permitir
 * encontrá-los quando a verificação de verdade entrar.
 */
UPDATE profiles
   SET age_verification_status = 'verified',
       age_verification_method = 'self_declared'
 WHERE age_verified_at IS NOT NULL;
