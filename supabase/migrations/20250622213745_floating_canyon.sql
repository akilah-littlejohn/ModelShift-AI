/*
  # Fix duplicate policy issue

  1. Changes
     - Drop the duplicate policy "Users can insert their own API keys" if it exists
     - Recreate the policy with proper conditions to ensure it works correctly
  
  2. Security
     - Maintains the same security model
     - Ensures users can only manage their own API keys
*/

-- First drop the policy if it exists
DROP POLICY IF EXISTS "Users can insert their own API keys" ON user_api_keys;

-- Then recreate it with the correct conditions
CREATE POLICY "Users can insert their own API keys"
  ON user_api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());