/*
  # Fix RLS policies for analytics and prompt execution tables

  1. Security Updates
    - Fix RLS policies to use `auth.uid()` instead of `uid()`
    - Ensure proper authentication checks for all operations
    - Update policies for both analytics_events and prompt_executions tables

  2. Changes Made
    - Drop existing policies that use incorrect `uid()` function
    - Create new policies using correct `auth.uid()` function
    - Maintain same permission structure but with proper authentication
*/

-- Fix analytics_events table policies
DROP POLICY IF EXISTS "Users can insert their own analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Users can read their own analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Users can update their own analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Users can delete their own analytics events" ON analytics_events;

CREATE POLICY "Users can insert their own analytics events"
  ON analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own analytics events"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics events"
  ON analytics_events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analytics events"
  ON analytics_events
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Fix prompt_executions table policies
DROP POLICY IF EXISTS "Users can insert their own prompt executions" ON prompt_executions;
DROP POLICY IF EXISTS "Users can read their own prompt executions" ON prompt_executions;
DROP POLICY IF EXISTS "Users can update their own prompt executions" ON prompt_executions;
DROP POLICY IF EXISTS "Users can delete their own prompt executions" ON prompt_executions;

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

-- Fix analytics_aggregations table policies (for consistency)
DROP POLICY IF EXISTS "Users can insert their own analytics aggregations" ON analytics_aggregations;
DROP POLICY IF EXISTS "Users can read their own analytics aggregations" ON analytics_aggregations;
DROP POLICY IF EXISTS "Users can update their own analytics aggregations" ON analytics_aggregations;
DROP POLICY IF EXISTS "Users can delete their own analytics aggregations" ON analytics_aggregations;

CREATE POLICY "Users can insert their own analytics aggregations"
  ON analytics_aggregations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own analytics aggregations"
  ON analytics_aggregations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics aggregations"
  ON analytics_aggregations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analytics aggregations"
  ON analytics_aggregations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Fix users table policies (for consistency)
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);