# Edge Function Testing Guide

## Testing the AI Proxy Function

After deploying the Edge Functions to your Supabase project, you can test them to ensure they're working correctly.

### Method 1: Using the Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions** in the left sidebar
3. Click on the `ai-proxy` function
4. Click the **Invoke** button
5. Use the following test payload:
   ```json
   {
     "providerId": "health-check",
     "prompt": "test"
   }
   ```
6. Click **Invoke Function**
7. You should see a successful response with status information

### Method 2: Using cURL

You can test the function using cURL from your terminal:

```bash
curl -X POST 'https://your-project-id.supabase.co/functions/v1/ai-proxy' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"providerId": "health-check", "prompt": "test"}'
```

Replace `your-project-id` with your actual Supabase project ID and `YOUR_ANON_KEY` with your Supabase anon key.

### Method 3: Using the Application

The easiest way to test is directly in the application:

1. Go to **Settings** → **Connection Mode**
2. Select **Server Proxy Mode**
3. Click **Check Status**
4. You should see "Server connected" if everything is working correctly

## Testing the Generate Embedding Function

To test the `generate-embedding` function:

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions** in the left sidebar
3. Click on the `generate-embedding` function
4. Click the **Invoke** button
5. Use the following test payload:
   ```json
   {
     "textToEmbed": "This is a test document for embedding generation",
     "chunkId": "some-uuid-here"
   }
   ```
6. Click **Invoke Function**
7. You should see a response indicating whether the embedding was generated successfully

## Testing the Search Knowledge Base Function

To test the `search-knowledge-base` function:

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions** in the left sidebar
3. Click on the `search-knowledge-base` function
4. Click the **Invoke** button
5. Use the following test payload:
   ```json
   {
     "query": "test query",
     "knowledgeBaseId": "some-uuid-here",
     "limit": 5,
     "similarityThreshold": 0.7
   }
   ```
6. Click **Invoke Function**
7. You should see a response with search results or an appropriate error message

## Troubleshooting

If you encounter issues with the Edge Functions:

### 404 Not Found Error

- Make sure the function is deployed with the correct name
- Check the Supabase Dashboard to verify the function exists
- Ensure you're using the correct URL for your Supabase project

### Authentication Error

- Check that you're including the correct Authorization header
- Verify that you're using a valid Supabase token
- Make sure you're signed in to the application

### API Key Errors

- Verify that you've added the correct API keys as secrets in the Supabase Dashboard
- Check the function logs for any errors related to missing or invalid API keys

### CORS Errors

- The Edge Functions include CORS headers to allow cross-origin requests
- If you're still seeing CORS errors, check your browser console for more details
- Make sure your Supabase project allows requests from your application domain

### Viewing Function Logs

To view the logs for your Edge Functions:

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions** in the left sidebar
3. Click on the function you want to check
4. Click the **Logs** tab
5. You'll see the most recent logs for the function

These logs can be invaluable for diagnosing issues with your Edge Functions.