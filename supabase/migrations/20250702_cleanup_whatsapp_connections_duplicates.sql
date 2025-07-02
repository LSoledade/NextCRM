-- Migration: Cleanup WhatsApp Connections Duplicates and Add UNIQUE Constraint
-- Date: 2025-07-02
-- Description: Remove duplicate records from whatsapp_connections table and add UNIQUE constraint on user_id

-- Step 1: Remove all records for the problematic user_id (156 duplicates)
DELETE FROM whatsapp_connections 
WHERE user_id = '350e2afd-2c1f-4668-bf4a-fa4f3a9b027d';

-- Step 2: Clean up any other potential duplicates
-- Keep only the most recent record (by created_at) for each user_id
DELETE FROM whatsapp_connections 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id 
  FROM whatsapp_connections 
  ORDER BY user_id, created_at DESC
);

-- Step 3: Add UNIQUE constraint on user_id to prevent future duplicates
ALTER TABLE whatsapp_connections 
ADD CONSTRAINT whatsapp_connections_user_id_unique UNIQUE (user_id);

-- Step 4: Update the upsert function to use the new constraint
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
  -- Use INSERT ... ON CONFLICT with the new UNIQUE constraint
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
