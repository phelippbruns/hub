-- RN15 (reescrita em 5 de novembro de 2026): a estrela da contribuição.
--
-- A RN15 dizia "não há curtidas nem contador por resposta". O PO virou a
-- regra no protótipo v6, e a virada está registrada em docs/vacilos.md.
-- A estrela entra **com limites**, e os limites moram aqui:
--
--   * uma por pessoa por contribuição — é a chave primária composta,
--     não uma contagem no código;
--   * dar de novo retira — a linha existe ou não existe;
--   * não há lista de quem deu — nenhuma consulta a devolve;
--   * não há soma no perfil, e não há efeito no ciclo das 00h. O Hot
--     Topic continua contando pessoas diferentes respondendo. Se a
--     estrela entrasse ali, o destaque viraria concurso de popularidade,
--     que é o que o Princípio 2 do escopo recusa.
--
-- O que **não** fica no banco: a conferência de que quem dá estrela é
-- membro ativo da comunidade e não está bloqueado. Ela depende de duas
-- tabelas e de uma mensagem boa, e mora em lib/data/topics.ts. O RLS aqui
-- é segunda barreira (regra de segurança 2).

SET search_path TO public, extensions;

CREATE TABLE IF NOT EXISTS "answer_stars" (
    "answer_id"  UUID NOT NULL REFERENCES "answers" ("id") ON DELETE CASCADE,
    "profile_id" UUID NOT NULL REFERENCES "profiles" ("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    PRIMARY KEY ("answer_id", "profile_id")
);

COMMENT ON TABLE "answer_stars" IS
    'RN15: uma estrela por pessoa por contribuição. A chave primária composta É a regra.';

-- O limite de taxa lê por aqui: quantas estrelas esta pessoa deu no último
-- minuto. Sem tabela nova — a própria é o registro.
CREATE INDEX IF NOT EXISTS "answer_stars_profile_created_idx"
    ON "answer_stars" ("profile_id", "created_at" DESC);

ALTER TABLE "answers" ADD COLUMN IF NOT EXISTS "star_count" INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN "answers"."star_count" IS
    'RN15: mantido pelo gatilho answer_stars_contar, nunca pela aplicação.';

-- A ordem padrão da tela do tópico: mais estrelas, empate na mais recente.
CREATE INDEX IF NOT EXISTS "answers_topic_star_count_created_at_idx"
    ON "answers" ("topic_id", "star_count" DESC, "created_at" DESC);

-- O contador é do banco, e não da aplicação.
--
-- Ler, somar e escrever no app perde estrela: duas pessoas clicando no
-- mesmo instante leem o mesmo número e uma das duas escritas vence. O
-- gatilho soma sobre a linha já travada pelo INSERT/DELETE, então a conta
-- não tem como divergir — é o mesmo motivo do gatilho do limite de tópico
-- por dia.
CREATE OR REPLACE FUNCTION hub_answer_stars_contar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE answers SET star_count = star_count + 1 WHERE id = NEW.answer_id;
        RETURN NEW;
    END IF;

    UPDATE answers SET star_count = GREATEST(star_count - 1, 0) WHERE id = OLD.answer_id;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS "answer_stars_contar" ON "answer_stars";
CREATE TRIGGER "answer_stars_contar"
    AFTER INSERT OR DELETE ON "answer_stars"
    FOR EACH ROW EXECUTE FUNCTION hub_answer_stars_contar();

-- Segunda barreira (regra de segurança 2). A autorização de verdade é
-- `lib/data/`, porque o Prisma conecta como dono e ignora o RLS.
ALTER TABLE "answer_stars" ENABLE ROW LEVEL SECURITY;

-- Ler é livre: o número aparece para todo mundo que vê a contribuição.
DROP POLICY IF EXISTS "answer_stars_read" ON "answer_stars";
CREATE POLICY "answer_stars_read" ON "answer_stars" FOR SELECT
    USING (true);

-- Escrever é só a própria linha, e só em contribuição viva de comunidade
-- de que a pessoa é membro não banido.
DROP POLICY IF EXISTS "answer_stars_write_own" ON "answer_stars";
CREATE POLICY "answer_stars_write_own" ON "answer_stars" FOR ALL
    USING ("profile_id" = hub_viewer_id())
    WITH CHECK (
        "profile_id" = hub_viewer_id()
        AND EXISTS (
            SELECT 1
              FROM answers a
              JOIN topics t ON t.id = a.topic_id
              JOIN memberships m ON m.community_id = t.community_id
             WHERE a.id = answer_id
               AND a.deleted_at IS NULL
               AND t.deleted_at IS NULL
               AND m.profile_id = hub_viewer_id()
               AND m.banned_at IS NULL
        )
    );
