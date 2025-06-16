/*
  # Create prompt executions table for analytics

  1. New Tables
    - `prompt_executions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `prompt` (text, the original user input)
      - `agent_type` (text, type of agent used or 'direct')
      - `providers` (text array, list of providers used)
      - `responses` (jsonb, array of provider responses with metrics)
      - `execution_time` (integer, total execution time in milliseconds)
      - `tokens_used` (integer, total tokens consumed)
      - `created_at` (timestamptz, when the execution occurred)

  2. Security
    - Enable RLS on `prompt_executions` table
    - Add policy for users to read/write their own execution data

  3. Indexes
    - Add index on user_id for faster queries
    - Add index on created_at for analytics queries
*/

CREATE TABLE IF NOT EXISTS prompt_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt text NOT NULL,
  agent_type text DEFAULT 'direct',
  providers text[] NOT NULL DEFAULT '{}',
  responses jsonb NOT NULL DEFAULT '[]',
  execution_time integer NOT NULL DEFAULT 0,
  tokens_used integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE prompt_executions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own execution data
CREATE POLICY "Users can manage their own prompt executions"
  ON prompt_executions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prompt_executions_user_id 
  ON prompt_executions(user_id);

CREATE INDEX IF NOT EXISTS idx_prompt_executions_created_at 
  ON prompt_executions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prompt_executions_user_created 
  ON prompt_executions(user_id, created_at DESC);