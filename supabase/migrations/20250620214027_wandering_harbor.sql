/*
  # Fix User API Keys Migration

  This migration checks if objects exist before creating them to avoid errors
  when the migration is run multiple times or if objects already exist.
*/

-- Only create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider_id text NOT NULL,
  encrypted_key text NOT NULL,
  name text DEFAULT 'Default',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_used_at timestamptz,
  UNIQUE(user_id, provider_id, name)
);

-- Enable Row Level Security if not already enabled
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
DO $$ 
BEGIN
  -- Drop policies if they exist
  DROP POLICY IF EXISTS "Users can insert their own API keys" ON user_api_keys;
  DROP POLICY IF EXISTS "Users can read their own API keys" ON user_api_keys;
  DROP POLICY IF EXISTS "Users can update their own API keys" ON user_api_keys;
  DROP POLICY IF EXISTS "Users can delete their own API keys" ON user_api_keys;
  
  -- Create policies
  CREATE POLICY "Users can insert their own API keys"
    ON user_api_keys
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

  CREATE POLICY "Users can read their own API keys"
    ON user_api_keys
    FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

  CREATE POLICY "Users can update their own API keys"
    ON user_api_keys
    FOR UPDATE
    TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

  CREATE POLICY "Users can delete their own API keys"
    ON user_api_keys
    FOR DELETE
    TO authenticated
    USING (user_id = (SELECT auth.uid()));
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id 
  ON user_api_keys(user_id);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider_id 
  ON user_api_keys(provider_id);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_provider 
  ON user_api_keys(user_id, provider_id);

-- Create trigger for updated_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_user_api_keys_updated_at'
  ) THEN
    CREATE TRIGGER update_user_api_keys_updated_at
      BEFORE UPDATE ON user_api_keys
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
EXCEPTION
  WHEN others THEN
    -- If there's an error (like the function doesn't exist), just log it
    RAISE NOTICE 'Could not create trigger: %', SQLERRM;
END $$;