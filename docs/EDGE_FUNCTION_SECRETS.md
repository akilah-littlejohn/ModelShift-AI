# Required Supabase Edge Function Secrets

To enable the AI proxy functionality with server-side API keys, you need to configure these API keys in your Supabase Edge Functions secrets. **Note: These are optional - users can also add their own API keys in the application's API Keys section.**

## How to Add Secrets

1. Go to your Supabase Dashboard
2. Navigate to **Settings → Edge Functions → Secrets**
3. Add each of the following secrets:

## Optional Server-Side API Keys

### 1. OpenAI API Key (Optional)
```
OPENAI_API_KEY=sk-your-openai-api-key-here
```
- Get from: https://platform.openai.com/api-keys
- Used for: GPT-4, GPT-3.5-turbo models
- **If not configured**: Users must add their own OpenAI API key in the API Keys section

### 2. Google Gemini API Key (Optional)
```
GEMINI_API_KEY=AIza-your-gemini-api-key-here
```
- Get from: https://makersuite.google.com/app/apikey
- Used for: Gemini 2.0 Flash models
- **If not configured**: Users must add their own Gemini API key in the API Keys section

### 3. Anthropic Claude API Key (Optional)
```
ANTHROPIC_API_KEY=sk-ant-your-claude-api-key-here
```
- Get from: https://console.anthropic.com/
- Used for: Claude 3 Sonnet models
- **If not configured**: Users must add their own Claude API key in the API Keys section

### 4. IBM WatsonX API Key & Project ID (Optional)
```
IBM_API_KEY=your-ibm-api-key-here
IBM_PROJECT_ID=your-ibm-project-id-here
```
- Get from: https://cloud.ibm.com/
- Used for: IBM Granite models
- **Note**: IBM requires both an API key AND a project ID
- **If not configured**: Users must add their own IBM API key and Project ID in the API Keys section

## How It Works

The application supports **two modes** for API key management:

### 1. Server-Side Keys (Recommended for Production)
- Configure API keys as Supabase Edge Function secrets
- Users don't need to manage their own API keys
- More secure as keys are stored server-side
- Centralized billing and usage management

### 2. User-Managed Keys (Recommended for Development)
- Users add their own API keys in the "API Keys" section
- Keys are encrypted and stored per-user
- Users have full control over their API usage and billing
- Works even without server-side configuration

### 3. Hybrid Mode (Best of Both)
- Configure some providers server-side, let users add others
- Users can override server keys with their own keys
- Fallback system: user key → server key → error

## Priority Order

The system checks for API keys in this order:

1. **User's API Key** (if user has added one in API Keys section)
2. **Server-Side API Key** (if configured in Edge Function secrets)
3. **Error** (if neither is available)

## Testing

You can test if the secrets are properly configured by:

1. **Check Connection Status**: Go to Settings → Connection Mode → "Check Status"
2. **View Configured Providers**: The status will show which providers have server-side keys
3. **Test API Calls**: Try making requests in the Playground

## Alternative: User-Only Mode

If you prefer not to configure server-side keys:

1. Users can add their own API keys in the "API Keys" section
2. The system will use user keys exclusively
3. This is perfect for development, testing, or when users want full control

## Benefits of Each Approach

### Server-Side Keys
- ✅ Users don't need to manage API keys
- ✅ Centralized billing and usage control
- ✅ More secure (keys not exposed to browser)
- ✅ Easier onboarding for new users
- ❌ Requires server configuration
- ❌ All usage goes through your accounts

### User-Managed Keys
- ✅ Users control their own billing
- ✅ No server configuration needed
- ✅ Users can use their own rate limits
- ✅ More transparent usage tracking
- ❌ Users must obtain and manage API keys
- ❌ More complex onboarding

### Hybrid Approach (Recommended)
- ✅ Best of both worlds
- ✅ Fallback system ensures reliability
- ✅ Users can override with their own keys
- ✅ Flexible deployment options