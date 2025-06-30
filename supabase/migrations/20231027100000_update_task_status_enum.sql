-- Gerado por Jules para FavaleTrainer CRM
-- Migração para atualizar o ENUM de status da tabela tasks

BEGIN;

-- Passo 1: Renomear o tipo ENUM existente.
-- Primeiro, precisamos verificar se o tipo ENUM existe. O nome do tipo ENUM
-- é geralmente 'status', mas pode ter um nome gerado pelo Supabase/PostgreSQL.
-- Vamos assumir que o nome do tipo é o mesmo que o nome da coluna para fins de script,
-- mas no Supabase, o tipo ENUM pode ter um nome como "task_status_enum" ou similar.
-- O usuário precisará verificar o nome exato do tipo ENUM no schema do banco de dados.
-- Para este script, vamos usar um placeholder 'tasks_status_enum_actual_name'.
-- O usuário deve substituir 'tasks_status_enum_actual_name' pelo nome real do tipo ENUM.

-- Exemplo de como encontrar o nome do tipo enum:
-- SELECT t.typname AS enum_name
-- FROM pg_type t
-- JOIN pg_enum e ON t.oid = e.enumtypid
-- JOIN pg_namespace n ON n.oid = t.typnamespace
-- WHERE t.typname = 'status' OR t.typname LIKE '%task%status%'; -- Ajuste o filtro conforme necessário

-- Assumindo que o nome do tipo é 'status' (o que é comum se não especificado de outra forma)
-- Se o tipo for usado por outras tabelas ou funções, esta migração pode precisar de ajustes.
-- Esta migração foca apenas na tabela 'tasks'.

-- Tentativa de renomear o tipo ENUM 'status'. Se o seu tipo tiver outro nome, ajuste aqui.
-- É mais seguro fazer isso com o nome exato do tipo ENUM.
-- Se o ENUM se chamar apenas "status", o comando abaixo funcionaria.
-- No entanto, é mais provável que ele tenha um nome como "public.status" ou um nome gerado.
-- Para segurança, vamos comentar este ALTER TYPE e instruir o usuário a fazê-lo com o nome correto.
-- ALTER TYPE public.status RENAME TO old_status_enum; -- SUBSTITUA 'public.status' PELO NOME CORRETO DO SEU ENUM

-- Se você não souber o nome exato, pode ser necessário primeiro remover o default da coluna,
-- alterar a coluna para usar TEXT temporariamente, criar o novo enum, e depois converter de volta.
-- Essa abordagem é mais complexa mas mais robusta se o nome do enum não for conhecido.

-- Abordagem mais segura se o nome do ENUM não é facilmente identificável ou se há dependências:
-- 1. Adicionar uma nova coluna com o novo tipo ENUM.
-- 2. Copiar e mapear dados.
-- 3. Remover a coluna antiga.
-- 4. Renomear a nova coluna.

-- Passo 1 (alternativo e mais seguro): Alterar a coluna existente para TEXT temporariamente.
-- Primeiro, remova o default se houver algum usando o tipo antigo.
ALTER TABLE public.tasks ALTER COLUMN status DROP DEFAULT;

-- Converta a coluna 'status' para TEXT. Os valores existentes serão preservados como texto.
ALTER TABLE public.tasks ALTER COLUMN status TYPE TEXT;

-- Passo 2: Remover o tipo ENUM antigo.
-- É crucial que você substitua 'tasks_status_enum_actual_name' pelo nome real do seu tipo ENUM.
-- Se o tipo ENUM se chamar 'status', o comando seria:
-- DROP TYPE IF EXISTS public.status; -- CUIDADO: Verifique o nome correto do tipo!
-- Este passo é perigoso se o nome não estiver correto ou se o tipo estiver em uso em outro lugar.
-- Vamos assumir que o tipo precisa ser removido para ser recriado com o mesmo nome 'status'.
-- Se o seu ENUM tiver um nome diferente (ex: task_status), use esse nome.
-- Para evitar erros, liste os ENUMs no seu DB e identifique o correto.
-- Ex: \dT+ public.*status* no psql.
-- Se o tipo antigo se chama 'status':
DROP TYPE IF EXISTS public.status CASCADE; -- Usar CASCADE para remover dependências como o cast da coluna.
                                      -- Certifique-se de que isso não afetará outras tabelas inesperadamente.

-- Passo 3: Criar o novo tipo ENUM 'status' com os novos valores.
CREATE TYPE public.status AS ENUM (
  'Backlog',
  'Em andamento',
  'Bloqueadas',
  'Em Analise',
  'Concluidas'
);

-- Passo 4: Alterar a coluna 'status' para usar o novo tipo ENUM, mapeando valores antigos.
-- Como a coluna agora é TEXT, podemos alterá-la para o novo tipo ENUM
-- usando uma cláusula USING para converter os valores.
ALTER TABLE public.tasks
  ALTER COLUMN status TYPE public.status
  USING (
    CASE status
      WHEN 'Todo' THEN 'Backlog'::public.status
      WHEN 'InProgress' THEN 'Em andamento'::public.status
      WHEN 'Done' THEN 'Concluidas'::public.status
      -- Se houver outros status antigos que precisam ser mapeados ou tratados:
      -- WHEN 'OldStatusX' THEN 'NewStatusY'::public.status
      -- Se algum status antigo não tiver mapeamento, pode causar erro ou ser nulo
      -- dependendo da configuração. Adicionar um ELSE para tratar casos não mapeados:
      ELSE 'Backlog'::public.status -- Ou qualquer outro default apropriado / tratamento de erro
    END
  );

-- Passo 5: Definir um valor padrão para a coluna status, se desejado (ex: 'Backlog').
ALTER TABLE public.tasks ALTER COLUMN status SET DEFAULT 'Backlog';

COMMIT;

-- Instruções para o usuário:
-- 1. Antes de aplicar esta migração, FAÇA UM BACKUP DO SEU BANCO DE DADOS.
-- 2. Verifique o nome exato do seu tipo ENUM de status atual na tabela 'tasks'.
--    Você pode usar o SQL Editor do Supabase para inspecionar a definição da tabela 'tasks'
--    ou usar um comando psql como `\dT+ public.nome_do_seu_enum`.
--    O script tenta uma abordagem mais robusta convertendo para TEXT e recriando o ENUM,
--    o que deve funcionar mesmo que o nome do tipo ENUM não seja 'status'.
-- 3. O script assume que os únicos status antigos são 'Todo', 'InProgress', e 'Done'.
--    Se você tiver outros valores no seu ENUM de status atual, você precisará
--    ajustar a cláusula CASE na seção "ALTER COLUMN status TYPE public.status USING"
--    para mapeá-los corretamente para os novos status.
--    Valores não mapeados serão convertidos para 'Backlog' como fallback (definido no ELSE).
-- 4. Execute este script no SQL Editor do seu projeto Supabase.
-- 5. Após a execução, verifique se os dados na coluna 'status' da tabela 'tasks'
--    foram migrados corretamente para os novos valores.
-- 6. Teste a funcionalidade de tarefas na sua aplicação para garantir que tudo
--    funciona como esperado com os novos status.
```
