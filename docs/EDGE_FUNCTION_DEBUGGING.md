# Edge Function Debugging Guide

## WebContainer/Bolt.new Environment

**Important:** In WebContainer environments (like Bolt.new), the Supabase CLI is not available. Use the Supabase Dashboard for all operations.

## 1. View Edge Function Logs

### Using Supabase Dashboard (Recommended for WebContainer):
1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** in the sidebar
3. Click on your function name (e.g., `ai-proxy`)
4. View the **Logs** tab for real-time logs
5. Use the **Invocations** tab to see function calls

### Using Supabase CLI (Local Development Only):
```bash
# View logs for a specific function
npx supabase functions logs ai-proxy --follow

# View logs for all functions
npx supabase functions logs --follow

# View logs with specific log level
npx supabase functions logs ai-proxy --follow --level error
```

### Historical logs:
```bash
# View recent logs
npx supabase functions logs ai-proxy

# View logs from specific time period
npx supabase functions logs ai-proxy --since "2024-01-01 00:00:00"
```

## 2. Local Development & Testing

### For WebContainer/Bolt.new:
Local Edge Function serving is not available. Test functions after deploying to Supabase.

### For Local Development with CLI:
```bash
# Start local Edge Functions server
npx supabase functions serve

# Serve specific function
npx supabase functions serve ai-proxy --env-file .env.local
```

### Test deployed functions with curl:
```bash
# Test health check
curl -X POST 'https://your-project-id.supabase.co/functions/v1/ai-proxy' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"providerId": "health-check", "prompt": "test"}'

# Test actual provider
curl -X POST 'https://your-project-id.supabase.co/functions/v1/ai-proxy' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "providerId": "openai",
    "prompt": "Hello, how are you?",
    "model": "gpt-4",
    "userId": "test-user-id"
  }'
```

## 3. Add Debug Logging to Edge Functions

### Enhanced logging in your Edge Function:
```typescript
// Add to your Edge Function
console.log(`[${requestId}] Request received:`, {
  providerId,
  promptLength: prompt?.length,
  hasModel: !!model,
  hasParameters: !!parameters,
  userId,
  timestamp: new Date().toISOString()
});

// Log environment variables (safely)
console.log(`[${requestId}] Environment check:`, {
  hasOpenAI: !!Deno.env.get('OPENAI_API_KEY'),
  hasGemini: !!Deno.env.get('GEMINI_API_KEY'),
  hasClaude: !!Deno.env.get('ANTHROPIC_API_KEY'),
  hasIBM: !!Deno.env.get('IBM_API_KEY'),
  hasIBMProject: !!Deno.env.get('IBM_PROJECT_ID')
});

// Log API responses (safely)
console.log(`[${requestId}] API Response:`, {
  status: apiResponse.status,
  statusText: apiResponse.statusText,
  headers: Object.fromEntries(apiResponse.headers.entries())
});
```

## 4. Check Supabase Dashboard

### Navigate to your Supabase Dashboard:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Edge Functions** in the sidebar
4. Click on your function name
5. View the **Logs** tab for real-time logs
6. Check the **Metrics** tab for performance data

## 5. Verify Secrets Configuration

### Using Supabase Dashboard (Recommended for WebContainer):
1. Go to Project Settings → API
2. Scroll down to "Project API keys"
3. Check the "Secrets" section
4. Add missing secrets as needed

### Using Supabase CLI (Local Development Only):
```bash
# List all secrets
npx supabase secrets list

# Check specific secret (will show if it exists, not the value)
npx supabase secrets list | grep OPENAI_API_KEY
```

### Set missing secrets:
**Dashboard Method (WebContainer):**
1. Go to Project Settings → API → Secrets
2. Add each secret with its value

**CLI Method (Local Development):**
```bash
npx supabase secrets set OPENAI_API_KEY=your-key-here
npx supabase secrets set GEMINI_API_KEY=your-key-here
npx supabase secrets set ANTHROPIC_API_KEY=your-key-here
npx supabase secrets set IBM_API_KEY=your-key-here
npx supabase secrets set IBM_PROJECT_ID=your-project-id-here
```

## 6. Test Edge Function Deployment

### Using Supabase Dashboard (WebContainer):
1. Go to Edge Functions in your dashboard
2. Create or update your function
3. Copy code from `supabase/functions/ai-proxy/index.ts`
4. Deploy through the dashboard

### Using Supabase CLI (Local Development):
```bash
# List deployed functions
npx supabase functions list

# Deploy with verbose output
npx supabase functions deploy ai-proxy --debug
```

### Test deployed function:
```bash
# Test via curl (works in all environments)
curl -X POST 'https://your-project-id.supabase.co/functions/v1/ai-proxy' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"providerId": "health-check", "prompt": "test"}'

# Test via Supabase CLI (Local Development Only)
npx supabase functions invoke ai-proxy \
  --body '{"providerId": "health-check", "prompt": "test"}' \
  --header 'Authorization: Bearer YOUR_ANON_KEY'
```

## 7. Common Issues & Solutions

### Issue: "supabase command not found"
**WebContainer Solution:** This is expected. Use the Supabase Dashboard instead.
**Local Development Solution:** Install locally and use npx:
```bash
npm install supabase --save-dev
npx supabase --version
```

### Issue: "Function not found"
**Solution:** Deploy the function through Supabase Dashboard or CLI
```bash
# Local Development
npx supabase functions deploy ai-proxy
```

### Issue: "Missing API key" errors
**Solution:** Check and set secrets through Dashboard or CLI
```bash
# Local Development
npx supabase secrets list
npx supabase secrets set OPENAI_API_KEY=your-actual-key
```

### Issue: "Authentication failed"
**Solution:** Verify your anon key and user session
```bash
# Check your .env file has correct keys
cat .env.local

# Test authentication in browser console
console.log(await supabase.auth.getSession())
```

### Issue: "CORS errors"
**Solution:** Ensure CORS headers are properly set in Edge Function
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
```

## 8. Debug Frontend Integration

### Add logging to your frontend calls:
```typescript
// In DynamicProxyService.ts
console.log('Making proxy request:', {
  providerId,
  promptLength: prompt.length,
  hasSession: !!session,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.substring(0, 30) + '...'
});

// Log the full error response
if (error) {
  console.error('Full error details:', {
    message: error.message,
    context: error.context,
    data: data
  });
}
```

## 9. Monitor Function Performance

### Check function metrics:
1. Go to Supabase Dashboard → Edge Functions
2. Select your function
3. View **Metrics** tab for:
   - Invocation count
   - Error rate
   - Response time
   - Memory usage

## 10. Quick Debug Commands

### For WebContainer environments:
```bash
# Check configuration
npm run check-supabase

# Test function via browser console
fetch('https://your-project-id.supabase.co/functions/v1/ai-proxy', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ANON_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({providerId: 'health-check', prompt: 'test'})
}).then(r => r.json()).then(console.log)
```

### For local development:
```bash
# Check deployment, secrets, and test
npx supabase functions list && \
npx supabase secrets list && \
npx supabase functions invoke ai-proxy --body '{"providerId": "health-check", "prompt": "test"}'
```

## 11. Environment Variables Debug

### Create a debug endpoint in your Edge Function:
```typescript
// Add this to your Edge Function for debugging
if (providerId === 'debug-env') {
  return new Response(
    JSON.stringify({
      success: true,
      environment: {
        hasOpenAI: !!Deno.env.get('OPENAI_API_KEY'),
        hasGemini: !!Deno.env.get('GEMINI_API_KEY'),
        hasClaude: !!Deno.env.get('ANTHROPIC_API_KEY'),
        hasIBM: !!Deno.env.get('IBM_API_KEY'),
        hasIBMProject: !!Deno.env.get('IBM_PROJECT_ID'),
        supabaseUrl: !!Deno.env.get('SUPABASE_URL'),
        timestamp: new Date().toISOString()
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

Then test with:
```bash
curl -X POST 'https://your-project-id.supabase.co/functions/v1/ai-proxy' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"providerId": "debug-env", "prompt": "test"}'
```

## WebContainer-Specific Notes

- Supabase CLI is not available in WebContainer environments
- Use `npx supabase` for local development
- All deployment and configuration must be done through Supabase Dashboard in WebContainer
- The `npm run check-supabase` script will detect WebContainer limitations
- Focus on browser-based testing and dashboard monitoring