-- Test: Verify the fixed upsert function works correctly
-- Date: 2025-07-02
-- Description: Quick test to ensure the function overload issue is resolved

-- 1. Check if there's still ambiguity (should return exactly 1 function)
SELECT 
  proname as function_name,
  oidvectortypes(proargtypes) as argument_types
FROM pg_proc 
WHERE proname = 'upsert_whatsapp_connection_v2';

-- 2. Test the function with a sample call (using an existing user_id)
DO $$
DECLARE
  test_user_id UUID;
  result_id UUID;
BEGIN
  -- Get an existing user_id
  SELECT id INTO test_user_id FROM users LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'No users found - cannot test function';
    RETURN;
  END IF;
  
  -- Test the function call with all parameters (as called from Baileys)
  SELECT upsert_whatsapp_connection_v2(
    test_user_id,
    'qr_ready',
    'test_qr_code',
    '{"test": "data"}'::jsonb,
    '+5511999999999',
    NULL,  -- p_connected_at
    NULL,  -- p_disconnected_at
    NULL   -- p_error_message
  ) INTO result_id;
  
  RAISE NOTICE 'Function test successful. Returned ID: %', result_id;
  
  -- Clean up
  DELETE FROM whatsapp_connections WHERE user_id = test_user_id;
  
END $$;
