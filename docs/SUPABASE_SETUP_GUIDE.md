# Supabase Setup Guide for ModelShift AI

## Quick Setup Steps

### 1. Get Your Supabase Credentials

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project** (or create a new one)
3. **Navigate to Settings → API**
4. **Copy the following values**:
   - **Project URL** (looks like: `https://abcdefgh.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### 2. Configure Environment Variables

Create a `.env.local` file in your project root:

```bash
# Frontend Environment Variables
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Custom encryption key
VITE_ENCRYPTION_KEY=modelshift-ai-secure-key-2024
```

### 3. Configure Supabase Edge Function Secrets

For the backend proxy to work, configure these secrets in Supabase:

1. **Go to Settings → Edge Functions → Secrets**
2. **Add the following secrets**:

```bash
# AI Provider API Keys
OPENAI_API_KEY=sk-your-openai-key-here
GEMINI_API_KEY=AIza-your-gemini-key-here
ANTHROPIC_API_KEY=sk-ant-your-claude-key-here
IBM_API_KEY=your-ibm-api-key-here
IBM_PROJECT_ID=your-ibm-project-id-here
```

### 4. Database Setup

The database tables are already configured via migrations. If you need to run them manually:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  plan text DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  usage_limit integer DEFAULT 100,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Prompt executions table
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

-- Analytics events table
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

-- Analytics aggregations table
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
```

### 5. Enable Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_aggregations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (these should already exist from migrations)
-- Users can only access their own data
CREATE POLICY "Users can manage own data" ON users FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can manage own executions" ON prompt_executions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own analytics" ON analytics_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own aggregations" ON analytics_aggregations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

## Authentication Setup

### Email/Password Authentication

1. **Go to Authentication → Settings**
2. **Enable Email authentication**
3. **Disable email confirmation** (for development):
   - Set "Enable email confirmations" to OFF
4. **Configure redirect URLs** (if needed):
   - Add your development URL: `http://localhost:5173`

### User Management

The app automatically creates user records when someone signs up. The user table includes:
- Basic profile information (email, name)
- Subscription plan (free, pro, enterprise)
- Usage tracking (current usage vs. limits)

## Edge Functions Setup

### Deploy the AI Proxy Function

```bash
# Deploy the ai-proxy function
supabase functions deploy ai-proxy

# Deploy the analytics dashboard function (optional)
supabase functions deploy analytics-dashboard
```

### Test Edge Functions

```bash
# Test the ai-proxy function
curl -X POST 'https://your-project.supabase.co/functions/v1/ai-proxy' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"providerId": "health-check", "prompt": "test"}'
```

## Troubleshooting

### Common Issues

1. **"Database timeout" errors**:
   - Check your internet connection
   - Verify Supabase project is active
   - Ensure RLS policies are correctly configured

2. **"Authentication failed" errors**:
   - Verify your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   - Check that email authentication is enabled
   - Ensure user has proper permissions

3. **"API key not configured" errors**:
   - Add API keys to Supabase Edge Function secrets
   - Verify the secret names match exactly
   - Redeploy Edge Functions after adding secrets

4. **CORS errors in development**:
   - The Vite proxy should handle this automatically
   - Ensure you're running `npm run dev`
   - Check that proxy configuration in `vite.config.ts` is correct

### Development vs Production

**Development Mode**:
- Uses local environment variables
- CORS proxy for direct API calls
- Mock authentication fallback

**Production Mode**:
- Uses Supabase Edge Functions for API calls
- Server-side API key management
- Full authentication required

## Security Best Practices

1. **Never commit `.env.local`** to version control
2. **Use different Supabase projects** for development and production
3. **Rotate API keys regularly**
4. **Monitor usage** through Supabase dashboard
5. **Enable RLS** on all tables
6. **Use service role key only** in Edge Functions

## Next Steps

1. **Set up your `.env.local` file** with your Supabase credentials
2. **Test authentication** by signing up/signing in
3. **Configure AI provider API keys** in Supabase secrets
4. **Test the AI playground** with different providers
5. **Monitor usage** through the analytics dashboard

## Support

If you encounter issues:
1. Check the browser console for detailed error messages
2. Verify your Supabase project settings
3. Ensure all environment variables are correctly set
4. Test with a fresh browser session (clear cache/cookies)

For additional help, refer to the [Supabase documentation](https://supabase.com/docs) or check the project's troubleshooting guide.