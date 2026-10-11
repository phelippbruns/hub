-- F10: o agendamento que chama a virada do ciclo.
SET search_path TO public, extensions;

/*
 * De hora em hora, e não só à meia-noite. Dois motivos, e os dois doem:
 *
 * 1. O pg_cron agenda no fuso do **servidor**, que é UTC. O fuso do ciclo é
 *    uma configuração (`hub_cycle_timezone()`). Escrever "03:00 UTC" na
 *    agenda esconderia a configuração num lugar que ninguém olha, e
 *    quebraria calado no dia em que o fuso mudasse.
 *
 * 2. Um agendamento único que não roda — banco indisponível, manutenção —
 *    **pula o dia inteiro em silêncio**. De hora em hora, a execução
 *    seguinte conserta sozinha.
 *
 * `hub_ciclo_pendente()` não faz nada quando o dia já virou, então as outras
 * 23 execuções custam uma consulta de índice.
 *
 * O bloco abaixo **não derruba a migration** se a extensão não puder ser
 * criada: em projeto hospedado, ligar o pg_cron às vezes exige o painel. O
 * ciclo continua funcionando por `npm run ciclo:rodar`, e o aviso diz o que
 * falta. Falhar aqui travaria o deploy de tudo por causa de um agendamento.
 */
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  PERFORM cron.unschedule('hub-virar-ciclo')
   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hub-virar-ciclo');

  PERFORM cron.schedule('hub-virar-ciclo', '0 * * * *', 'SELECT hub_ciclo_pendente()');

  RAISE NOTICE 'F10: ciclo agendado de hora em hora.';
EXCEPTION
  WHEN insufficient_privilege OR feature_not_supported OR undefined_file THEN
    RAISE WARNING
      'F10: não consegui agendar o ciclo (pg_cron indisponível aqui). Ligue a extensão no painel do Supabase e rode esta migration de novo, ou use `npm run ciclo:rodar`. Motivo: %',
      SQLERRM;
END;
$$;
