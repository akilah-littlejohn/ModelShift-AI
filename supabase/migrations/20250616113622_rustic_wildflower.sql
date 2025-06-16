/*
  # Fix RLS policies for prompt_executions table

  1. Security Updates
    - Drop existing policies that use incorrect `uid()` function
    - Create new policies using correct `auth.uid()` function
    - Ensure all CRUD operations work properly for authenticated users

  2. Policy Changes
    - Users can insert their own prompt executions (auth.uid() = user_id)
    - Users can read their own prompt executions (auth.uid() = user_id)  
    - Users can update their own prompt executions (auth.uid() = user_id)
    - Users can delete their own prompt executions (auth.uid() = user_id)
*/

-- Drop existing policies that may be using incorrect uid() function
DROP POLICY IF EXISTS "Users can insert their own prompt executions" ON prompt_executions;
DROP POLICY IF EXISTS "Users can read their own prompt executions" ON prompt_executions;
DROP POLICY IF EXISTS "Users can update their own prompt executions" ON prompt_executions;
DROP POLICY IF EXISTS "Users can delete their own prompt executions" ON prompt_executions;

-- Create corrected policies using auth.uid()
CREATE POLICY "Users can insert their own prompt executions"
  ON prompt_executions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own prompt executions"
  ON prompt_executions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own prompt executions"
  ON prompt_executions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prompt executions"
  ON prompt_executions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);