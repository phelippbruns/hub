-- RN31: marcar quando o onboarding terminou.
--
-- Deduzir de "já segue 3 comunidades" seria frágil: quem saísse de uma depois
-- voltaria a cair no onboarding, como se nunca tivesse entrado no Hub.

ALTER TABLE profiles ADD COLUMN onboarded_at timestamptz;

COMMENT ON COLUMN profiles.onboarded_at IS
  'RN31: quando a pessoa concluiu o onboarding. Nulo significa que ainda não passou.';

-- Perfis que já existiam entraram antes de haver onboarding; mandá-los para
-- ele agora seria interromper quem já está usando o Hub.
UPDATE profiles SET onboarded_at = created_at WHERE onboarded_at IS NULL;
