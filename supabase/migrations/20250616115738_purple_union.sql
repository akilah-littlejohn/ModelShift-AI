/*
  # Fix Analytics Events RLS Policies

  1. Security Updates
    - Drop existing RLS policies that use incorrect `uid()` function
    - Create new RLS policies using correct `auth.uid()` function
    - Ensure authenticated users can manage their own analytics events

  2. Policy Changes
    - Users can insert their own analytics events
    - Users can read their own analytics events  
    - Users can update their own analytics events
    - Users can delete their own analytics events
*/

-- Drop existing policies that use incorrect uid() function
DROP POLICY IF EXISTS "Users can delete their own analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Users can insert their own analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Users can read their own analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Users can update their own analytics events" ON analytics_events;

-- Create new policies using correct auth.uid() function
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