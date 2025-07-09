-- Migração para criar uma função que busca todos os usuários, evitando RLS recursivo
-- Data: 2025-07-10

CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (id uuid, username text, role text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT u.id, u.username, u.role, u.created_at FROM public.users u;
END;
$$;

-- Conceder permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated;

COMMENT ON FUNCTION get_all_users() IS 'Busca todos os usuários com privilégios de definidor para evitar recursão de RLS.';