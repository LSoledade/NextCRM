-- Migração para corrigir problemas de constraints, Realtime e otimizações WhatsApp
-- Aplicada após todas as migrações anteriores

-- 1. Corrigir constraint única para permitir múltiplas conexões históricas
-- mas apenas uma ativa por usuário
ALTER TABLE whatsapp_connections 
DROP CONSTRAINT IF EXISTS whatsapp_connections_user_id_key;

-- Criar constraint parcial que permite apenas uma conexão ativa por usuário
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_connections_user_active 
ON whatsapp_connections (user_id) 
WHERE is_active = true;

-- 2. Adicionar políticas específicas para Realtime nas mensagens do WhatsApp
-- Remover política existente se houver
DROP POLICY IF EXISTS "Realtime access for whatsapp_messages" ON whatsapp_messages;

-- Criar política para Realtime nas mensagens
CREATE POLICY "Realtime access for whatsapp_messages"
ON whatsapp_messages
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- 3. Garantir que as tabelas estão habilitadas para Realtime
-- (isso deve ser feito via Dashboard do Supabase, mas documentamos aqui)
-- ALTER publication supabase_realtime ADD TABLE whatsapp_connections;
-- ALTER publication supabase_realtime ADD TABLE whatsapp_messages;

-- 4. Criar função para upsert seguro de conexões WhatsApp
CREATE OR REPLACE FUNCTION upsert_whatsapp_connection(
    p_user_id uuid,
    p_connection_id text,
    p_phone_number text DEFAULT NULL,
    p_status text DEFAULT 'connecting',
    p_qr_code text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_connection_uuid uuid;
    v_existing_id uuid;
BEGIN
    -- Primeiro, desativar todas as conexões existentes do usuário
    UPDATE whatsapp_connections 
    SET is_active = false, updated_at = NOW()
    WHERE user_id = p_user_id AND is_active = true;
    
    -- Tentar encontrar conexão existente com o mesmo connection_id
    SELECT id INTO v_existing_id
    FROM whatsapp_connections
    WHERE user_id = p_user_id AND connection_id = p_connection_id;
    
    IF v_existing_id IS NOT NULL THEN
        -- Atualizar conexão existente
        UPDATE whatsapp_connections
        SET 
            phone_number = COALESCE(p_phone_number, phone_number),
            status = p_status,
            qr_code = p_qr_code,
            is_active = true,
            updated_at = NOW()
        WHERE id = v_existing_id;
        
        v_connection_uuid := v_existing_id;
    ELSE
        -- Inserir nova conexão
        INSERT INTO whatsapp_connections (
            user_id,
            connection_id,
            phone_number,
            status,
            qr_code,
            is_active
        ) VALUES (
            p_user_id,
            p_connection_id,
            p_phone_number,
            p_status,
            p_qr_code,
            true
        ) RETURNING id INTO v_connection_uuid;
    END IF;
    
    RETURN v_connection_uuid;
END;
$$;

-- 5. Criar função para limpeza de conexões antigas
CREATE OR REPLACE FUNCTION cleanup_old_whatsapp_connections(
    p_days_old integer DEFAULT 30
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count integer;
BEGIN
    DELETE FROM whatsapp_connections
    WHERE is_active = false 
    AND updated_at < NOW() - INTERVAL '1 day' * p_days_old;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$;

-- 6. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_status 
ON whatsapp_connections(status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_updated_at 
ON whatsapp_connections(updated_at);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_lead_timestamp 
ON whatsapp_messages(lead_id, message_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_timestamp 
ON whatsapp_messages(user_id, message_timestamp DESC);

-- 7. Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger nas tabelas relevantes
DROP TRIGGER IF EXISTS update_whatsapp_connections_updated_at ON whatsapp_connections;
CREATE TRIGGER update_whatsapp_connections_updated_at
    BEFORE UPDATE ON whatsapp_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_whatsapp_messages_updated_at ON whatsapp_messages;
CREATE TRIGGER update_whatsapp_messages_updated_at
    BEFORE UPDATE ON whatsapp_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Otimizar a função get_whatsapp_chat_list para melhor performance
CREATE OR REPLACE FUNCTION get_whatsapp_chat_list()
RETURNS TABLE (
    lead_id uuid,
    lead_name text,
    lead_phone text,
    lead_email text,
    lead_status text,
    lead_user_id uuid,
    lead_created_at timestamptz,
    lead_updated_at timestamptz,
    last_message text,
    last_message_timestamp timestamptz,
    is_from_lead boolean,
    unread_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH latest_messages AS (
        SELECT DISTINCT ON (wm.lead_id)
            wm.lead_id,
            wm.message_content as last_message,
            wm.message_timestamp as last_message_timestamp,
            wm.is_from_lead
        FROM whatsapp_messages wm
        WHERE wm.user_id = auth.uid()
        ORDER BY wm.lead_id, wm.message_timestamp DESC
    ),
    unread_counts AS (
        SELECT 
            wm.lead_id,
            COUNT(*) as unread_count
        FROM whatsapp_messages wm
        WHERE wm.user_id = auth.uid() 
        AND wm.is_from_lead = true 
        AND wm.is_read = false
        GROUP BY wm.lead_id
    )
    SELECT 
        l.id as lead_id,
        l.name as lead_name,
        l.phone as lead_phone,
        l.email as lead_email,
        l.status as lead_status,
        l.user_id as lead_user_id,
        l.created_at as lead_created_at,
        l.updated_at as lead_updated_at,
        lm.last_message,
        lm.last_message_timestamp,
        lm.is_from_lead,
        COALESCE(uc.unread_count, 0) as unread_count
    FROM latest_messages lm
    JOIN leads l ON l.id = lm.lead_id
    LEFT JOIN unread_counts uc ON uc.lead_id = l.id
    WHERE l.user_id = auth.uid()
    ORDER BY lm.last_message_timestamp DESC;
END;
$$;

-- 9. Comentários para próximos passos manuais necessários:
-- ATENÇÃO: Os seguintes passos devem ser executados manualmente no Dashboard do Supabase:
-- 
-- 1. Habilitar Realtime para as tabelas:
--    - Vá para Database > Replication
--    - Adicione as tabelas: whatsapp_connections, whatsapp_messages
--
-- 2. Verificar se as policies de Realtime estão funcionando:
--    - Teste subscriptions no frontend
--    - Verifique logs de erros no Dashboard
--
-- 3. Configurar cleanup automático (opcional):
--    - Criar cron job para executar cleanup_old_whatsapp_connections()
--    - Sugestão: executar semanalmente

COMMIT;
