/*
  # User API Keys Table Migration

  1. New Table
    - `user_api_keys` - Securely store user API keys for different providers
    
  2. Security
    - Enable RLS
    - Create policies for user data access
    
  3. Performance
    - Add indexes for common query patterns
    
  4. Maintenance
    - Add updated_at trigger
*/

-- Create user_api_keys table if it doesn't exist
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

-- Enable Row Level Security
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before creating new ones
DROP POLICY IF EXISTS "Users can insert their own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can read their own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON user_api_keys;

-- Create RLS policies
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

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id 
  ON user_api_keys(user_id);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider_id 
  ON user_api_keys(provider_id);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_provider 
  ON user_api_keys(user_id, provider_id);

-- Create trigger to update updated_at timestamp (only if the function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    -- Drop the trigger if it exists to avoid errors
    DROP TRIGGER IF EXISTS update_user_api_keys_updated_at ON user_api_keys;
    
    -- Create the trigger
    CREATE TRIGGER update_user_api_keys_updated_at
      BEFORE UPDATE ON user_api_keys
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;