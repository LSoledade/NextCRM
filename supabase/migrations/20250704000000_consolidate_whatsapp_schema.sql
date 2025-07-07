-- Migration to consolidate WhatsApp schema for a single instance model

BEGIN;

-- ---------------------------------------------------------------------
-- Table: whatsapp_connections
-- ---------------------------------------------------------------------

-- Drop dependent objects for user_id on whatsapp_connections first
DROP FUNCTION IF EXISTS public.upsert_whatsapp_connection(UUID,TEXT,TEXT,JSONB,TEXT,TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_whatsapp_connection_v2(UUID,TEXT,TEXT,JSONB,TEXT,TIMESTAMPTZ,TIMESTAMPTZ,TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_whatsapp_connection_v2(UUID,TEXT,TEXT,JSONB,TEXT,TEXT) CASCADE; -- From fix_whatsapp_constraints_realtime
DROP FUNCTION IF EXISTS public.cleanup_old_whatsapp_connections_v2(UUID,INTEGER) CASCADE; -- From fix_whatsapp_constraints_realtime

-- Drop existing RLS policies that depend on user_id
ALTER TABLE public.whatsapp_connections DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias conexões WhatsApp" ON public.whatsapp_connections;

-- Drop existing trigger that might depend on old structure (will be recreated)
DROP TRIGGER IF EXISTS trigger_whatsapp_connections_updated_at ON public.whatsapp_connections;
DROP FUNCTION IF EXISTS public.update_whatsapp_connections_updated_at() CASCADE;


-- Drop indexes and constraints related to user_id
DROP INDEX IF EXISTS public.idx_whatsapp_connections_user_id;
DROP INDEX IF EXISTS public.idx_whatsapp_connections_active_user; -- Partial unique index
DROP INDEX IF EXISTS public.idx_whatsapp_connections_user_status;

-- Drop the user_id column
-- Need to check if it has a UNIQUE constraint not dropped by index drop
DO $$
DECLARE
    constraint_name_var TEXT;
BEGIN
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints
    WHERE table_name = 'whatsapp_connections' AND constraint_type = 'UNIQUE'
    AND constraint_name LIKE '%user_id%'; -- Simple check, might need to be more specific if multiple unique constraints exist

    IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.whatsapp_connections DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name_var);
    END IF;

    -- Also drop FOREIGN KEY constraint if it exists directly on user_id
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints
    WHERE table_name = 'whatsapp_connections' AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%user_id%';

    IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.whatsapp_connections DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name_var);
    END IF;
END $$;

ALTER TABLE public.whatsapp_connections DROP COLUMN IF EXISTS user_id;

-- Drop the old primary key (id UUID)
ALTER TABLE public.whatsapp_connections DROP CONSTRAINT IF EXISTS whatsapp_connections_pkey;
ALTER TABLE public.whatsapp_connections DROP COLUMN IF EXISTS id;

-- Add instance_name and make it the primary key
ALTER TABLE public.whatsapp_connections ADD COLUMN instance_name TEXT;

-- Populate instance_name with a default if there are existing rows (e.g., 'Leonardo')
-- This depends on how existing data should be handled. For a clean slate or single instance:
UPDATE public.whatsapp_connections SET instance_name = 'Leonardo' WHERE instance_name IS NULL;
-- If instance_name must be NOT NULL for PK, ensure all rows have it or delete old rows.
-- For simplicity, assuming new table or that we can default it.

ALTER TABLE public.whatsapp_connections ADD PRIMARY KEY (instance_name);
ALTER TABLE public.whatsapp_connections ALTER COLUMN instance_name SET NOT NULL;


-- Recreate the updated_at trigger function and trigger
CREATE OR REPLACE FUNCTION public.update_whatsapp_connections_updated_at_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_whatsapp_connections_updated_at
    BEFORE UPDATE ON public.whatsapp_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_whatsapp_connections_updated_at_trigger_func();

-- New RLS Policies for whatsapp_connections
-- Authenticated users can read the status of any instance
CREATE POLICY "Authenticated users can read whatsapp connections"
  ON public.whatsapp_connections
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role can do anything (for API routes and webhook processor)
CREATE POLICY "Service role full access to whatsapp connections"
  ON public.whatsapp_connections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_connections FORCE ROW LEVEL SECURITY; -- Ensure RLS is always applied

-- Ensure Realtime is enabled for the table (if it was disabled by schema changes)
DO $$
BEGIN
  IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'whatsapp_connections'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_connections;
  END IF;
  ALTER TABLE public.whatsapp_connections REPLICA IDENTITY FULL;
END $$;


-- New upsert function for whatsapp_connections based on instance_name
CREATE OR REPLACE FUNCTION public.upsert_whatsapp_connection_by_instance(
    p_instance_name TEXT,
    p_status TEXT,
    p_qr_code TEXT DEFAULT NULL,
    p_whatsapp_user JSONB DEFAULT NULL,
    p_phone_number TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID  -- Or returns the row: RETURNS whatsapp_connections
LANGUAGE plpgsql
SECURITY DEFINER -- Important for service-level operations
AS $$
BEGIN
    INSERT INTO public.whatsapp_connections (
        instance_name,
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
        p_instance_name,
        p_status,
        p_qr_code,
        p_whatsapp_user,
        p_phone_number,
        CASE WHEN p_status = 'connected' THEN NOW() ELSE NULL END,
        CASE WHEN p_status = 'disconnected' THEN NOW() ELSE NULL END,
        p_error_message,
        NOW(),
        NOW()
    )
    ON CONFLICT (instance_name) DO UPDATE SET
        status = EXCLUDED.status,
        qr_code = EXCLUDED.qr_code,
        whatsapp_user = EXCLUDED.whatsapp_user,
        phone_number = EXCLUDED.phone_number,
        connected_at = CASE
                         WHEN public.whatsapp_connections.status <> 'connected' AND EXCLUDED.status = 'connected' THEN NOW()
                         ELSE public.whatsapp_connections.connected_at
                       END,
        disconnected_at = CASE
                            WHEN public.whatsapp_connections.status <> 'disconnected' AND EXCLUDED.status = 'disconnected' THEN NOW()
                            ELSE public.whatsapp_connections.disconnected_at
                          END,
        error_message = EXCLUDED.error_message,
        updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_whatsapp_connection_by_instance TO service_role;


-- ---------------------------------------------------------------------
-- Table: whatsapp_messages
-- ---------------------------------------------------------------------

-- Add instance_name column to whatsapp_messages
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS instance_name TEXT NULLABLE;

-- Add index for instance_name on whatsapp_messages
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_instance_timestamp
ON public.whatsapp_messages (instance_name, message_timestamp DESC);

-- RLS policies for whatsapp_messages are assumed to be largely correct,
-- but ensure they don't break with any user_id changes if they were cross-referencing.
-- The existing policy "Usuários podem gerenciar mensagens dos seus próprios leads"
-- uses `auth.uid() = user_id` where `user_id` is on the `whatsapp_messages` table,
-- referring to the CRM user who owns the lead. This should still be valid.

-- Ensure Realtime is enabled for whatsapp_messages (if it was disabled)
DO $$
BEGIN
  IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'whatsapp_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
  END IF;
  ALTER TABLE public.whatsapp_messages REPLICA IDENTITY FULL;
END $$;

-- Re-evaluate and simplify get_whatsapp_chat_list_v2 if it was complex due to old schema
-- The one from 20250703000000_fix_whatsapp_constraints_realtime.sql seems reasonable for now.
-- It does not directly use whatsapp_connections, so no change needed to it based on whatsapp_connections schema change.

COMMIT;
