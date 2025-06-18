/*
  # Fix RLS Policies for ModelShift AI

  1. Security Updates
    - Fix all RLS policies to use correct `(SELECT auth.uid())` syntax
    - Drop existing problematic policies and recreate with proper authentication
    - Add performance indexes for user_id columns
    - Enable RLS on all user data tables

  2. Tables Updated
    - users
    - prompt_executions
    - analytics_events
    - analytics_aggregations

  3. Performance Improvements
    - Add btree indexes on user_id columns
    - Add composite indexes for common query patterns
    - Use IF NOT EXISTS for safe index creation
*/

-- Drop all existing policies that may have incorrect syntax
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

DROP POLICY IF EXISTS "Users can insert their own prompt executions" ON prompt_executions;
DROP POLICY IF EXISTS "Users can read their own prompt executions" ON prompt_executions;
DROP POLICY IF EXISTS "Users can update their own prompt executions" ON prompt_executions;
DROP POLICY IF EXISTS "Users can delete their own prompt executions" ON prompt_executions;

DROP POLICY IF EXISTS "Users can insert their own analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Users can read their own analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Users can update their own analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Users can delete their own analytics events" ON analytics_events;

DROP POLICY IF EXISTS "Users can insert their own analytics aggregations" ON analytics_aggregations;
DROP POLICY IF EXISTS "Users can read their own analytics aggregations" ON analytics_aggregations;
DROP POLICY IF EXISTS "Users can update their own analytics aggregations" ON analytics_aggregations;
DROP POLICY IF EXISTS "Users can delete their own analytics aggregations" ON analytics_aggregations;

-- Ensure RLS is enabled on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_aggregations ENABLE ROW LEVEL SECURITY;

-- Create fixed policies for users table
CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- Create fixed policies for prompt_executions table
CREATE POLICY "Users can insert their own prompt executions"
  ON prompt_executions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can read their own prompt executions"
  ON prompt_executions
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own prompt executions"
  ON prompt_executions
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own prompt executions"
  ON prompt_executions
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Create fixed policies for analytics_events table
CREATE POLICY "Users can insert their own analytics events"
  ON analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can read their own analytics events"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own analytics events"
  ON analytics_events
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own analytics events"
  ON analytics_events
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Create fixed policies for analytics_aggregations table
CREATE POLICY "Users can insert their own analytics aggregations"
  ON analytics_aggregations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can read their own analytics aggregations"
  ON analytics_aggregations
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own analytics aggregations"
  ON analytics_aggregations
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own analytics aggregations"
  ON analytics_aggregations
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_users_id ON users USING btree (id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users USING btree (email);

CREATE INDEX IF NOT EXISTS idx_prompt_executions_user_id ON prompt_executions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_executions_created_at ON prompt_executions USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_executions_user_created ON prompt_executions USING btree (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events USING btree (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_timestamp ON analytics_events USING btree (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_provider ON analytics_events USING btree (provider_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_agent ON analytics_events USING btree (agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_success ON analytics_events USING btree (success);

CREATE INDEX IF NOT EXISTS idx_analytics_aggregations_user_id ON analytics_aggregations USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_aggregations_date ON analytics_aggregations USING btree (date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_aggregations_user_date ON analytics_aggregations USING btree (user_id, date DESC);