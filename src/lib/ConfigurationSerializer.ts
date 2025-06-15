import type { SerializedConfig, ConfigValidationResult } from '../types';
import { providers } from '../data/providers';
import { keyVault } from './encryption';
import { AgentService } from './agents';
import { providerConfigs } from './modelshift-ai-sdk';

export class ConfigurationSerializer {
  private static readonly CURRENT_VERSION = '1.0.0';

  /**
   * Serialize a configuration for export
   */
  static serialize(
    providerId: string,
    options: {
      agentId?: string;
      includeKeys?: boolean;
      customModel?: string;
      customParameters?: Record<string, any>;
      description?: string;
    } = {}
  ): string {
    const { agentId, includeKeys = false, customModel, customParameters, description } = options;

    // Get provider info
    const provider = providers.find(p => p.id === providerId);
    if (!provider) {
      throw new Error(`Provider '${providerId}' not found`);
    }

    // Get key data
    const keyData = keyVault.retrieve(providerId);
    if (!keyData && includeKeys) {
      throw new Error(`No API keys found for provider '${providerId}'`);
    }

    // Prepare key data for serialization
    let serializedKeyData: Record<string, string> = {};
    if (includeKeys && keyData) {
      serializedKeyData = { ...keyData };
    } else {
      // Use placeholders for security
      provider.keyRequirements.forEach(req => {
        serializedKeyData[req.name] = `YOUR_${providerId.toUpperCase()}_${req.name.toUpperCase()}`;
      });
    }

    // Get agent info if specified
    let promptTemplate: string | undefined;
    if (agentId) {
      const agent = AgentService.getAgent(agentId);
      if (agent) {
        promptTemplate = agent.promptTemplate;
      }
    }

    // Get default model and parameters
    const providerConfig = providerConfigs[providerId];
    const defaultModel = customModel || provider.defaultModel || providerConfig?.defaultModel;
    const defaultParameters = customParameters || provider.defaultParameters || providerConfig?.defaultParameters;

    const config: SerializedConfig = {
      version: this.CURRENT_VERSION,
      providerId,
      keyData: serializedKeyData,
      agentId,
      promptTemplate,
      model: defaultModel,
      parameters: defaultParameters,
      metadata: {
        exportedAt: new Date().toISOString(),
        description: description || `Configuration for ${provider.displayName}${agentId ? ` with ${AgentService.getAgent(agentId)?.name || agentId} agent` : ''}`
      }
    };

    return JSON.stringify(config, null, 2);
  }

  /**
   * Deserialize a configuration from JSON
   */
  static deserialize(configJson: string): SerializedConfig {
    try {
      const config = JSON.parse(configJson) as SerializedConfig;
      
      // Validate the configuration
      const validation = this.validate(config);
      if (!validation.isValid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      return config;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format');
      }
      throw error;
    }
  }

  /**
   * Validate a serialized configuration
   */
  static validate(config: SerializedConfig): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!config.providerId) {
      errors.push('Provider ID is required');
    }

    if (!config.keyData || typeof config.keyData !== 'object') {
      errors.push('Key data is required and must be an object');
    }

    // Validate provider exists
    const provider = providers.find(p => p.id === config.providerId);
    if (!provider) {
      errors.push(`Unknown provider: ${config.providerId}`);
    } else {
      // Check required key fields
      const missingKeys = provider.keyRequirements
        .filter(req => req.required)
        .filter(req => !config.keyData[req.name] || !config.keyData[req.name].trim())
        .map(req => req.label);

      if (missingKeys.length > 0) {
        errors.push(`Missing required keys: ${missingKeys.join(', ')}`);
      }

      // Check for placeholder values
      const hasPlaceholders = Object.values(config.keyData).some(value => 
        value.startsWith('YOUR_') && value.includes('_API_KEY')
      );
      
      if (hasPlaceholders) {
        warnings.push('Configuration contains placeholder values - replace with actual API keys before use');
      }
    }

    // Validate agent if specified
    if (config.agentId) {
      const agent = AgentService.getAgent(config.agentId);
      if (!agent) {
        warnings.push(`Agent '${config.agentId}' not found - will be ignored`);
      }
    }

    // Version compatibility check
    if (config.version && config.version !== this.CURRENT_VERSION) {
      warnings.push(`Configuration version ${config.version} may not be fully compatible with current version ${this.CURRENT_VERSION}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate code snippets for different languages/frameworks
   */
  static generateCodeSnippets(config: SerializedConfig): Record<string, string> {
    const snippets: Record<string, string> = {};

    // TypeScript/JavaScript (Node.js)
    snippets.typescript = this.generateTypeScriptSnippet(config);
    
    // Python
    snippets.python = this.generatePythonSnippet(config);
    
    // Next.js API Route
    snippets.nextjs = this.generateNextJSSnippet(config);
    
    // Express.js
    snippets.express = this.generateExpressSnippet(config);
    
    // Django
    snippets.django = this.generateDjangoSnippet(config);
    
    // cURL
    snippets.curl = this.generateCurlSnippet(config);

    return snippets;
  }

  private static generateTypeScriptSnippet(config: SerializedConfig): string {
    const { providerId, keyData, promptTemplate, model, parameters } = config;
    
    return `// TypeScript/Node.js Implementation
import fetch from 'node-fetch';

interface SerializedConfig {
  providerId: string;
  keyData: Record<string, string>;
  promptTemplate?: string;
  model?: string;
  parameters?: Record<string, any>;
}

const config: SerializedConfig = ${JSON.stringify(config, null, 2)};

async function generateResponse(input: string): Promise<string> {
  const { providerId, keyData, promptTemplate, model, parameters } = config;
  
  let finalPrompt = input;
  if (promptTemplate) {
    finalPrompt = promptTemplate.replace(/\\{input\\}/g, input);
  }

  ${this.generateProviderLogic(config)}

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }

    const data = await response.json();
    return parseResponse(data);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Example usage
generateResponse("${promptTemplate ? 'Your input here' : 'Hello, how are you?'}")
  .then(result => console.log(result))
  .catch(error => console.error(error));`;
  }

  private static generatePythonSnippet(config: SerializedConfig): string {
    return `# Python Implementation
import requests
import json

config = ${JSON.stringify(config, null, 4).replace(/"/g, '"')}

def generate_response(user_input: str) -> str:
    provider_id = config['providerId']
    key_data = config['keyData']
    prompt_template = config.get('promptTemplate', '{input}')
    model = config.get('model')
    parameters = config.get('parameters')
    
    final_prompt = prompt_template.replace('{input}', user_input)
    
    ${this.generatePythonProviderLogic(config)}
    
    try:
        response = requests.post(endpoint, headers=headers, json=body, timeout=30)
        response.raise_for_status()
        data = response.json()
        return parse_response(data)
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        raise e

# Example usage
if __name__ == "__main__":
    try:
        result = generate_response("${config.promptTemplate ? 'Your input here' : 'Hello, how are you?'}")
        print(result)
    except Exception as e:
        print(f"Failed: {e}")`;
  }

  private static generateNextJSSnippet(config: SerializedConfig): string {
    return `// Next.js API Route (pages/api/generate.ts)
import type { NextApiRequest, NextApiResponse } from 'next';

const config = ${JSON.stringify(config, null, 2)};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { input } = req.body;
  if (!input) {
    return res.status(400).json({ error: 'Input is required' });
  }

  try {
    const { providerId, keyData, promptTemplate, model, parameters } = config;
    
    let finalPrompt = input;
    if (promptTemplate) {
      finalPrompt = promptTemplate.replace(/\\{input\\}/g, input);
    }

    ${this.generateProviderLogic(config)}

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }

    const data = await response.json();
    const result = parseResponse(data);
    
    res.status(200).json({ response: result });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
}`;
  }

  private static generateExpressSnippet(config: SerializedConfig): string {
    return `// Express.js Implementation
const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());

const config = ${JSON.stringify(config, null, 2)};

app.post('/api/generate', async (req, res) => {
  try {
    const { input } = req.body;
    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }

    const { providerId, keyData, promptTemplate, model, parameters } = config;
    
    let finalPrompt = input;
    if (promptTemplate) {
      finalPrompt = promptTemplate.replace(/\\{input\\}/g, input);
    }

    ${this.generateProviderLogic(config)}

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }

    const data = await response.json();
    const result = parseResponse(data);
    
    res.json({ response: result });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`;
  }

  private static generateDjangoSnippet(config: SerializedConfig): string {
    return `# Django Views (views.py)
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import requests
import json

config = ${JSON.stringify(config, null, 4).replace(/"/g, '"')}

@csrf_exempt
@require_http_methods(["POST"])
def generate_response(request):
    try:
        data = json.loads(request.body)
        user_input = data.get('input')
        
        if not user_input:
            return JsonResponse({"error": "Input is required"}, status=400)
        
        provider_id = config['providerId']
        key_data = config['keyData']
        prompt_template = config.get('promptTemplate', '{input}')
        model = config.get('model')
        parameters = config.get('parameters')
        
        final_prompt = prompt_template.replace('{input}', user_input)
        
        ${this.generatePythonProviderLogic(config)}
        
        response = requests.post(endpoint, headers=headers, json=body, timeout=30)
        response.raise_for_status()
        data = response.json()
        result = parse_response(data)
        
        return JsonResponse({"response": result})
        
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

# urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('api/generate/', views.generate_response, name='generate'),
]`;
  }

  private static generateCurlSnippet(config: SerializedConfig): string {
    const { providerId, keyData, model, parameters } = config;
    
    let endpoint = '';
    let headers: string[] = [];
    let body: any = {};

    switch (providerId) {
      case 'openai':
        endpoint = 'https://api.openai.com/v1/chat/completions';
        headers = [`"Authorization: Bearer ${keyData.apiKey}"`, '"Content-Type: application/json"'];
        body = {
          model: model || 'gpt-4',
          messages: [{ role: 'user', content: 'Your prompt here' }],
          ...(parameters || { temperature: 0.7, max_tokens: 1000 })
        };
        break;
      case 'gemini':
        endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.0-flash'}:generateContent?key=${keyData.apiKey}`;
        headers = ['"Content-Type: application/json"'];
        body = {
          contents: [{ role: 'user', parts: [{ text: 'Your prompt here' }] }],
          generationConfig: parameters || { temperature: 0.5, topP: 1, maxOutputTokens: 1000 }
        };
        break;
      case 'claude':
        endpoint = 'https://api.anthropic.com/v1/messages';
        headers = [`"x-api-key: ${keyData.apiKey}"`, '"anthropic-version: 2023-06-01"', '"Content-Type: application/json"'];
        body = {
          model: model || 'claude-3-sonnet-20240229',
          max_tokens: parameters?.max_tokens || 1000,
          messages: [{ role: 'user', content: 'Your prompt here' }]
        };
        break;
      case 'ibm':
        endpoint = 'https://us-south.ml.cloud.ibm.com/ml/v1/text/generation';
        headers = [`"Authorization: Bearer ${keyData.apiKey}"`, '"Content-Type: application/json"'];
        body = {
          input: 'Your prompt here',
          model_id: model || 'ibm/granite-13b-chat-v2',
          project_id: keyData.projectId,
          parameters: parameters || { temperature: 0.7, max_new_tokens: 500 }
        };
        break;
    }

    return `# cURL Example for ${providerId}
curl -X POST "${endpoint}" \\
${headers.map(h => `  -H ${h}`).join(' \\\n')} \\
  -d '${JSON.stringify(body, null, 2)}'`;
  }

  private static generateProviderLogic(config: SerializedConfig): string {
    const { providerId, keyData, model, parameters } = config;

    switch (providerId) {
      case 'openai':
        return `
    const endpoint = 'https://api.openai.com/v1/chat/completions';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${keyData.apiKey}\`
    };
    const body = {
      model: model || 'gpt-4',
      messages: [{ role: 'user', content: finalPrompt }],
      ...(parameters || { temperature: 0.7, max_tokens: 1000 })
    };
    const parseResponse = (data: any) => data?.choices?.[0]?.message?.content ?? '';`;

      case 'gemini':
        return `
    const endpoint = \`https://generativelanguage.googleapis.com/v1beta/models/\${model || 'gemini-2.0-flash'}:generateContent?key=\${keyData.apiKey}\`;
    const headers = { 'Content-Type': 'application/json' };
    const body = {
      contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
      generationConfig: parameters || { temperature: 0.5, topP: 1, maxOutputTokens: 1000 }
    };
    const parseResponse = (data: any) => data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';`;

      case 'claude':
        return `
    const endpoint = 'https://api.anthropic.com/v1/messages';
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': keyData.apiKey,
      'anthropic-version': '2023-06-01'
    };
    const body = {
      model: model || 'claude-3-sonnet-20240229',
      max_tokens: parameters?.max_tokens || 1000,
      messages: [{ role: 'user', content: finalPrompt }]
    };
    const parseResponse = (data: any) => data?.content?.[0]?.text ?? '';`;

      case 'ibm':
        return `
    const endpoint = 'https://us-south.ml.cloud.ibm.com/ml/v1/text/generation';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${keyData.apiKey}\`
    };
    const body = {
      input: finalPrompt,
      model_id: model || 'ibm/granite-13b-chat-v2',
      project_id: keyData.projectId,
      parameters: parameters || { temperature: 0.7, max_new_tokens: 500 }
    };
    const parseResponse = (data: any) => data?.results?.[0]?.generated_text ?? '';`;

      default:
        return `
    throw new Error('Unsupported provider: ${providerId}');`;
    }
  }

  private static generatePythonProviderLogic(config: SerializedConfig): string {
    const { providerId, keyData, model, parameters } = config;

    switch (providerId) {
      case 'openai':
        return `
    endpoint = 'https://api.openai.com/v1/chat/completions'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f"Bearer {key_data['apiKey']}"
    }
    body = {
        'model': model or 'gpt-4',
        'messages': [{'role': 'user', 'content': final_prompt}],
        **(parameters if parameters else {'temperature': 0.7, 'max_tokens': 1000})
    }
    parse_response = lambda data: data.get('choices', [{}])[0].get('message', {}).get('content', '')`;

      case 'gemini':
        return `
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model or 'gemini-2.0-flash'}:generateContent?key={key_data['apiKey']}"
    headers = {'Content-Type': 'application/json'}
    body = {
        'contents': [{'role': 'user', 'parts': [{'text': final_prompt}]}],
        'generationConfig': parameters if parameters else {'temperature': 0.5, 'topP': 1, 'maxOutputTokens': 1000}
    }
    parse_response = lambda data: data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')`;

      case 'claude':
        return `
    endpoint = 'https://api.anthropic.com/v1/messages'
    headers = {
        'Content-Type': 'application/json',
        'x-api-key': key_data['apiKey'],
        'anthropic-version': '2023-06-01'
    }
    body = {
        'model': model or 'claude-3-sonnet-20240229',
        'max_tokens': parameters.get('max_tokens') if parameters else 1000,
        'messages': [{'role': 'user', 'content': final_prompt}]
    }
    parse_response = lambda data: data.get('content', [{}])[0].get('text', '')`;

      case 'ibm':
        return `
    endpoint = 'https://us-south.ml.cloud.ibm.com/ml/v1/text/generation'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f"Bearer {key_data['apiKey']}"
    }
    body = {
        'input': final_prompt,
        'model_id': model or 'ibm/granite-13b-chat-v2',
        'project_id': key_data['projectId'],
        'parameters': parameters if parameters else {'temperature': 0.7, 'max_new_tokens': 500}
    }
    parse_response = lambda data: data.get('results', [{}])[0].get('generated_text', '')`;

      default:
        return `
    raise ValueError(f"Unsupported provider: {providerId}")`;
    }
  }

  /**
   * Sanitize configuration for safe sharing (removes sensitive data)
   */
  static sanitize(config: SerializedConfig): SerializedConfig {
    const sanitized = { ...config };
    
    // Replace actual keys with placeholders
    const provider = providers.find(p => p.id === config.providerId);
    if (provider) {
      sanitized.keyData = {};
      provider.keyRequirements.forEach(req => {
        sanitized.keyData[req.name] = `YOUR_${config.providerId.toUpperCase()}_${req.name.toUpperCase()}`;
      });
    }

    return sanitized;
  }
}