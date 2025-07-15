-- =====================================================
-- REALTIME AND UTILITIES - Final configurations
-- =====================================================
-- This migration sets up realtime subscriptions, utility functions,
-- and final system configurations for the CRM

BEGIN;

-- =====================================================
-- REALTIME CONFIGURATION
-- =====================================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_connections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- =====================================================
-- NOTIFICATION PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT TRUE,
    whatsapp_notifications BOOLEAN DEFAULT TRUE,
    appointment_reminders BOOLEAN DEFAULT TRUE,
    lead_updates BOOLEAN DEFAULT TRUE,
    task_reminders BOOLEAN DEFAULT TRUE,
    reminder_time_minutes INTEGER DEFAULT 30 CHECK (reminder_time_minutes > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_user_preferences UNIQUE (user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can manage their own notification preferences
CREATE POLICY "Users can manage own notification preferences"
  ON public.notification_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- ACTIVITY LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'lead', 'appointment', 'whatsapp_message', etc.
    entity_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type ON public.activity_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_id ON public.activity_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON public.activity_log(action);

-- Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own activity
CREATE POLICY "Users can view own activity"
  ON public.activity_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all activity
CREATE POLICY "Admins can view all activity"
  ON public.activity_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- System can insert activity logs
CREATE POLICY "System can insert activity logs"
  ON public.activity_log
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- SYSTEM SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Public settings can be read by authenticated users
CREATE POLICY "Authenticated users can read public settings"
  ON public.system_settings
  FOR SELECT
  USING (auth.role() = 'authenticated' AND is_public = TRUE);

-- Admins can manage all settings
CREATE POLICY "Admins can manage all settings"
  ON public.system_settings
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
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to log activity
CREATE OR REPLACE FUNCTION public.log_activity(
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    activity_id UUID;
BEGIN
    -- Check authentication
    IF auth.role() != 'authenticated' THEN
        RAISE EXCEPTION 'Access denied. Authentication required.';
    END IF;
    
    INSERT INTO public.activity_log (
        user_id,
        action,
        entity_type,
        entity_id,
        details
    )
    VALUES (
        auth.uid(),
        p_action,
        p_entity_type,
        p_entity_id,
        p_details
    )
    RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$;

-- Function to get system setting
CREATE OR REPLACE FUNCTION public.get_system_setting(
    p_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    setting_value JSONB;
BEGIN
    -- Check authentication
    IF auth.role() != 'authenticated' THEN
        RAISE EXCEPTION 'Access denied. Authentication required.';
    END IF;
    
    SELECT value INTO setting_value
    FROM public.system_settings
    WHERE key = p_key
      AND (
        is_public = TRUE OR
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
    
    RETURN setting_value;
END;
$$;

-- Function to set system setting (admin only)
CREATE OR REPLACE FUNCTION public.set_system_setting(
    p_key TEXT,
    p_value JSONB,
    p_description TEXT DEFAULT NULL,
    p_is_public BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
    
    INSERT INTO public.system_settings (
        key,
        value,
        description,
        is_public,
        updated_at
    )
    VALUES (
        p_key,
        p_value,
        p_description,
        p_is_public,
        NOW()
    )
    ON CONFLICT (key)
    DO UPDATE SET
        value = EXCLUDED.value,
        description = COALESCE(EXCLUDED.description, system_settings.description),
        is_public = EXCLUDED.is_public,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$;

-- Function to get dashboard statistics
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id UUID;
    stats JSONB;
    total_leads INTEGER;
    new_leads INTEGER;
    converted_leads INTEGER;
    total_appointments INTEGER;
    upcoming_appointments INTEGER;
    total_tasks INTEGER;
    pending_tasks INTEGER;
    whatsapp_messages_today INTEGER;
BEGIN
    -- Check authentication
    IF auth.role() != 'authenticated' THEN
        RAISE EXCEPTION 'Access denied. Authentication required.';
    END IF;
    
    -- Determine target user (admin can view others, users can only view their own)
    IF p_user_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        ) THEN
            RAISE EXCEPTION 'Access denied. Admin role required to view other users stats.';
        END IF;
        target_user_id := p_user_id;
    ELSE
        target_user_id := auth.uid();
    END IF;
    
    -- Get leads statistics
    SELECT COUNT(*) INTO total_leads
    FROM public.leads
    WHERE user_id = target_user_id;
    
    SELECT COUNT(*) INTO new_leads
    FROM public.leads
    WHERE user_id = target_user_id AND status = 'New';
    
    SELECT COUNT(*) INTO converted_leads
    FROM public.leads
    WHERE user_id = target_user_id AND status = 'Converted';
    
    -- Get appointments statistics
    SELECT COUNT(*) INTO total_appointments
    FROM public.appointments
    WHERE user_id = target_user_id;
    
    SELECT COUNT(*) INTO upcoming_appointments
    FROM public.appointments
    WHERE user_id = target_user_id
      AND start_time > NOW()
      AND status IN ('scheduled', 'confirmed');
    
    -- Get tasks statistics
    SELECT COUNT(*) INTO total_tasks
    FROM public.tasks
    WHERE user_id = target_user_id OR assigned_to_id = target_user_id;
    
    SELECT COUNT(*) INTO pending_tasks
    FROM public.tasks
    WHERE (user_id = target_user_id OR assigned_to_id = target_user_id)
      AND status = 'pending';
    
    -- Get WhatsApp messages today
    SELECT COUNT(*) INTO whatsapp_messages_today
    FROM public.whatsapp_messages
    WHERE user_id = target_user_id
      AND created_at >= CURRENT_DATE;
    
    -- Build stats JSON
    stats := jsonb_build_object(
        'leads', jsonb_build_object(
            'total', total_leads,
            'new', new_leads,
            'converted', converted_leads
        ),
        'appointments', jsonb_build_object(
            'total', total_appointments,
            'upcoming', upcoming_appointments
        ),
        'tasks', jsonb_build_object(
            'total', total_tasks,
            'pending', pending_tasks
        ),
        'whatsapp', jsonb_build_object(
            'messages_today', whatsapp_messages_today
        ),
        'generated_at', to_jsonb(NOW())
    );
    
    RETURN stats;
END;
$$;

-- Function to cleanup old data (admin only)
CREATE OR REPLACE FUNCTION public.cleanup_old_data(
    p_days_to_keep INTEGER DEFAULT 90
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_activity_logs INTEGER;
    cleanup_date TIMESTAMPTZ;
    result JSONB;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
    
    cleanup_date := NOW() - (p_days_to_keep || ' days')::INTERVAL;
    
    -- Delete old activity logs
    DELETE FROM public.activity_log
    WHERE created_at < cleanup_date;
    
    GET DIAGNOSTICS deleted_activity_logs = ROW_COUNT;
    
    -- Build result
    result := jsonb_build_object(
        'deleted_activity_logs', deleted_activity_logs,
        'cleanup_date', to_jsonb(cleanup_date),
        'days_kept', p_days_to_keep
    );
    
    RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.log_activity(TEXT, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_setting(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_system_setting(TEXT, JSONB, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_data(INTEGER) TO authenticated;

-- =====================================================
-- TRIGGERS FOR ACTIVITY LOGGING
-- =====================================================

-- Function to automatically log certain activities
CREATE OR REPLACE FUNCTION public.auto_log_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    action_name TEXT;
    entity_type TEXT;
    entity_id UUID;
    details JSONB;
BEGIN
    -- Determine action based on TG_OP
    CASE TG_OP
        WHEN 'INSERT' THEN
            action_name := 'created';
            entity_id := NEW.id;
        WHEN 'UPDATE' THEN
            action_name := 'updated';
            entity_id := NEW.id;
        WHEN 'DELETE' THEN
            action_name := 'deleted';
            entity_id := OLD.id;
    END CASE;
    
    -- Determine entity type from table name
    entity_type := TG_TABLE_NAME;
    
    -- Only log if user is authenticated
    IF auth.uid() IS NOT NULL THEN
        -- Build details based on operation
        IF TG_OP = 'UPDATE' THEN
            details := jsonb_build_object(
                'old', to_jsonb(OLD),
                'new', to_jsonb(NEW)
            );
        ELSIF TG_OP = 'INSERT' THEN
            details := to_jsonb(NEW);
        ELSE
            details := to_jsonb(OLD);
        END IF;
        
        -- Insert activity log
        INSERT INTO public.activity_log (
            user_id,
            action,
            entity_type,
            entity_id,
            details
        )
        VALUES (
            auth.uid(),
            action_name,
            entity_type,
            entity_id,
            details
        );
    END IF;
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- Apply activity logging triggers to key tables
DROP TRIGGER IF EXISTS auto_log_leads_activity ON public.leads;
CREATE TRIGGER auto_log_leads_activity
    AFTER INSERT OR UPDATE OR DELETE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_log_activity();

DROP TRIGGER IF EXISTS auto_log_appointments_activity ON public.appointments;
CREATE TRIGGER auto_log_appointments_activity
    AFTER INSERT OR UPDATE OR DELETE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_log_activity();

-- Apply update triggers to new tables
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- INSERT DEFAULT SYSTEM SETTINGS
-- =====================================================

-- Insert default system settings
INSERT INTO public.system_settings (key, value, description, is_public)
VALUES 
    ('app_name', '"NextCRM"', 'Application name', true),
    ('app_version', '"1.0.0"', 'Application version', true),
    ('default_reminder_minutes', '30', 'Default reminder time in minutes', true),
    ('max_file_upload_size', '10485760', 'Maximum file upload size in bytes (10MB)', true),
    ('whatsapp_webhook_timeout', '30', 'WhatsApp webhook timeout in seconds', false),
    ('cleanup_days', '90', 'Days to keep old data before cleanup', false)
ON CONFLICT (key) DO NOTHING;

COMMIT;