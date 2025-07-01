-- Migração para corrigir problemas de Realtime e constraint única
-- Data: 2025-07-01

-- 1. Corrigir constraint única que está causando conflito de duplicate key
-- Permitir múltiplas conexões por usuário (histórico)
ALTER TABLE whatsapp_connections DROP CONSTRAINT IF EXISTS whatsapp_connections_user_id_key;

-- Criar constraint única apenas para conexões ativas (evitar múltiplas conexões simultâneas)
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_connections_active_user 
ON whatsapp_connections(user_id) 
WHERE status IN ('connecting', 'qr_ready', 'connected');

-- 2. Adicionar política específica para Realtime (necessária para subscriptions funcionarem)
DROP POLICY IF EXISTS "Realtime access for whatsapp_connections" ON whatsapp_connections;

CREATE POLICY "Realtime access for whatsapp_connections"
ON whatsapp_connections
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- 3. Garantir que a tabela whatsapp_messages também tenha política para Realtime
DROP POLICY IF EXISTS "Realtime access for whatsapp_messages" ON whatsapp_messages;

CREATE POLICY "Realtime access for whatsapp_messages"
ON whatsapp_messages
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- 4. Criar função para limpar conexões antigas e permitir nova conexão
CREATE OR REPLACE FUNCTION cleanup_old_whatsapp_connections(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Marcar conexões antigas como desconectadas
    UPDATE whatsapp_connections 
    SET 
        status = 'disconnected',
        disconnected_at = now(),
        qr_code = null
    WHERE user_id = p_user_id 
      AND status IN ('connecting', 'qr_ready', 'connected', 'error');
END;
$$;

-- 5. Criar função para upsert seguro de conexão WhatsApp
CREATE OR REPLACE FUNCTION upsert_whatsapp_connection(
    p_user_id uuid,
    p_status text,
    p_qr_code text DEFAULT NULL,
    p_whatsapp_user jsonb DEFAULT NULL,
    p_error_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    connection_id uuid;
BEGIN
    -- Primeiro, limpar conexões antigas
    PERFORM cleanup_old_whatsapp_connections(p_user_id);
    
    -- Inserir ou atualizar conexão atual
    INSERT INTO whatsapp_connections (
        user_id,
        status,
        qr_code,
        whatsapp_user,
        phone_number,
        connected_at,
        disconnected_at,
        error_message,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_status,
        p_qr_code,
        p_whatsapp_user,
        CASE WHEN p_whatsapp_user IS NOT NULL THEN p_whatsapp_user->>'id' ELSE NULL END,
        CASE WHEN p_status = 'connected' THEN now() ELSE NULL END,
        CASE WHEN p_status = 'disconnected' THEN now() ELSE NULL END,
        p_error_message,
        now(),
        now()
    )
    ON CONFLICT (user_id) 
    WHERE status IN ('connecting', 'qr_ready', 'connected')
    DO UPDATE SET
        status = EXCLUDED.status,
        qr_code = EXCLUDED.qr_code,
        whatsapp_user = EXCLUDED.whatsapp_user,
        phone_number = EXCLUDED.phone_number,
        connected_at = EXCLUDED.connected_at,
        disconnected_at = EXCLUDED.disconnected_at,
        error_message = EXCLUDED.error_message,
        updated_at = now()
    RETURNING id INTO connection_id;
    
    -- Se não houve conflito, pegar o ID da nova inserção
    IF connection_id IS NULL THEN
        SELECT id INTO connection_id 
        FROM whatsapp_connections 
        WHERE user_id = p_user_id 
          AND status = p_status 
        ORDER BY created_at DESC 
        LIMIT 1;
    END IF;
    
    RETURN connection_id;
END;
$$;

-- 6. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_status 
ON whatsapp_connections(status) 
WHERE status IN ('connecting', 'qr_ready', 'connected');

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_lead 
ON whatsapp_messages(user_id, lead_id, message_timestamp DESC);

-- 7. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_whatsapp_connections_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_whatsapp_connections_updated_at_trigger ON whatsapp_connections;

CREATE TRIGGER update_whatsapp_connections_updated_at_trigger
    BEFORE UPDATE ON whatsapp_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_connections_updated_at();
