import type { Provider } from '../types';

export const providers: Provider[] = [
  {
    id: 'openai',
    name: 'openai',
    displayName: 'OpenAI GPT-4',
    icon: '🤖',
    color: '#10A37F',
    keyRequirements: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'sk-...',
        required: true
      }
    ],
    capabilities: {
      streaming: true,
      maxTokens: 4096,
      pricing: {
        input: 0.03,
        output: 0.06
      }
    },
    isAvailable: true,
    apiConfig: {
      baseUrl: 'https://api.openai.com',
      endpointPath: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      authHeaderName: 'Authorization',
      authHeaderPrefix: 'Bearer ',
      requestBodyStructure: {
        model: 'gpt-4',
        messages: [{ role: 'user', content: '' }],
        temperature: 0.7,
        max_tokens: 1000
      },
      promptJsonPath: 'messages[0].content',
      modelJsonPath: 'model',
      parametersJsonPath: '', // Parameters are merged at root level
      responseJsonPath: 'choices[0].message.content',
      errorJsonPath: 'error.message',
      defaultModel: 'gpt-4',
      defaultParameters: {
        temperature: 0.7,
        max_tokens: 1000
      }
    }
  },
  {
    id: 'gemini',
    name: 'gemini',
    displayName: 'Google Gemini 2.0 Flash',
    icon: '✨',
    color: '#4285F4',
    keyRequirements: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'AIza...',
        required: true
      }
    ],
    capabilities: {
      streaming: true,
      maxTokens: 2048,
      pricing: {
        input: 0.0005,
        output: 0.0015
      }
    },
    isAvailable: true,
    apiConfig: {
      baseUrl: 'https://generativelanguage.googleapis.com',
      endpointPath: '/v1beta/models/gemini-2.0-flash:generateContent',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      apiKeyInUrlParam: true,
      urlParamName: 'key',
      requestBodyStructure: {
        contents: [{ role: 'user', parts: [{ text: '' }] }],
        generationConfig: {
          temperature: 0.5,
          topP: 1
          // Removed maxOutputTokens from here to avoid duplication
        }
      },
      promptJsonPath: 'contents[0].parts[0].text',
      parametersJsonPath: 'generationConfig',
      responseJsonPath: 'candidates[0].content.parts[0].text',
      errorJsonPath: 'error.message',
      defaultModel: 'gemini-2.0-flash',
      defaultParameters: {
        temperature: 0.5,
        topP: 1,
        maxOutputTokens: 1000
      }
    }
  },
  {
    id: 'claude',
    name: 'claude',
    displayName: 'Anthropic Claude',
    icon: '🧠',
    color: '#D97706',
    keyRequirements: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'sk-ant-...',
        required: true
      }
    ],
    capabilities: {
      streaming: true,
      maxTokens: 4096,
      pricing: {
        input: 0.015,
        output: 0.075
      }
    },
    isAvailable: true,
    apiConfig: {
      baseUrl: 'https://api.anthropic.com',
      endpointPath: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      authHeaderName: 'x-api-key',
      authHeaderPrefix: '',
      requestBodyStructure: {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [{ role: 'user', content: '' }]
      },
      promptJsonPath: 'messages[0].content',
      modelJsonPath: 'model',
      parametersJsonPath: '', // Parameters are merged at root level
      responseJsonPath: 'content[0].text',
      errorJsonPath: 'error.message',
      defaultModel: 'claude-3-sonnet-20240229',
      defaultParameters: {
        max_tokens: 1000,
        temperature: 0.7
      }
    }
  },
  {
    id: 'ibm',
    name: 'ibm',
    displayName: 'IBM WatsonX',
    icon: '💼',
    color: '#054ADA',
    keyRequirements: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your IBM API key',
        required: true
      },
      {
        name: 'projectId',
        label: 'Project ID',
        type: 'text',
        placeholder: 'Enter your IBM Project ID',
        required: true
      }
    ],
    capabilities: {
      streaming: false,
      maxTokens: 2048,
      pricing: {
        input: 0.02,
        output: 0.04
      }
    },
    isAvailable: true,
    apiConfig: {
      baseUrl: 'https://us-south.ml.cloud.ibm.com',
      endpointPath: '/ml/v1/text/generation',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      authHeaderName: 'Authorization',
      authHeaderPrefix: 'Bearer ',
      requestBodyStructure: {
        input: '',
        model_id: 'ibm/granite-13b-chat-v2',
        project_id: '',
        parameters: {
          temperature: 0.7,
          max_new_tokens: 500
        }
      },
      promptJsonPath: 'input',
      modelJsonPath: 'model_id',
      projectIdJsonPath: 'project_id',
      parametersJsonPath: 'parameters',
      responseJsonPath: 'results[0].generated_text',
      errorJsonPath: 'error.message',
      defaultModel: 'ibm/granite-13b-chat-v2',
      defaultParameters: {
        temperature: 0.7,
        max_new_tokens: 500
      }
    }
  }
];

export function getProvider(id: string): Provider | undefined {
  return providers.find(p => p.id === id);
}

export function getAvailableProviders(): Provider[] {
  return providers.filter(p => p.isAvailable);
}