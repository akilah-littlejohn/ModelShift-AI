/*
  # User API Keys Table

  1. New Tables
    - `user_api_keys` - Stores encrypted API keys for different providers
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `provider_id` (text)
      - `encrypted_key` (text)
      - `name` (text, default 'Default')
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `last_used_at` (timestamptz, nullable)
  
  2. Security
    - Enable RLS on `user_api_keys` table
    - Add policies for authenticated users to manage their own API keys
  
  3. Performance
    - Add indexes for user_id, provider_id, and their combination
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

-- Create RLS policies with IF NOT EXISTS to avoid errors
CREATE POLICY IF NOT EXISTS "Users can insert their own API keys"
  ON user_api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can read their own API keys"
  ON user_api_keys
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update their own API keys"
  ON user_api_keys
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can delete their own API keys"
  ON user_api_keys
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

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