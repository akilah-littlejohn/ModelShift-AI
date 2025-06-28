# Deploying the AI Proxy Edge Function

This document provides instructions for deploying the AI Proxy Edge Function to your Supabase project.

## Prerequisites

1. A Supabase account and project
2. Supabase CLI installed (optional, but recommended)
3. API keys for the AI providers you want to use

## Deployment Options

### Option 1: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy ai-proxy

# Set secrets for your API keys
supabase secrets set OPENAI_API_KEY=sk-your-openai-key-here
supabase secrets set GEMINI_API_KEY=AIza-your-gemini-key-here
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-claude-key-here
supabase secrets set IBM_API_KEY=your-ibm-key-here
supabase secrets set IBM_PROJECT_ID=your-ibm-project-id-here
```

### Option 2: Using the Web UI

1. Go to your Supabase Dashboard
2. Navigate to "Edge Functions"
3. Click "Create a new function"
4. Name it "ai-proxy"
5. Copy the contents of `index.ts` into the editor
6. Click "Deploy"
7. Go to "Settings" > "Edge Functions" > "Secrets"
8. Add your API keys as secrets with the following names:
   - `OPENAI_API_KEY`
   - `GEMINI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `IBM_API_KEY`
   - `IBM_PROJECT_ID`

### Option 3: Using the Deployment Script

For WebContainer environments (like StackBlitz), you can use our custom deployment script:

```bash
# Run the deployment script
npm run deploy-edge-function-web
```

## Verifying Deployment

After deployment, you can verify that the function is working by running:

```bash
# Using Supabase CLI
supabase functions invoke ai-proxy --body '{"providerId":"health-check","prompt":"test"}'

# Using the check script
npm run check-edge-function
```

## Troubleshooting

If you encounter issues:

1. Check that your Supabase URL and anon key are correct in your `.env.local` file
2. Verify that the function is deployed by checking the Supabase Dashboard
3. Make sure your API keys are correctly set as secrets
4. Check the function logs in the Supabase Dashboard for error messages

## Using Direct Browser Mode

If you're unable to deploy the Edge Function, you can still use the application in Direct Browser Mode:

1. Go to Settings → Connection Mode
2. Select "Direct Browser Mode"
3. Add your API keys in the API Keys section
4. Use the application as normal - it will make API calls directly from your browser

Note that Direct Browser Mode requires you to add your API keys in the application, and may be subject to CORS limitations.