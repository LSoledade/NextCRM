-- Fix WhatsApp constraints and Realtime setup
-- This migration fixes the previous migration that referenced a non-existent column

-- 1. Drop any existing constraint on user_id (in case it exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'whatsapp_connections_user_id_key' 
        AND table_name = 'whatsapp_connections'
    ) THEN
        ALTER TABLE whatsapp_connections DROP CONSTRAINT whatsapp_connections_user_id_key;
    END IF;
END $$;

-- 2. Create a partial unique index to ensure only one active connection per user
-- Active statuses: 'connecting', 'qr_ready', 'connected'
-- This allows multiple old connections with status 'disconnected' or 'error'
DROP INDEX IF EXISTS idx_whatsapp_connections_active_user;
CREATE UNIQUE INDEX idx_whatsapp_connections_active_user 
ON whatsapp_connections (user_id) 
WHERE status IN ('connecting', 'qr_ready', 'connected');

-- 3. Ensure whatsapp tables are published for realtime (only if not already added)
DO $$ 
BEGIN
    -- Add whatsapp_messages table if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'whatsapp_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;
    END IF;
    
    -- Add whatsapp_connections table if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'whatsapp_connections'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_connections;
    END IF;
END $$;

-- 4. Create/refresh realtime policies for whatsapp_messages
DROP POLICY IF EXISTS "whatsapp_messages_realtime" ON whatsapp_messages;
CREATE POLICY "whatsapp_messages_realtime" 
ON whatsapp_messages FOR ALL 
TO authenticated 
USING (EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = whatsapp_messages.lead_id 
    AND leads.user_id = (SELECT auth.uid())
));

-- 5. Add indices for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_lead_timestamp 
ON whatsapp_messages (lead_id, message_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp 
ON whatsapp_messages (message_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_user_status 
ON whatsapp_connections (user_id, status);

-- 6. Create function to safely upsert WhatsApp connection
-- Use a new function name to avoid conflicts
DROP FUNCTION IF EXISTS upsert_whatsapp_connection_v2 CASCADE;

CREATE OR REPLACE FUNCTION upsert_whatsapp_connection_v2(
    p_user_id UUID,
    p_status TEXT DEFAULT 'connecting',
    p_qr_code TEXT DEFAULT NULL,
    p_whatsapp_user JSONB DEFAULT NULL,
    p_phone_number TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    connection_id UUID;
    existing_connection_id UUID;
BEGIN
    -- First, mark any existing active connections as disconnected
    UPDATE whatsapp_connections 
    SET 
        status = 'disconnected',
        disconnected_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id 
    AND status IN ('connecting', 'qr_ready', 'connected')
    RETURNING id INTO existing_connection_id;

    -- Insert new connection
    INSERT INTO whatsapp_connections (
        user_id,
        status,
        qr_code,
        whatsapp_user,
        phone_number,
        error_message,
        connected_at,
        disconnected_at,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_status,
        p_qr_code,
        p_whatsapp_user,
        p_phone_number,
        p_error_message,
        CASE WHEN p_status = 'connected' THEN NOW() ELSE NULL END,
        NULL,
        NOW(),
        NOW()
    ) RETURNING id INTO connection_id;

    RETURN connection_id;
END;
$$;

-- 7. Create function to cleanup old WhatsApp connections
-- Use a new function name to avoid conflicts
DROP FUNCTION IF EXISTS cleanup_old_whatsapp_connections_v2 CASCADE;

CREATE OR REPLACE FUNCTION cleanup_old_whatsapp_connections_v2(
    p_user_id UUID DEFAULT NULL,
    p_keep_days INTEGER DEFAULT 30
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM whatsapp_connections
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
    AND status IN ('disconnected', 'error')
    AND updated_at < NOW() - INTERVAL '1 day' * p_keep_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- 8. Update the chat list function to be more efficient
-- Use a new function name to avoid conflicts
DROP FUNCTION IF EXISTS get_whatsapp_chat_list_v2 CASCADE;

CREATE OR REPLACE FUNCTION get_whatsapp_chat_list_v2(p_user_id UUID)
RETURNS TABLE (
    lead_id UUID,
    lead_name TEXT,
    lead_phone TEXT,
    lead_company TEXT,
    lead_source TEXT,
    lead_status TEXT,  
    last_message_content TEXT,
    last_message_timestamp TIMESTAMPTZ,
    last_message_direction TEXT,
    unread_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH last_messages AS (
        SELECT DISTINCT ON (wm.lead_id)
            wm.lead_id,
            wm.message_content as last_content,
            wm.message_timestamp as last_timestamp,
            CASE WHEN wm.is_from_lead THEN 'incoming' ELSE 'outgoing' END as last_direction
        FROM whatsapp_messages wm
        INNER JOIN leads l ON l.id = wm.lead_id
        WHERE l.user_id = p_user_id
        ORDER BY wm.lead_id, wm.message_timestamp DESC
    ),
    -- For now, we'll set unread_count to 0 since there's no read tracking column
    -- This can be enhanced later by adding a read_at column to whatsapp_messages
    unread_counts AS (
        SELECT 
            wm.lead_id,
            0::BIGINT as unread_count
        FROM whatsapp_messages wm
        INNER JOIN leads l ON l.id = wm.lead_id
        WHERE l.user_id = p_user_id
        AND wm.is_from_lead = true
        GROUP BY wm.lead_id
    )
    SELECT 
        l.id as lead_id,
        l.name as lead_name,
        l.phone as lead_phone,
        l.company as lead_company,
        l.source as lead_source,
        l.status as lead_status,
        lm.last_content as last_message_content,
        lm.last_timestamp as last_message_timestamp,
        lm.last_direction as last_message_direction,
        COALESCE(uc.unread_count, 0) as unread_count
    FROM leads l
    INNER JOIN last_messages lm ON l.id = lm.lead_id
    LEFT JOIN unread_counts uc ON l.id = uc.lead_id
    WHERE l.user_id = p_user_id
    ORDER BY lm.last_timestamp DESC;
END;
$$;

-- 9. Grant necessary permissions
GRANT EXECUTE ON FUNCTION upsert_whatsapp_connection_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_whatsapp_connections_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_whatsapp_chat_list_v2 TO authenticated;
