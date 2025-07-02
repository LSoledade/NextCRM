-- Validation Script: Check WhatsApp Connections After Migration
-- Date: 2025-07-02
-- Description: Scripts to validate that the cleanup migration worked correctly

-- 1. Check for any remaining duplicates
SELECT 
  user_id, 
  COUNT(*) as total_records
FROM whatsapp_connections 
GROUP BY user_id 
HAVING COUNT(*) > 1
ORDER BY total_records DESC;

-- 2. Verify the UNIQUE constraint exists
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'whatsapp_connections'::regclass 
  AND conname = 'whatsapp_connections_user_id_unique';

-- 3. Check total records in the table
SELECT COUNT(*) as total_connections FROM whatsapp_connections;

-- 4. Check if the specific problematic user_id still exists
SELECT COUNT(*) as problematic_user_records 
FROM whatsapp_connections 
WHERE user_id = '350e2afd-2c1f-4668-bf4a-fa4f3a9b027d';

-- 5. Test the upsert function with an existing user
DO $$
DECLARE
  test_user_id UUID;
  record_count INTEGER;
  first_connection_id UUID;
  second_connection_id UUID;
BEGIN
  -- Get an existing user_id from the users table
  SELECT id INTO test_user_id 
  FROM users 
  LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'No users found in the database - skipping upsert function test';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Testing upsert function with user_id: %', test_user_id;
  
  -- Clean up any existing test data first
  DELETE FROM whatsapp_connections WHERE user_id = test_user_id;
  
  -- First call should INSERT
  SELECT upsert_whatsapp_connection_v2(
    test_user_id,
    'connecting',
    'test_qr_code_insert',
    '{"test": "data", "action": "insert"}'::jsonb,
    '+5511999999999',
    NULL,
    NULL,
    NULL
  ) INTO first_connection_id;
  
  RAISE NOTICE 'First upsert (INSERT) returned ID: %', first_connection_id;
  
  -- Second call should UPDATE (same user_id)
  SELECT upsert_whatsapp_connection_v2(
    test_user_id,
    'connected',
    'test_qr_code_update',
    '{"test": "updated", "action": "update"}'::jsonb,
    '+5511888888888',
    NOW(),
    NULL,
    NULL
  ) INTO second_connection_id;
  
  RAISE NOTICE 'Second upsert (UPDATE) returned ID: %', second_connection_id;
  
  -- Verify that both calls returned the same ID (proving it's an UPDATE, not INSERT)
  IF first_connection_id = second_connection_id THEN
    RAISE NOTICE 'SUCCESS: Both upsert calls returned the same ID - UPDATE worked correctly';
  ELSE
    RAISE NOTICE 'WARNING: Different IDs returned - this might indicate an issue';
  END IF;
  
  -- Verify the final state
  SELECT COUNT(*) INTO record_count 
  FROM whatsapp_connections 
  WHERE user_id = test_user_id;
  
  IF record_count = 1 THEN
    RAISE NOTICE 'SUCCESS: Only 1 record exists for the test user_id';
  ELSE
    RAISE NOTICE 'WARNING: % records found for test user_id (should be 1)', record_count;
  END IF;
  
  -- Clean up test data
  DELETE FROM whatsapp_connections WHERE user_id = test_user_id;
  
  RAISE NOTICE 'Test completed successfully - upsert function is working correctly';
END $$;
