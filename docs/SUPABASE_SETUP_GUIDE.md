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

### 3. Configure Supabase Edge Function Secrets (Optional)

**Note: This step is optional.** You can choose between:
- **Server-side API keys**: Configure once, all users benefit
- **User-managed API keys**: Each user adds their own keys
- **Hybrid approach**: Some server keys + user keys as needed

For server-side API keys, configure these secrets in Supabase:

1. **Go to Settings → Edge Functions → Secrets**
2. **Add any or all of the following secrets** (all are optional):

```bash
# AI Provider API Keys (Optional - users can add their own)
OPENAI_API_KEY=sk-your-openai-key-here
GEMINI_API_KEY=AIza-your-gemini-key-here
ANTHROPIC_API_KEY=sk-ant-your-claude-key-here
IBM_API_KEY=your-ibm-api-key-here
IBM_PROJECT_ID=your-ibm-project-id-here
```

**If you don't configure these**: Users will need to add their own API keys in the application's "API Keys" section. This is perfectly fine and often preferred for development or when users want to manage their own billing.

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

-- User API keys table
CREATE TABLE IF NOT EXISTS user_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider_id text NOT NULL,
  encrypted_key text NOT NULL,
  name text DEFAULT 'Default',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_used_at timestamptz,
  UNIQUE(user_id, provider_id, name)
);

-- Other tables (prompt_executions, analytics_events, etc.)
-- See migration files for complete schema
```

### 5. Enable Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
-- ... other tables

-- Create RLS policies (these should already exist from migrations)
-- Users can only access their own data
CREATE POLICY "Users can manage own data" ON users FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can manage own API keys" ON user_api_keys FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- ... other policies
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
```

### Test Edge Functions

```bash
# Test the ai-proxy function
curl -X POST 'https://your-project.supabase.co/functions/v1/ai-proxy' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"providerId": "health-check", "prompt": "test"}'
```

## API Key Management Options

### Option 1: Server-Side Keys (Recommended for Production)

**Pros:**
- Users don't need to manage API keys
- Centralized billing and usage control
- More secure (keys not exposed to browser)
- Easier onboarding

**Setup:**
1. Add API keys to Supabase Edge Function secrets
2. Users can immediately use all configured providers
3. Optional: Users can still add their own keys to override server keys

### Option 2: User-Managed Keys (Recommended for Development)

**Pros:**
- Users control their own billing
- No server configuration needed
- More transparent usage tracking
- Users can use their own rate limits

**Setup:**
1. Don't configure server-side API keys
2. Users add their own keys in "Settings → API Keys"
3. Each user manages their own provider access

### Option 3: Hybrid Approach (Best of Both)

**Pros:**
- Fallback system ensures reliability
- Users can override with their own keys
- Flexible deployment options

**Setup:**
1. Configure some providers server-side
2. Let users add keys for other providers
3. Users can override server keys with their own

## Connection Modes

The application supports two connection modes:

### Server Proxy Mode (Default)
- API requests go through Supabase Edge Functions
- Uses server-side or user-stored API keys
- More secure and reliable
- Recommended for production

### Direct Browser Mode
- API requests go directly from browser to providers
- Only uses user-stored API keys
- May have CORS limitations
- Good for development and testing

Users can switch between modes in "Settings → Connection Mode".

## Troubleshooting

### Common Issues

1. **"No API key found" errors**:
   - **Solution A**: Add server-side API keys in Supabase Edge Function secrets
   - **Solution B**: Have users add their own API keys in "Settings → API Keys"
   - **Solution C**: Use hybrid approach with both options

2. **"Authentication failed" errors**:
   - Verify your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   - Check that email authentication is enabled
   - Ensure user has proper permissions

3. **"Database timeout" errors**:
   - Check your internet connection
   - Verify Supabase project is active
   - Ensure RLS policies are correctly configured

4. **CORS errors in development**:
   - The Vite proxy should handle this automatically
   - Ensure you're running `npm run dev`
   - Check that proxy configuration in `vite.config.ts` is correct

### Development vs Production

**Development Mode**:
- Users typically add their own API keys
- Direct browser mode often used for testing
- Mock authentication fallback available

**Production Mode**:
- Server-side API keys recommended
- Server proxy mode for security
- Full authentication required

## Security Best Practices

1. **Never commit `.env.local`** to version control
2. **Use different Supabase projects** for development and production
3. **Rotate API keys regularly**
4. **Monitor usage** through Supabase dashboard
5. **Enable RLS** on all tables
6. **Use service role key only** in Edge Functions
7. **Encrypt user API keys** before storage (handled automatically)

## Next Steps

1. **Set up your `.env.local` file** with your Supabase credentials
2. **Test authentication** by signing up/signing in
3. **Choose your API key strategy**:
   - Configure server-side keys for easy user onboarding
   - Or let users manage their own keys for more control
   - Or use a hybrid approach
4. **Test the AI playground** with different providers
5. **Monitor usage** through the analytics dashboard

## Support

If you encounter issues:

1. **Check connection status** in "Settings → Connection Mode"
2. **Verify API key configuration** in "Settings → API Keys"
3. **Check browser console** for detailed error messages
4. **Test with different connection modes**
5. **Verify Supabase project settings**

For additional help, refer to the [Supabase documentation](https://supabase.com/docs) or check the project's troubleshooting guide.

## Quick Start Checklist

- [ ] Create Supabase project
- [ ] Configure `.env.local` with Supabase credentials
- [ ] Deploy Edge Functions (`supabase functions deploy ai-proxy`)
- [ ] Choose API key strategy:
  - [ ] **Option A**: Add server-side API keys in Supabase secrets
  - [ ] **Option B**: Let users add their own API keys
  - [ ] **Option C**: Use hybrid approach
- [ ] Test authentication (sign up/sign in)
- [ ] Test AI providers in Playground
- [ ] Configure connection mode in Settings

The application will work with any of these API key strategies - choose what works best for your use case!