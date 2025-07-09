-- Migração para corrigir a recursão infinita na política de RLS da tabela users
-- Data: 2025-07-09

-- Remover a política antiga que causa recursão
DROP POLICY IF EXISTS "Users can read all users for task assignment" ON public.users;

-- Adicionar nova política para permitir que usuários autenticados vejam outros usuários sem causar recursão
CREATE POLICY "Users can read all users for task assignment" 
ON public.users
FOR SELECT
TO authenticated
USING ((auth.jwt() ->> 'role') = 'authenticated');

-- Comentário explicativo
COMMENT ON POLICY "Users can read all users for task assignment" ON public.users IS 'Permite que usuários autenticados vejam todos os usuários para atribuição de tarefas, evitando recursão infinita.';