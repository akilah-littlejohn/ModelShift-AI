# Required Supabase Edge Function Secrets

To resolve the authentication timeout errors and enable the AI proxy functionality, you need to configure these four API keys in your Supabase Edge Functions secrets:

## How to Add Secrets

1. Go to your Supabase Dashboard
2. Navigate to **Settings → Edge Functions → Secrets**
3. Add each of the following secrets:

## Required API Keys

### 1. OpenAI API Key
```
OPENAI_API_KEY=sk-your-openai-api-key-here
```
- Get from: https://platform.openai.com/api-keys
- Used for: GPT-4, GPT-3.5-turbo models

### 2. Google Gemini API Key
```
GEMINI_API_KEY=AIza-your-gemini-api-key-here
```
- Get from: https://makersuite.google.com/app/apikey
- Used for: Gemini 2.0 Flash models

### 3. Anthropic Claude API Key
```
ANTHROPIC_API_KEY=sk-ant-your-claude-api-key-here
```
- Get from: https://console.anthropic.com/
- Used for: Claude 3 Sonnet models

### 4. IBM WatsonX API Key & Project ID
```
IBM_API_KEY=your-ibm-api-key-here
IBM_PROJECT_ID=your-ibm-project-id-here
```
- Get from: https://cloud.ibm.com/
- Used for: IBM Granite models
- **Note**: IBM requires both an API key AND a project ID

## Verification

After adding these secrets:

1. The authentication timeouts should resolve
2. The AI proxy Edge Function will work properly
3. Users can use the platform without needing to configure local API keys
4. The "Authenticated Proxy Mode" will be enabled

## Alternative: Local Development

If you don't want to configure server-side keys, users can still:
1. Add their own API keys in the "API Keys" section
2. Use the platform in "Direct Mode" (browser → provider APIs)
3. This bypasses the server proxy but requires users to manage their own keys

## Testing

You can test if the secrets are properly configured by:
1. Signing into your ModelShift AI application
2. Going to the Playground
3. The system should show "Authenticated Proxy Mode Active" if configured correctly
4. Try making a request - it should work without requiring local API keys