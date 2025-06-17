# Backend Provider Configuration Guide

## Current Architecture Overview

The ModelShift AI platform supports two provider configuration approaches:

### 1. **Frontend JSON Configuration** (Current Implementation)
- Providers are defined in `src/data/providers.ts`
- API keys stored locally in browser (encrypted)
- Direct API calls from browser (with CORS proxy in development)

### 2. **Backend Configuration** (Recommended for Production)
- Providers configured on Supabase Edge Functions
- API keys stored as Supabase secrets
- Authenticated proxy calls through backend

## Backend Configuration Setup

### Step 1: Configure Supabase Secrets

In your Supabase dashboard, go to **Settings → Edge Functions → Secrets** and add:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-key-here

# Google Gemini Configuration  
GEMINI_API_KEY=AIza-your-gemini-key-here

# Anthropic Claude Configuration
ANTHROPIC_API_KEY=sk-ant-your-claude-key-here

# IBM WatsonX Configuration
IBM_API_KEY=your-ibm-api-key-here
IBM_PROJECT_ID=your-ibm-project-id-here
```

### Step 2: Provider Configuration in Edge Functions

The backend provider configuration is handled in `supabase/functions/ai-proxy/index.ts`:

```typescript
// Provider configurations with backend secrets
const PROVIDERS: Record<string, ProviderConfig> = {
  openai: {
    name: 'OpenAI',
    apiKeyEnvVar: 'OPENAI_API_KEY',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    buildRequest: (prompt: string, model = 'gpt-4', parameters = {}) => ({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
      ...parameters,
    }),
    parseResponse: (response: any) => response?.choices?.[0]?.message?.content || '',
  },
  
  gemini: {
    name: 'Google Gemini',
    apiKeyEnvVar: 'GEMINI_API_KEY',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    buildRequest: (prompt: string, model = 'gemini-2.0-flash', parameters = {}) => ({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.5,
        topP: 1,
        maxOutputTokens: 1000,
        ...parameters,
      },
    }),
    parseResponse: (response: any) => response?.candidates?.[0]?.content?.parts?.[0]?.text || '',
  },
  
  claude: {
    name: 'Anthropic Claude',
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
    endpoint: 'https://api.anthropic.com/v1/messages',
    buildRequest: (prompt: string, model = 'claude-3-sonnet-20240229', parameters = {}) => ({
      model,
      max_tokens: parameters?.max_tokens || 1000,
      messages: [{ role: 'user', content: prompt }],
      temperature: parameters?.temperature || 0.7,
      ...parameters,
    }),
    parseResponse: (response: any) => response?.content?.[0]?.text || '',
    additionalHeaders: {
      'anthropic-version': '2023-06-01'
    }
  },
  
  ibm: {
    name: 'IBM WatsonX',
    apiKeyEnvVar: 'IBM_API_KEY',
    endpoint: 'https://us-south.ml.cloud.ibm.com/ml/v1/text/generation',
    buildRequest: (prompt: string, model = 'ibm/granite-13b-chat-v2', parameters = {}) => ({
      input: prompt,
      model_id: model,
      project_id: Deno.env.get('IBM_PROJECT_ID'),
      parameters: {
        temperature: 0.7,
        max_new_tokens: 500,
        ...parameters,
      },
    }),
    parseResponse: (response: any) => response?.results?.[0]?.generated_text || '',
    requiresProjectId: true
  }
};
```

### Step 3: Dynamic Provider Configuration

For dynamic provider configuration, you can create a database table:

```sql
-- Create provider_configs table
CREATE TABLE provider_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id text NOT NULL,
  config jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE provider_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own provider configs"
  ON provider_configs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Step 4: Enhanced Edge Function with Dynamic Config

```typescript
// Enhanced provider configuration with database support
async function getProviderConfig(providerId: string, userId?: string): Promise<ProviderConfig> {
  // First check for user-specific configuration
  if (userId) {
    const { data: userConfig } = await supabaseClient
      .from('provider_configs')
      .select('config')
      .eq('user_id', userId)
      .eq('provider_id', providerId)
      .eq('is_active', true)
      .single();
    
    if (userConfig) {
      return {
        ...PROVIDERS[providerId],
        ...userConfig.config
      };
    }
  }
  
  // Fallback to default configuration
  return PROVIDERS[providerId];
}
```

## Benefits of Backend Configuration

### 🔒 **Security**
- API keys never exposed to frontend
- Centralized secret management
- No risk of key exposure in browser

### 🚀 **Performance**
- No CORS issues
- Optimized server-to-server calls
- Better error handling and retries

### 📊 **Analytics**
- Centralized logging
- Better usage tracking
- Cost monitoring per user

### 🔧 **Flexibility**
- Dynamic provider configuration
- A/B testing different models
- User-specific customizations

## Migration Path

### Phase 1: Hybrid Mode (Current)
- Frontend configuration for development
- Backend proxy for production
- Automatic fallback between modes

### Phase 2: Backend-First
- Move all provider configs to backend
- Frontend becomes pure UI layer
- Enhanced security and monitoring

### Phase 3: Enterprise Features
- Multi-tenant provider configs
- Custom model deployments
- Advanced routing and load balancing

## Configuration Examples

### Basic Provider Config
```json
{
  "provider_id": "openai",
  "config": {
    "model": "gpt-4-turbo",
    "temperature": 0.8,
    "max_tokens": 2000,
    "custom_endpoint": "https://custom-openai-proxy.com/v1/chat/completions"
  }
}
```

### Advanced Provider Config
```json
{
  "provider_id": "custom_llm",
  "config": {
    "name": "Custom LLM",
    "endpoint": "https://api.custom-llm.com/v1/generate",
    "headers": {
      "Authorization": "Bearer ${CUSTOM_LLM_API_KEY}",
      "X-Custom-Header": "value"
    },
    "request_template": {
      "model": "${model}",
      "prompt": "${prompt}",
      "parameters": "${parameters}"
    },
    "response_path": "data.text",
    "error_path": "error.message"
  }
}
```

## Current Status

✅ **Working Now:**
- Supabase Edge Functions configured
- Basic provider support (OpenAI, Gemini, Claude, IBM)
- Authenticated proxy calls
- Automatic fallback to frontend mode

🔧 **Next Steps:**
1. Add your API keys to Supabase secrets
2. Test the backend proxy mode
3. Optionally add dynamic provider configurations

Would you like me to help you set up the Supabase secrets or implement dynamic provider configurations?