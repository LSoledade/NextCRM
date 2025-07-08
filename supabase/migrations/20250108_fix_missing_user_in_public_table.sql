-- Migração para corrigir usuário faltante na tabela public.users e sincronização automática

-- Inserir usuário faltante na tabela public.users
INSERT INTO public.users (id, username, role)
SELECT 
    id,
    COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)) as username,
    COALESCE(raw_user_meta_data->>'role', 'admin') as role
FROM auth.users 
WHERE id NOT IN (SELECT id FROM public.users)
  AND email IS NOT NULL;

-- Criar uma função para sincronizar automaticamente novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, username, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para executar a função quando um novo usuário for criado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Comentário: Esta migração resolve o problema de usuários que existem na tabela auth.users
-- mas não têm um registro correspondente na tabela public.users, que é necessário para
-- as verificações de autorização no sistema.
