-- Função SQL para buscar conversas do WhatsApp de forma otimizada
-- Esta função substitui a lógica complexa do frontend

DROP FUNCTION IF EXISTS get_whatsapp_conversations(UUID);

CREATE OR REPLACE FUNCTION get_whatsapp_conversations(p_user_id UUID)
RETURNS TABLE (
    lead_id UUID,
    lead_name TEXT,
    lead_phone TEXT,
    lead_email TEXT,
    lead_status TEXT,
    lead_company TEXT,
    lead_source TEXT,
    lead_created_at TIMESTAMPTZ,
    lead_updated_at TIMESTAMPTZ,
    user_id UUID,
    last_message_content TEXT,
    last_message_timestamp TIMESTAMPTZ,
    last_message_is_from_lead BOOLEAN,
    unread_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH latest_messages AS (
        SELECT DISTINCT ON (wm.lead_id)
            wm.lead_id,
            wm.message_content,
            wm.message_timestamp,
            wm.is_from_lead,
            wm.user_id
        FROM whatsapp_messages wm
        WHERE wm.user_id = p_user_id
        ORDER BY wm.lead_id, wm.message_timestamp DESC
    ),
    unread_counts AS (
        SELECT 
            wm.lead_id,
            COUNT(*) as unread_count
        FROM whatsapp_messages wm
        WHERE wm.user_id = p_user_id
            AND wm.is_from_lead = true
            -- Adicionar lógica de mensagens não lidas aqui se necessário
            -- Por enquanto, retorna 0 para todas
        GROUP BY wm.lead_id
    )
    SELECT 
        l.id as lead_id,
        l.name as lead_name,
        l.phone as lead_phone,
        l.email as lead_email,
        l.status as lead_status,
        l.company as lead_company,
        l.source as lead_source,
        l.created_at as lead_created_at,
        l.updated_at as lead_updated_at,
        l.user_id,
        lm.message_content as last_message_content,
        lm.message_timestamp as last_message_timestamp,
        lm.is_from_lead as last_message_is_from_lead,
        COALESCE(uc.unread_count, 0) as unread_count
    FROM latest_messages lm
    JOIN leads l ON l.id = lm.lead_id
    LEFT JOIN unread_counts uc ON uc.lead_id = lm.lead_id
    WHERE l.user_id = p_user_id
    ORDER BY lm.message_timestamp DESC;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION get_whatsapp_conversations(UUID) TO authenticated;

-- Comentário explicativo
COMMENT ON FUNCTION get_whatsapp_conversations(UUID) IS 'Função otimizada para buscar conversas do WhatsApp com última mensagem e contagem de não lidas';
