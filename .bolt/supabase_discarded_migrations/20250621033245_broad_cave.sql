/*
  # User API Keys Implementation

  1. New Tables
    - `user_api_keys`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `provider_id` (text, e.g., "openai", "gemini", "claude", "ibm")
      - `encrypted_key` (text, the encrypted API key)
      - `name` (text, optional name for the key)
      - `is_active` (boolean, whether the key is active)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `last_used_at` (timestamptz, nullable)

  2. Security
    - Enable RLS on `user_api_keys` table
    - Add policies so users can only access their own keys
    - Create unique constraint on user_id + provider_id + name

  3. Indexes
    - Add index on user_id for faster queries
    - Add index on provider_id for filtering
    - Add composite index on user_id + provider_id for common queries
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

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_user_api_keys_updated_at
  BEFORE UPDATE ON user_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();