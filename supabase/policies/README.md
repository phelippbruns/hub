# supabase/policies/

Políticas de Row Level Security e funções SQL, em arquivos `.sql` versionados.

O RLS é a segunda barreira (regra de segurança 2): ele não substitui a
conferência de permissão em `lib/data/`, mas é obrigatório onde o navegador
fala direto com o Supabase — Realtime da Cabine e Storage.

Conteúdo entra na **F02**.
