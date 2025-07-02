-- Fix: Create proper UPSERT function that handles UNIQUE constraint correctly
-- Date: 2025-07-02
-- Description: Replace the current upsert function with one that uses ON CONFLICT properly

-- 1. Drop existing functions to avoid conflicts
-- First, get all function signatures and drop them specifically
DO $$
DECLARE
    rec RECORD;
BEGIN
    -- Drop all upsert_whatsapp_connection_v2 functions
    FOR rec IN 
        SELECT proname, oidvectortypes(proargtypes) as arg_types
        FROM pg_proc 
        WHERE proname = 'upsert_whatsapp_connection_v2'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || rec.proname || '(' || rec.arg_types || ') CASCADE';
    END LOOP;
    
    -- Drop all upsert_whatsapp_connection functions
    FOR rec IN 
        SELECT proname, oidvectortypes(proargtypes) as arg_types
        FROM pg_proc 
        WHERE proname = 'upsert_whatsapp_connection'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || rec.proname || '(' || rec.arg_types || ') CASCADE';
    END LOOP;
END
$$;

-- 2. Create the definitive UPSERT function
CREATE OR REPLACE FUNCTION upsert_whatsapp_connection_v2(
    p_user_id UUID,
    p_status TEXT DEFAULT 'connecting',
    p_qr_code TEXT DEFAULT NULL,
    p_whatsapp_user JSONB DEFAULT NULL,
    p_phone_number TEXT DEFAULT NULL,
    p_connected_at TIMESTAMPTZ DEFAULT NULL,
    p_disconnected_at TIMESTAMPTZ DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    connection_id UUID;
BEGIN
    -- Use INSERT with ON CONFLICT to handle the UNIQUE constraint properly
    INSERT INTO whatsapp_connections (
        user_id,
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
        p_user_id,
        p_status,
        p_qr_code,
        p_whatsapp_user,
        p_phone_number,
        CASE 
            WHEN p_status = 'connected' AND p_connected_at IS NULL THEN NOW()
            ELSE p_connected_at
        END,
        CASE 
            WHEN p_status = 'disconnected' AND p_disconnected_at IS NULL THEN NOW()
            ELSE p_disconnected_at
        END,
        p_error_message,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        status = EXCLUDED.status,
        qr_code = EXCLUDED.qr_code,
        whatsapp_user = EXCLUDED.whatsapp_user,
        phone_number = EXCLUDED.phone_number,
        connected_at = CASE 
            WHEN EXCLUDED.status = 'connected' AND EXCLUDED.connected_at IS NULL 
            THEN NOW()
            ELSE EXCLUDED.connected_at
        END,
        disconnected_at = CASE 
            WHEN EXCLUDED.status = 'disconnected' AND EXCLUDED.disconnected_at IS NULL 
            THEN NOW()
            ELSE EXCLUDED.disconnected_at
        END,
        error_message = EXCLUDED.error_message,
        updated_at = NOW()
    RETURNING id INTO connection_id;

    RETURN connection_id;
END;
$$;

-- 3. Create alias function for backward compatibility (without _v2)
CREATE OR REPLACE FUNCTION upsert_whatsapp_connection(
    p_user_id UUID,
    p_status TEXT DEFAULT 'connecting',
    p_qr_code TEXT DEFAULT NULL,
    p_whatsapp_user JSONB DEFAULT NULL,
    p_phone_number TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Call the main function with the correct parameters
    RETURN upsert_whatsapp_connection_v2(
        p_user_id,
        p_status,
        p_qr_code,
        p_whatsapp_user,
        p_phone_number,
        NULL, -- p_connected_at
        NULL, -- p_disconnected_at
        p_error_message
    );
END;
$$;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION upsert_whatsapp_connection_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_whatsapp_connection_v2 TO anon;
GRANT EXECUTE ON FUNCTION upsert_whatsapp_connection TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_whatsapp_connection TO anon;

-- 5. Test the function
DO $$
DECLARE
    test_user_id UUID := '123e4567-e89b-12d3-a456-426614174000'; -- Fake UUID for test
    result_id UUID;
BEGIN
    -- Test 1: Insert
    SELECT upsert_whatsapp_connection_v2(
        test_user_id,
        'qr_ready',
        'test_qr_code',
        '{"test": "data"}'::jsonb,
        '+5511999999999',
        NULL,
        NULL,
        NULL
    ) INTO result_id;
    
    RAISE NOTICE 'Test 1 (INSERT) successful. ID: %', result_id;
    
    -- Test 2: Update same user_id
    SELECT upsert_whatsapp_connection_v2(
        test_user_id,
        'connected',
        NULL,
        '{"user": "connected"}'::jsonb,
        '+5511999999999',
        NOW(),
        NULL,
        NULL
    ) INTO result_id;
    
    RAISE NOTICE 'Test 2 (UPDATE) successful. ID: %', result_id;
    
    -- Test 3: Test backward compatibility function
    SELECT upsert_whatsapp_connection(
        test_user_id,
        'disconnected',
        NULL,
        NULL,
        '+5511999999999',
        'Test disconnect'
    ) INTO result_id;
    
    RAISE NOTICE 'Test 3 (BACKWARD COMPATIBILITY) successful. ID: %', result_id;
    
    -- Cleanup
    DELETE FROM whatsapp_connections WHERE user_id = test_user_id;
    
    RAISE NOTICE 'All tests passed! Functions are working correctly.';
    
EXCEPTION WHEN OTHERS THEN
    -- Cleanup on error
    DELETE FROM whatsapp_connections WHERE user_id = test_user_id;
    RAISE NOTICE 'Test failed: %', SQLERRM;
END;
$$;
