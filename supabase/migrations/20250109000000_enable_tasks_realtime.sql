    -- Migração para habilitar realtime na tabela tasks
    -- Data: 2025-01-09

    -- 1. Adicionar tabela tasks à publicação do realtime
    DO $$ 
    BEGIN
        -- Verificar se a tabela tasks já está na publicação realtime
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'tasks'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
        END IF;
    END $$;

    -- 2. Criar política específica para realtime na tabela tasks
    DROP POLICY IF EXISTS "Realtime access for tasks" ON tasks;

    CREATE POLICY "Realtime access for tasks"
    ON tasks
    FOR ALL
    TO authenticated
    USING (
        auth.uid() = user_id OR auth.uid() = assigned_to_id
    );

    -- 3. Garantir que RLS está habilitado
    ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

    -- 4. Criar índices para otimizar as consultas realtime
    CREATE INDEX IF NOT EXISTS idx_tasks_realtime_user_id ON tasks(user_id) WHERE user_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_realtime_assigned_to ON tasks(assigned_to_id) WHERE assigned_to_id IS NOT NULL;

    -- 5. Comentário explicativo
    COMMENT ON TABLE tasks IS 'Tabela de tarefas com suporte a realtime habilitado';