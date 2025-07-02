-- 20250702_create_upsert_whatsapp_connection_v2.sql
-- Função idempotente para upsert de conexão WhatsApp
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
BEGIN
    -- Atualiza conexões ativas para 'disconnected'
    UPDATE whatsapp_connections
    SET status = 'disconnected', disconnected_at = NOW(), updated_at = NOW()
    WHERE user_id = p_user_id AND status IN ('connecting', 'qr_ready', 'connected');

    -- Upsert
    INSERT INTO whatsapp_connections (
        user_id, status, qr_code, whatsapp_user, phone_number, error_message, connected_at, disconnected_at, created_at, updated_at
    ) VALUES (
        p_user_id, p_status, p_qr_code, p_whatsapp_user, p_phone_number, p_error_message,
        CASE WHEN p_status = 'connected' THEN NOW() ELSE NULL END,
        NULL, NOW(), NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET status = EXCLUDED.status,
        qr_code = EXCLUDED.qr_code,
        whatsapp_user = EXCLUDED.whatsapp_user,
        phone_number = EXCLUDED.phone_number,
        error_message = EXCLUDED.error_message,
        connected_at = EXCLUDED.connected_at,
        disconnected_at = EXCLUDED.disconnected_at,
        updated_at = NOW()
    RETURNING id INTO connection_id;

    RETURN connection_id;
END;
$$;
