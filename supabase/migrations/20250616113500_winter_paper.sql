/*
  # Fix RLS Policy for prompt_executions Table

  1. Security Changes
    - Drop the existing RLS policy that uses incorrect `uid()` function
    - Create new RLS policies with correct `auth.uid()` function
    - Separate policies for INSERT, SELECT, UPDATE, DELETE operations for better granularity

  2. Policy Details
    - INSERT: Allow authenticated users to insert their own prompt executions
    - SELECT: Allow authenticated users to read their own prompt executions  
    - UPDATE: Allow authenticated users to update their own prompt executions
    - DELETE: Allow authenticated users to delete their own prompt executions

  This fixes the "new row violates row-level security policy" error by using the correct
  Supabase auth function `auth.uid()` instead of `uid()`.
*/

-- Drop the existing policy that uses incorrect uid() function
DROP POLICY IF EXISTS "Users can manage their own prompt executions" ON prompt_executions;

-- Create separate policies for each operation with correct auth.uid() function
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