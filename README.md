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
5. Check your configuration:
   ```bash
   npm run check-supabase
   ```
6. Start the development server:
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

The database schema is defined in the `supabase/migrations` directory. Apply migrations using the Supabase Dashboard or CLI:

**Option 1: Using Supabase Dashboard (Recommended for WebContainer)**
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the migration files from `supabase/migrations/` one by one
4. Execute them in chronological order

**Option 2: Using Supabase CLI (Local Development)**
```bash
npx supabase migration up
```

### Edge Functions

**For WebContainer/Bolt.new environments:**
Edge Functions need to be deployed through the Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to Edge Functions
3. Create a new function called `ai-proxy`
4. Copy the code from `supabase/functions/ai-proxy/index.ts`
5. Deploy the function

**For local development with Supabase CLI:**
```bash
npx supabase functions deploy ai-proxy
npx supabase functions deploy dynamic-ai-proxy
```

### API Key Configuration

Configure your AI provider API keys as Supabase secrets:

**Using Supabase Dashboard (Recommended for WebContainer):**
1. Go to Project Settings → API
2. Scroll down to "Project API keys"
3. Add your secrets in the "Secrets" section

**Using Supabase CLI (Local Development):**
```bash
npx supabase secrets set OPENAI_API_KEY=your-openai-key
npx supabase secrets set GEMINI_API_KEY=your-gemini-key
npx supabase secrets set ANTHROPIC_API_KEY=your-claude-key
npx supabase secrets set IBM_API_KEY=your-ibm-key
npx supabase secrets set IBM_PROJECT_ID=your-ibm-project-id
```

### Troubleshooting Supabase Issues

#### WebContainer/Bolt.new Limitations

This project is designed to work in WebContainer environments (like Bolt.new) where the Supabase CLI may not be available. In such cases:

1. Use the Supabase Dashboard for all configuration
2. Deploy Edge Functions manually through the dashboard
3. Set secrets through the dashboard interface
4. Use the built-in configuration checker: `npm run check-supabase`

#### Authentication Problems

If you're experiencing authentication issues:

1. Check that your Supabase URL and anon key are correct
2. Ensure email authentication is enabled in Supabase dashboard
3. Verify RLS policies are correctly configured
4. Check browser console for specific error messages

Run the diagnostic script:
```bash
npm run check-supabase
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

1. **For WebContainer environments:** Deploy functions through Supabase Dashboard
2. **For local development:** Check that functions are deployed:
   ```bash
   npx supabase functions list
   ```

3. Verify API keys are set as secrets in the Supabase Dashboard
4. Check function logs in the Supabase Dashboard under Edge Functions
5. Test the function directly through the dashboard or using curl

#### RLS Policy Issues

If you're experiencing "new row violates row-level security policy" errors:

1. Apply the migration files through the Supabase Dashboard SQL Editor
2. Or manually fix policies by running the SQL from the migration files
3. Test RLS policies in the browser console:
   ```javascript
   window.supabaseTests.testRLS()
   ```

#### CLI Not Available

If you see "supabase command not found" errors:

1. **In WebContainer/Bolt.new:** This is expected. Use the Supabase Dashboard instead
2. **In local development:** Install the CLI locally:
   ```bash
   npm install supabase --save-dev
   ```
   Then use: `npx supabase` instead of `supabase`

## Development Mode

For development without a Supabase account, set:

```
VITE_DEMO_MODE=true
```

This enables a mock authentication and database system for local development.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run check-supabase` - Check Supabase configuration
- `npm run setup-local` - Set up local development environment

## License

[MIT License](LICENSE)