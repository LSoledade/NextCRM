-- Migração para corrigir políticas RLS da tabela whatsapp_connections
-- Aplicar melhores práticas: consolidar múltiplas políticas permissivas

-- 1. Remover TODAS as políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Realtime access for whatsapp_connections" ON whatsapp_connections;
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias conexões WhatsApp" ON whatsapp_connections;
DROP POLICY IF EXISTS "Users can view own whatsapp connections" ON whatsapp_connections;
DROP POLICY IF EXISTS "Users can insert own whatsapp connections" ON whatsapp_connections;
DROP POLICY IF EXISTS "Users can update own whatsapp connections" ON whatsapp_connections;
DROP POLICY IF EXISTS "Users can delete own whatsapp connections" ON whatsapp_connections;

-- 2. Criar políticas consolidadas e otimizadas
-- Seguindo as melhores práticas do Supabase Database Advisor 0006_multiple_permissive_policies

-- Política consolidada para SELECT
CREATE POLICY "Users can view own whatsapp connections"
ON whatsapp_connections
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Política consolidada para INSERT  
CREATE POLICY "Users can insert own whatsapp connections"
ON whatsapp_connections
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

-- Política consolidada para UPDATE
CREATE POLICY "Users can update own whatsapp connections"
ON whatsapp_connections
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

-- Política consolidada para DELETE
CREATE POLICY "Users can delete own whatsapp connections"
ON whatsapp_connections
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Política para Realtime (necessária para subscriptions)
CREATE POLICY "Realtime access for whatsapp_connections"
ON whatsapp_connections
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- 3. Criar índice para performance (se não existir)
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_user_id 
ON whatsapp_connections(user_id);

-- 4. Verificar se RLS está habilitado
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- 5. Criar função para buscar lista de conversas do WhatsApp otimizada
-- Primeiro remover função existente se houver
DROP FUNCTION IF EXISTS get_whatsapp_chat_list();

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
    is_from_lead boolean
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
        lm.is_from_lead
    FROM latest_messages lm
    JOIN leads l ON l.id = lm.lead_id
    WHERE l.user_id = auth.uid()
    ORDER BY lm.last_message_timestamp DESC;
END;
$$;
