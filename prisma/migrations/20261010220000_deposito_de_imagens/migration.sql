-- F09: o depósito de imagens.
SET search_path TO public, extensions;

/*
 * Um depósito **privado**. Público seria mais simples, e deixaria qualquer
 * imagem do Hub aberta para sempre a quem descobrisse o endereço — inclusive
 * depois de a resposta ser apagada.
 *
 * Privado quer dizer que a tela recebe uma URL assinada de validade curta,
 * gerada na hora de desenhar (regra de segurança 7).
 *
 * O limite e os tipos também ficam aqui, e não só no app: é a segunda
 * barreira, do mesmo jeito que o RLS existe mesmo com a camada lib/data/.
 */
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'imagens',
  'imagens',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
   SET public = false,
       file_size_limit = EXCLUDED.file_size_limit,
       allowed_mime_types = EXCLUDED.allowed_mime_types;

/*
 * NÃO existe política de acesso para quem está logado no navegador, e isso é
 * **proposital** — não é esquecimento.
 *
 * Quem escreve e lê o depósito é o servidor, com a chave de serviço, depois
 * de conferir a permissão em lib/data/. É o mesmo desenho da regra de
 * segurança 1. Sem política, o navegador não alcança o depósito direto, e é
 * isso que garante que nenhuma imagem entra sem passar pela conferência de
 * tipo e pela remoção da localização.
 *
 * O RLS do Storage já vem ligado pelo Supabase. Se alguém acrescentar uma
 * política para `authenticated` aqui, estará abrindo um caminho que contorna
 * a limpeza das fotos.
 */
