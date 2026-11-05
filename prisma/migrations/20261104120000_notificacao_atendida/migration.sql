-- A notificação sai do topo quando **ela** é clicada, não quando a central
-- é aberta.
--
-- `read_at` já existia e serve ao ponto do sino: abrir a central marca
-- tudo como lido de uma vez. Reaproveitá-lo para o topo faria a área
-- inteira sumir na primeira visita, e a decisão do PO em 4 de novembro foi
-- outra: só a que foi clicada sai, as demais continuam esperando.
--
-- São duas perguntas diferentes — "você viu que chegou algo?" e "você
-- atendeu este aqui?" —, e uma coluna só não responde as duas.

ALTER TABLE notifications ADD COLUMN opened_at timestamptz;

COMMENT ON COLUMN notifications.opened_at IS
  'Quando a pessoa clicou neste aviso e foi ao destino. Tira da área "Só para te avisar" (tela 8).';

-- A área de cima procura o que é pessoal e ainda não foi atendido. Sem
-- índice isso é varredura na tabela inteira de quem tem muita notificação.
CREATE INDEX notifications_profile_opened_idx
    ON notifications (profile_id, opened_at, created_at DESC);
