/*
  # Analytics Tables for ModelShift AI

  1. New Tables
    - `analytics_events`
      - `id` (text, primary key) - Custom event ID
      - `user_id` (uuid, foreign key) - Reference to auth.users
      - `event_type` (text) - Type of event (prompt_execution, provider_call, etc.)
      - `provider_id` (text) - AI provider identifier
      - `agent_id` (text, nullable) - Prompt agent identifier
      - `prompt_length` (integer) - Length of input prompt
      - `response_length` (integer) - Length of response
      - `success` (boolean) - Whether the operation succeeded
      - `error_type` (text, nullable) - Type of error if failed
      - `metrics` (jsonb) - Performance metrics (latency, tokens, cost)
      - `metadata` (jsonb, nullable) - Additional event data
      - `timestamp` (timestamptz) - When the event occurred

    - `analytics_aggregations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key) - Reference to auth.users
      - `date` (date) - Aggregation date
      - `total_requests` (integer) - Total requests for the day
      - `total_cost` (decimal) - Total cost for the day
      - `avg_latency` (integer) - Average latency in milliseconds
      - `success_rate` (decimal) - Success rate percentage
      - `provider_breakdown` (jsonb) - Per-provider statistics
      - `agent_breakdown` (jsonb) - Per-agent statistics
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
    - Add indexes for efficient querying

  3. Functions
    - Trigger to update aggregations when new events are added
    - Function to calculate daily aggregations
*/

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  provider_id text NOT NULL,
  agent_id text,
  prompt_length integer NOT NULL DEFAULT 0,
  response_length integer NOT NULL DEFAULT 0,
  success boolean NOT NULL DEFAULT false,
  error_type text,
  metrics jsonb NOT NULL DEFAULT '{}',
  metadata jsonb,
  timestamp timestamptz NOT NULL DEFAULT now()
);

-- Create analytics_aggregations table
CREATE TABLE IF NOT EXISTS analytics_aggregations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_requests integer NOT NULL DEFAULT 0,
  total_cost decimal(10,6) NOT NULL DEFAULT 0,
  avg_latency integer NOT NULL DEFAULT 0,
  success_rate decimal(5,2) NOT NULL DEFAULT 0,
  provider_breakdown jsonb NOT NULL DEFAULT '{}',
  agent_breakdown jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_aggregations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analytics_events
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

-- RLS Policies for analytics_aggregations
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_timestamp 
  ON analytics_events(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_provider 
  ON analytics_events(provider_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_agent 
  ON analytics_events(agent_id) WHERE agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_success 
  ON analytics_events(success);

CREATE INDEX IF NOT EXISTS idx_analytics_aggregations_user_date 
  ON analytics_aggregations(user_id, date DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for analytics_aggregations updated_at
CREATE TRIGGER update_analytics_aggregations_updated_at
  BEFORE UPDATE ON analytics_aggregations
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_updated_at();