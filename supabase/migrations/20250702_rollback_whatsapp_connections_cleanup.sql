-- Rollback Migration: Cleanup WhatsApp Connections Duplicates
-- Date: 2025-07-02
-- Description: Rollback script to remove UNIQUE constraint and restore original function

-- Step 1: Remove the UNIQUE constraint
ALTER TABLE whatsapp_connections 
DROP CONSTRAINT IF EXISTS whatsapp_connections_user_id_unique;

-- Step 2: Restore the original upsert function (without ON CONFLICT)
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
  existing_record RECORD;
BEGIN
  -- Check if a record exists for this user
  SELECT * INTO existing_record 
  FROM whatsapp_connections 
  WHERE user_id = p_user_id 
  LIMIT 1;

  IF existing_record IS NOT NULL THEN
    -- Update existing record
    UPDATE whatsapp_connections 
    SET 
      status = p_status,
      qr_code = p_qr_code,
      whatsapp_user = p_whatsapp_user,
      phone_number = p_phone_number,
      connected_at = p_connected_at,
      disconnected_at = p_disconnected_at,
      error_message = p_error_message,
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING id INTO connection_id;
  ELSE
    -- Insert new record
    INSERT INTO whatsapp_connections (
      user_id, 
      status, 
      qr_code, 
      whatsapp_user, 
      phone_number, 
      connected_at, 
      disconnected_at, 
      error_message
    ) 
    VALUES (
      p_user_id, 
      p_status, 
      p_qr_code, 
      p_whatsapp_user, 
      p_phone_number, 
      p_connected_at, 
      p_disconnected_at, 
      p_error_message
    )
    RETURNING id INTO connection_id;
  END IF;
  
  RETURN connection_id;
END;
$$ LANGUAGE plpgsql;
