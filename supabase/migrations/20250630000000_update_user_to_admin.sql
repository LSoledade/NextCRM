-- Migração para atualizar usuário para admin
-- Execute este arquivo no Supabase Dashboard ou via CLI

-- Atualizar usuário específico para admin
UPDATE users 
SET role = 'admin' 
WHERE id = '350e2afd-2c1f-4668-bf4a-fa4f3a9b027d';

-- Alternativa: Atualizar o usuário atual para admin (se estiver logado)
-- UPDATE users 
-- SET role = 'admin' 
-- WHERE id = auth.uid();

-- Opção por email (se preferir):
-- UPDATE users 
-- SET role = 'admin' 
-- WHERE id = (
--   SELECT id FROM auth.users 
--   WHERE email = 'seu-email@exemplo.com'
-- );

-- Verificar se a atualização foi bem-sucedida
SELECT id, username, role, created_at 
FROM users 
WHERE role = 'admin';
