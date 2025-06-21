# ModelShift AI - Multi-LLM SaaS Platform

ModelShift AI is a powerful SaaS platform for orchestrating and comparing multiple large language models (LLMs) through a unified interface. It supports OpenAI, Google Gemini, Anthropic Claude, and IBM WatsonX.

[![Built with Bolt](https://img.shields.io/badge/Built%20with-Bolt-blue)](https://bolt.new)

## Features

- **Multi-Provider Support**: Compare responses from different AI providers side-by-side
- **Prompt Agent Management**: Create and manage custom prompt templates
- **API Key Management**: Securely store and manage your API keys
- **Analytics Dashboard**: Track usage, costs, and performance metrics
- **Execution History**: Review past prompts and responses
- **Debate Mode**: Compare different AI configurations in a debate format
- **SDK Documentation**: Developer resources for integration

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (for authentication and database)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment example file:
   ```bash
   cp .env.example .env.local
   ```
4. Configure your Supabase credentials in `.env.local`
5. Start the development server:
   ```bash
   npm run dev
   ```

## Supabase Configuration

### Environment Setup

Create a `.env.local` file with the following variables:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_ENCRYPTION_KEY=your-encryption-key-here
```

### Database Setup

The database schema is defined in the `supabase/migrations` directory. Apply migrations using:

```bash
supabase migration up
```

### Edge Functions

Deploy the required Edge Functions:

```bash
supabase functions deploy ai-proxy
supabase functions deploy dynamic-ai-proxy
supabase functions deploy analytics-dashboard
```

### API Key Configuration

Configure your AI provider API keys as Supabase secrets:

```bash
supabase secrets set OPENAI_API_KEY=your-openai-key
supabase secrets set GEMINI_API_KEY=your-gemini-key
supabase secrets set ANTHROPIC_API_KEY=your-claude-key
supabase secrets set IBM_API_KEY=your-ibm-key
supabase secrets set IBM_PROJECT_ID=your-ibm-project-id
```

### Troubleshooting Supabase Issues

#### Authentication Problems

If you're experiencing authentication issues:

1. Check that your Supabase URL and anon key are correct
2. Ensure email authentication is enabled in Supabase dashboard
3. Verify RLS policies are correctly configured
4. Check browser console for specific error messages

Run the diagnostic script:
```bash
node scripts/check-supabase.js
```

#### Database Connection Issues

If you're having trouble connecting to the database:

1. Verify your Supabase URL and anon key
2. Check that RLS policies are correctly configured
3. Ensure the required tables exist in your Supabase project
4. Test database connection in the browser console:
   ```javascript
   window.supabaseTests.testConnection()
   ```

#### Edge Function Errors

If Edge Functions are failing:

1. Check that functions are deployed:
   ```bash
   supabase functions list
   ```

2. Verify API keys are set as secrets:
   ```bash
   supabase secrets list
   ```

3. Check function logs:
   ```bash
   supabase functions logs ai-proxy --follow
   ```

4. Test the function directly:
   ```bash
   supabase functions invoke ai-proxy --body '{"providerId":"health-check","prompt":"test"}'
   ```

#### RLS Policy Issues

If you're experiencing "new row violates row-level security policy" errors:

1. Apply the fixed RLS policies:
   ```bash
   supabase db reset
   ```

2. Or manually fix policies by running:
   ```sql
   -- Example for users table
   DROP POLICY IF EXISTS "Users can read own data" ON users;
   CREATE POLICY "Users can read own data"
     ON users
     FOR SELECT
     TO authenticated
     USING (id = (SELECT auth.uid()));
   ```

3. Test RLS policies in the browser console:
   ```javascript
   window.supabaseTests.testRLS()
   ```

## Development Mode

For development without a Supabase account, set:

```
VITE_DEMO_MODE=true
```

This enables a mock authentication and database system for local development.

## License

[MIT License](LICENSE)