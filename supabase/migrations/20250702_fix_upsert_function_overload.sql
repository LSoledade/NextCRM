-- Fix: Remove function overload ambiguity for upsert_whatsapp_connection_v2
-- Date: 2025-07-02
-- Description: Remove all existing versions and create a single, definitive function

-- Step 1: Drop all existing versions of the function (handles overloads)
DROP FUNCTION IF EXISTS upsert_whatsapp_connection_v2(UUID, TEXT, TEXT, JSONB, TEXT, TEXT);
DROP FUNCTION IF EXISTS upsert_whatsapp_connection_v2(UUID, TEXT, TEXT, JSONB, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT);
DROP FUNCTION IF EXISTS upsert_whatsapp_connection_v2(UUID, TEXT);
DROP FUNCTION IF EXISTS upsert_whatsapp_connection_v2(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS upsert_whatsapp_connection_v2(UUID, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS upsert_whatsapp_connection_v2(UUID, TEXT, TEXT, JSONB, TEXT);

-- Step 2: Create the definitive function with all parameters
CREATE OR REPLACE FUNCTION upsert_whatsapp_connection_v2(
  p_user_id UUID,
  p_status TEXT,
  p_qr_code TEXT DEFAULT NULL,
  p_whatsapp_user JSONB DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL,
  p_connected_at TIMESTAMPTZ DEFAULT NULL,
  p_disconnected_at TIMESTAMPTZ DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  connection_id UUID;
BEGIN
  -- Use INSERT ... ON CONFLICT with the UNIQUE constraint
  INSERT INTO whatsapp_connections (
    user_id, 
    status, 
    qr_code, 
    whatsapp_user, 
    phone_number, 
    connected_at, 
    disconnected_at, 
    error_message,
    updated_at
  ) 
  VALUES (
    p_user_id, 
    p_status, 
    p_qr_code, 
    p_whatsapp_user, 
    p_phone_number, 
    p_connected_at, 
    p_disconnected_at, 
    p_error_message,
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    status = EXCLUDED.status,
    qr_code = EXCLUDED.qr_code,
    whatsapp_user = EXCLUDED.whatsapp_user,
    phone_number = EXCLUDED.phone_number,
    connected_at = EXCLUDED.connected_at,
    disconnected_at = EXCLUDED.disconnected_at,
    error_message = EXCLUDED.error_message,
    updated_at = NOW()
  RETURNING id INTO connection_id;
  
  RETURN connection_id;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Grant necessary permissions
GRANT EXECUTE ON FUNCTION upsert_whatsapp_connection_v2(UUID, TEXT, TEXT, JSONB, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_whatsapp_connection_v2(UUID, TEXT, TEXT, JSONB, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO anon;
