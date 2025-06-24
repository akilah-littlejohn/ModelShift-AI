/*
  # Fix Duplicate Policies

  1. Changes
     - Drops existing policies for user_api_keys table if they exist
     - Recreates policies with proper DO block syntax
     - Ensures no duplicate policies are created

  2. Security
     - Maintains same security model with proper RLS policies
     - Ensures users can only access their own API keys
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can read their own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON user_api_keys;

-- Recreate policies with proper syntax
DO $$ 
BEGIN
  -- Insert policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_api_keys' AND policyname = 'Users can insert their own API keys'
  ) THEN
    CREATE POLICY "Users can insert their own API keys"
      ON user_api_keys
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- Select policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_api_keys' AND policyname = 'Users can read their own API keys'
  ) THEN
    CREATE POLICY "Users can read their own API keys"
      ON user_api_keys
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;

  -- Update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_api_keys' AND policyname = 'Users can update their own API keys'
  ) THEN
    CREATE POLICY "Users can update their own API keys"
      ON user_api_keys
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- Delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_api_keys' AND policyname = 'Users can delete their own API keys'
  ) THEN
    CREATE POLICY "Users can delete their own API keys"
      ON user_api_keys
      FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;