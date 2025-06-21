/*
  # User API Keys Table Migration
  
  1. New Tables
    - `user_api_keys` - Stores encrypted API keys for various providers
  
  2. Security
    - Enable RLS on `user_api_keys` table
    - Add policies for authenticated users to manage their own API keys
    
  3. Performance
    - Add indexes for common query patterns
    - Add trigger for automatic timestamp updates
*/

-- Create user_api_keys table
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

-- Create RLS policies using DO block to check if they exist first
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id 
  ON user_api_keys(user_id);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider_id 
  ON user_api_keys(provider_id);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_provider 
  ON user_api_keys(user_id, provider_id);

-- Create trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_user_api_keys_updated_at ON user_api_keys;
CREATE TRIGGER update_user_api_keys_updated_at
  BEFORE UPDATE ON user_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();