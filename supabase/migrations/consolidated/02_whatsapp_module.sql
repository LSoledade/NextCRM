-- =====================================================
-- WHATSAPP MODULE - Complete WhatsApp integration
-- =====================================================
-- This migration creates all WhatsApp-related tables, functions, and policies
-- Consolidates all WhatsApp functionality in a single, organized file

BEGIN;

-- =====================================================
-- WHATSAPP CONNECTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
    instance_name TEXT PRIMARY KEY,
    status TEXT DEFAULT 'disconnected' CHECK (status = ANY (ARRAY['connected'::text, 'disconnected'::text, 'connecting'::text])),
    qr_code TEXT,
    webhook_url TEXT,
    api_key TEXT,
    phone_number TEXT,
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_status ON public.whatsapp_connections(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_phone ON public.whatsapp_connections(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_updated_at ON public.whatsapp_connections(updated_at);

-- Enable RLS
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can access connections
CREATE POLICY "Authenticated users can manage whatsapp connections"
  ON public.whatsapp_connections
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- WHATSAPP MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_name TEXT NOT NULL REFERENCES public.whatsapp_connections(instance_name) ON DELETE CASCADE,
    message_id TEXT NOT NULL,
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type = ANY (ARRAY['text'::text, 'image'::text, 'audio'::text, 'video'::text, 'document'::text, 'location'::text, 'contact'::text])),
    content TEXT,
    media_url TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    is_from_me BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'sent' CHECK (status = ANY (ARRAY['sent'::text, 'delivered'::text, 'read'::text, 'failed'::text])),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique message per instance
    CONSTRAINT unique_message_per_instance UNIQUE (instance_name, message_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_instance ON public.whatsapp_messages(instance_name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from_number ON public.whatsapp_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_to_number ON public.whatsapp_messages(to_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON public.whatsapp_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id ON public.whatsapp_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_lead_id ON public.whatsapp_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_is_from_me ON public.whatsapp_messages(is_from_me);

-- Enable RLS
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages related to their leads or assigned to them
CREATE POLICY "Users can view related whatsapp messages"
  ON public.whatsapp_messages
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      user_id = auth.uid() OR
      lead_id IN (
        SELECT id FROM public.leads WHERE user_id = auth.uid()
      )
    )
  );

-- Users can insert messages
CREATE POLICY "Users can insert whatsapp messages"
  ON public.whatsapp_messages
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own messages
CREATE POLICY "Users can update own whatsapp messages"
  ON public.whatsapp_messages
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can manage all messages
CREATE POLICY "Admins can manage all whatsapp messages"
  ON public.whatsapp_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- WHATSAPP FUNCTIONS
-- =====================================================

-- Function to upsert WhatsApp connection
CREATE OR REPLACE FUNCTION public.upsert_whatsapp_connection(
    p_instance_name TEXT,
    p_status TEXT DEFAULT NULL,
    p_qr_code TEXT DEFAULT NULL,
    p_webhook_url TEXT DEFAULT NULL,
    p_api_key TEXT DEFAULT NULL,
    p_phone_number TEXT DEFAULT NULL
)
RETURNS public.whatsapp_connections
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result public.whatsapp_connections;
BEGIN
    -- Check authentication
    IF auth.role() != 'authenticated' THEN
        RAISE EXCEPTION 'Access denied. Authentication required.';
    END IF;
    
    INSERT INTO public.whatsapp_connections (
        instance_name,
        status,
        qr_code,
        webhook_url,
        api_key,
        phone_number,
        updated_at
    )
    VALUES (
        p_instance_name,
        COALESCE(p_status, 'disconnected'),
        p_qr_code,
        p_webhook_url,
        p_api_key,
        p_phone_number,
        NOW()
    )
    ON CONFLICT (instance_name)
    DO UPDATE SET
        status = COALESCE(EXCLUDED.status, whatsapp_connections.status),
        qr_code = COALESCE(EXCLUDED.qr_code, whatsapp_connections.qr_code),
        webhook_url = COALESCE(EXCLUDED.webhook_url, whatsapp_connections.webhook_url),
        api_key = COALESCE(EXCLUDED.api_key, whatsapp_connections.api_key),
        phone_number = COALESCE(EXCLUDED.phone_number, whatsapp_connections.phone_number),
        updated_at = NOW(),
        last_seen = CASE WHEN EXCLUDED.status = 'connected' THEN NOW() ELSE whatsapp_connections.last_seen END
    RETURNING * INTO result;
    
    RETURN result;
END;
$$;

-- Function to cleanup old disconnected connections
CREATE OR REPLACE FUNCTION public.cleanup_whatsapp_connections()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
    
    -- Delete connections that have been disconnected for more than 7 days
    DELETE FROM public.whatsapp_connections
    WHERE status = 'disconnected'
      AND updated_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- Function to get WhatsApp conversation history
CREATE OR REPLACE FUNCTION public.get_whatsapp_conversation(
    p_phone_number TEXT,
    p_instance_name TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    instance_name TEXT,
    message_id TEXT,
    from_number TEXT,
    to_number TEXT,
    message_type TEXT,
    content TEXT,
    media_url TEXT,
    timestamp TIMESTAMPTZ,
    is_from_me BOOLEAN,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check authentication
    IF auth.role() != 'authenticated' THEN
        RAISE EXCEPTION 'Access denied. Authentication required.';
    END IF;
    
    RETURN QUERY
    SELECT 
        m.id,
        m.instance_name,
        m.message_id,
        m.from_number,
        m.to_number,
        m.message_type,
        m.content,
        m.media_url,
        m.timestamp,
        m.is_from_me,
        m.status
    FROM public.whatsapp_messages m
    WHERE (
        m.from_number = p_phone_number OR 
        m.to_number = p_phone_number
    )
    AND (p_instance_name IS NULL OR m.instance_name = p_instance_name)
    AND (
        -- User can see messages related to their leads
        m.lead_id IN (
            SELECT l.id FROM public.leads l WHERE l.user_id = auth.uid()
        ) OR
        -- User can see their own messages
        m.user_id = auth.uid() OR
        -- Admins can see all messages
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    )
    ORDER BY m.timestamp DESC
    LIMIT p_limit;
END;
$$;

-- Function to link WhatsApp message to lead
CREATE OR REPLACE FUNCTION public.link_whatsapp_message_to_lead(
    p_message_id UUID,
    p_lead_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    message_user_id UUID;
    lead_user_id UUID;
BEGIN
    -- Check authentication
    IF auth.role() != 'authenticated' THEN
        RAISE EXCEPTION 'Access denied. Authentication required.';
    END IF;
    
    -- Get the user_id from the message and lead
    SELECT user_id INTO message_user_id FROM public.whatsapp_messages WHERE id = p_message_id;
    SELECT user_id INTO lead_user_id FROM public.leads WHERE id = p_lead_id;
    
    -- Check if user owns the lead or is admin
    IF lead_user_id != auth.uid() AND NOT EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. You can only link messages to your own leads.';
    END IF;
    
    -- Update the message
    UPDATE public.whatsapp_messages
    SET lead_id = p_lead_id,
        user_id = COALESCE(user_id, lead_user_id)
    WHERE id = p_message_id;
    
    RETURN FOUND;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.upsert_whatsapp_connection(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_whatsapp_connections() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_whatsapp_conversation(TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_whatsapp_message_to_lead(UUID, UUID) TO authenticated;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply trigger to whatsapp_connections
DROP TRIGGER IF EXISTS update_whatsapp_connections_updated_at ON public.whatsapp_connections;
CREATE TRIGGER update_whatsapp_connections_updated_at
    BEFORE UPDATE ON public.whatsapp_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;