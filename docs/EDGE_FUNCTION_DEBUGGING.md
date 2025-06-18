# Edge Function Debugging Guide

## 1. View Edge Function Logs

### Real-time logs (recommended for active debugging):
```bash
# View logs for a specific function
supabase functions logs ai-proxy --follow

# View logs for all functions
supabase functions logs --follow

# View logs with specific log level
supabase functions logs ai-proxy --follow --level error
```

### Historical logs:
```bash
# View recent logs
supabase functions logs ai-proxy

# View logs from specific time period
supabase functions logs ai-proxy --since "2024-01-01 00:00:00"
```

## 2. Local Development & Testing

### Serve functions locally:
```bash
# Start local Edge Functions server
supabase functions serve

# Serve specific function
supabase functions serve ai-proxy --env-file .env.local
```

### Test locally with curl:
```bash
# Test health check
curl -X POST 'http://localhost:54321/functions/v1/ai-proxy' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"providerId": "health-check", "prompt": "test"}'

# Test actual provider
curl -X POST 'http://localhost:54321/functions/v1/ai-proxy' \
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

### Check if secrets are set:
```bash
# List all secrets
supabase secrets list

# Check specific secret (will show if it exists, not the value)
supabase secrets list | grep OPENAI_API_KEY
```

### Set missing secrets:
```bash
supabase secrets set OPENAI_API_KEY=your-key-here
supabase secrets set GEMINI_API_KEY=your-key-here
supabase secrets set ANTHROPIC_API_KEY=your-key-here
supabase secrets set IBM_API_KEY=your-key-here
supabase secrets set IBM_PROJECT_ID=your-project-id-here
```

## 6. Test Edge Function Deployment

### Verify function is deployed:
```bash
# List deployed functions
supabase functions list

# Deploy with verbose output
supabase functions deploy ai-proxy --debug
```

### Test deployed function:
```bash
# Test via Supabase CLI
supabase functions invoke ai-proxy \
  --body '{"providerId": "health-check", "prompt": "test"}' \
  --header 'Authorization: Bearer YOUR_ANON_KEY'
```

## 7. Common Issues & Solutions

### Issue: "Function not found"
**Solution:** Redeploy the function
```bash
supabase functions deploy ai-proxy
```

### Issue: "Missing API key" errors
**Solution:** Check and set secrets
```bash
supabase secrets list
supabase secrets set OPENAI_API_KEY=your-actual-key
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

### One-liner to check everything:
```bash
# Check deployment, secrets, and test
supabase functions list && \
supabase secrets list && \
supabase functions invoke ai-proxy --body '{"providerId": "health-check", "prompt": "test"}'
```

### View live logs while testing:
```bash
# Terminal 1: Watch logs
supabase functions logs ai-proxy --follow

# Terminal 2: Test function
curl -X POST 'https://your-project.supabase.co/functions/v1/ai-proxy' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"providerId": "health-check", "prompt": "test"}'
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
curl -X POST 'https://your-project.supabase.co/functions/v1/ai-proxy' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"providerId": "debug-env", "prompt": "test"}'
```