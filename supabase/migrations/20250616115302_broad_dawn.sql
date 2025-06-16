/*
  # Fix RLS policies for analytics and prompt execution tables

  1. Security Updates
    - Update RLS policies to use correct `auth.uid()` function instead of `uid()`
    - Ensure INSERT policies allow authenticated users to insert their own data
    - Maintain existing SELECT, UPDATE, and DELETE policies with corrected function calls

  2. Tables Updated
    - `analytics_events` - Fix all RLS policies
    - `prompt_executions` - Fix all RLS policies

  This migration fixes the RLS policy violations that were preventing data insertion.
*/

-- Fix analytics_events table policies
DROP POLICY IF EXISTS "Users can delete their own analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Users can insert their own analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Users can read their own analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Users can update their own analytics events" ON analytics_events;

CREATE POLICY "Users can delete their own analytics events"
  ON analytics_events
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

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

-- Fix prompt_executions table policies
DROP POLICY IF EXISTS "Users can delete their own prompt executions" ON prompt_executions;
DROP POLICY IF EXISTS "Users can insert their own prompt executions" ON prompt_executions;
DROP POLICY IF EXISTS "Users can read their own prompt executions" ON prompt_executions;
DROP POLICY IF EXISTS "Users can update their own prompt executions" ON prompt_executions;

CREATE POLICY "Users can delete their own prompt executions"
  ON prompt_executions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

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

-- Fix users table policies (for completeness)
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

-- Fix analytics_aggregations table policies (for completeness)
DROP POLICY IF EXISTS "Users can delete their own analytics aggregations" ON analytics_aggregations;
DROP POLICY IF EXISTS "Users can insert their own analytics aggregations" ON analytics_aggregations;
DROP POLICY IF EXISTS "Users can read their own analytics aggregations" ON analytics_aggregations;
DROP POLICY IF EXISTS "Users can update their own analytics aggregations" ON analytics_aggregations;

CREATE POLICY "Users can delete their own analytics aggregations"
  ON analytics_aggregations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

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