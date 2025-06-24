/*
  # Fix User API Keys Migration
  
  1. Changes
    - Add IF NOT EXISTS to all CREATE statements
    - Drop existing policies before creating new ones
    - Ensure all other operations are idempotent
    
  2. Tables
    - user_api_keys - Table for storing encrypted user API keys
    
  3. Security
    - RLS policies for user data protection
    - Indexes for query performance
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

-- Drop existing policies first to avoid conflicts
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id 
  ON user_api_keys(user_id);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider_id 
  ON user_api_keys(provider_id);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_provider 
  ON user_api_keys(user_id, provider_id);

-- Check if update_updated_at_column function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_updated_at_column'
  ) THEN
    -- Create the function if it doesn't exist
    CREATE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  END IF;
END $$;

-- Drop trigger if it exists to avoid errors
DROP TRIGGER IF EXISTS update_user_api_keys_updated_at ON user_api_keys;

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_user_api_keys_updated_at
  BEFORE UPDATE ON user_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();