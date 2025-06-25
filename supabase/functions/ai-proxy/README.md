# AI Proxy Edge Function

This Edge Function serves as a secure proxy between the frontend and various AI providers (OpenAI, Google Gemini, Anthropic Claude, IBM WatsonX).

## Key Features

- **Secure API Key Management**: Handles both server-side API keys (stored in Supabase secrets) and user-managed API keys (stored in the `user_api_keys` table)
- **Provider Abstraction**: Provides a unified interface for multiple AI providers
- **Authentication**: Ensures all requests are properly authenticated
- **Error Handling**: Provides detailed error messages for troubleshooting
- **Metrics**: Tracks response time, token usage, and estimated costs
- **Health Check**: Provides a health check endpoint to verify configuration

## Configuration

### Required Secrets

Set these in your Supabase Dashboard under Settings → Edge Functions → Secrets:

```bash
# Supabase Configuration (automatically available)
# SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY

# AI Provider API Keys (optional - users can provide their own)
OPENAI_API_KEY=sk-your-openai-key
GEMINI_API_KEY=AIza-your-gemini-key
ANTHROPIC_API_KEY=sk-ant-your-claude-key
IBM_API_KEY=your-ibm-key
IBM_PROJECT_ID=your-ibm-project-id

# Optional: Custom encryption key for API keys
ENCRYPTION_KEY=your-custom-encryption-key
```

### Provider Support

The function supports the following AI providers:

- **OpenAI**: GPT-4 and other OpenAI models
- **Google Gemini**: Gemini 2.0 Flash and other Gemini models
- **Anthropic Claude**: Claude 3 Sonnet and other Claude models
- **IBM WatsonX**: Granite and other IBM models

## Usage

### Request Format

```json
{
  "providerId": "openai",
  "prompt": "Your prompt text here",
  "model": "gpt-4",
  "parameters": {
    "temperature": 0.7,
    "max_tokens": 1000
  },
  "agentId": "optional-agent-id",
  "userId": "user-id",
  "useUserKey": true
}
```

### Response Format

```json
{
  "success": true,
  "response": "AI generated response text",
  "provider": "openai",
  "model": "gpt-4",
  "requestId": "req_1234567890",
  "using_user_key": true,
  "metrics": {
    "responseTime": 1234,
    "tokens": 567,
    "cost": 0.0123,
    "timestamp": "2024-06-25T12:34:56.789Z"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Detailed error message",
  "provider": "unknown",
  "requestId": "req_1234567890",
  "metrics": {
    "responseTime": 123,
    "timestamp": "2024-06-25T12:34:56.789Z"
  }
}
```

## Health Check

You can check the status of the function and which providers are configured by sending a request with `providerId: "health-check"`:

```json
{
  "providerId": "health-check",
  "prompt": "test",
  "userId": "user-id"
}
```

This will return information about which providers have API keys configured on the server:

```json
{
  "success": true,
  "configuredProviders": ["openai", "gemini"],
  "errors": [
    "Anthropic Claude: Missing ANTHROPIC_API_KEY in Supabase secrets",
    "IBM WatsonX: Missing IBM_API_KEY in Supabase secrets"
  ],
  "requestId": "req_1234567890",
  "serverInfo": {
    "timestamp": "2024-06-25T12:34:56.789Z",
    "environment": "production",
    "version": "1.0.1"
  }
}
```

## Security Considerations

- All requests must include a valid Supabase authentication token
- User API keys are encrypted before storage and decrypted on-the-fly
- The function uses the Supabase service role key to access the database
- CORS headers are properly configured to allow cross-origin requests

## Error Handling

The function includes detailed error handling for various scenarios:

- Authentication failures
- Missing or invalid API keys
- Provider API errors
- Network timeouts
- Rate limiting
- Server errors

Each error response includes a detailed message to help diagnose the issue.

## Debugging

Check the Supabase Edge Function logs for detailed information about requests and errors:

```bash
supabase functions logs ai-proxy --follow
```

## Performance Optimization

- Requests have a 60-second timeout to prevent hanging connections
- Token usage and cost are estimated for analytics
- Analytics events are logged asynchronously to avoid impacting response time