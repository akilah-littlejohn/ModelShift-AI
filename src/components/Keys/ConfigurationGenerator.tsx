import React, { useState } from 'react';
import { Copy, Check, Code, Download, Eye, EyeOff } from 'lucide-react';
import { providers } from '../../data/providers';
import { keyVault } from '../../lib/encryption';
import toast from 'react-hot-toast';

interface ConfigurationGeneratorProps {
  provider: string;
  onClose: () => void;
}

export function ConfigurationGenerator({ provider, onClose }: ConfigurationGeneratorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [selectedFramework, setSelectedFramework] = useState('vanilla');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState(false);

  const providerData = providers.find(p => p.id === provider);
  const keyData = keyVault.retrieve(provider);

  if (!providerData || !keyData) {
    return null;
  }

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      toast.success('Code copied to clipboard!');
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const generateConfiguration = () => {
    const configs = {
      javascript: {
        vanilla: generateVanillaJS(),
        react: generateReact(),
        node: generateNodeJS(),
        express: generateExpress()
      },
      python: {
        vanilla: generatePython(),
        flask: generateFlask(),
        django: generateDjango(),
        fastapi: generateFastAPI()
      },
      curl: {
        vanilla: generateCurl()
      }
    };

    return configs[selectedLanguage as keyof typeof configs]?.[selectedFramework] || '';
  };

  const generateVanillaJS = () => {
    const headers = generateHeaders();
    const body = generateRequestBody();

    return `// ${providerData.displayName} Configuration
const ${provider}Config = {
  endpoint: '${getEndpoint()}',
  headers: ${JSON.stringify(headers, null, 2)},
  model: '${getModel()}'
};

// Function to call ${providerData.displayName} API
async function call${providerData.displayName.replace(/\s+/g, '')}(prompt) {
  try {
    const response = await fetch(${provider}Config.endpoint, {
      method: 'POST',
      headers: ${provider}Config.headers,
      body: JSON.stringify(${JSON.stringify(body, null, 2).replace('"{{PROMPT}}"', 'prompt')})
    });

    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }

    const data = await response.json();
    return ${generateResponseParser()};
  } catch (error) {
    console.error('Error calling ${providerData.displayName}:', error);
    throw error;
  }
}

// Example usage
call${providerData.displayName.replace(/\s+/g, '')}("Hello, how are you?")
  .then(response => console.log(response))
  .catch(error => console.error(error));`;
  };

  const generateReact = () => {
    return `import React, { useState } from 'react';

// ${providerData.displayName} Hook
const use${providerData.displayName.replace(/\s+/g, '')} = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const config = {
    endpoint: '${getEndpoint()}',
    headers: ${JSON.stringify(generateHeaders(), null, 4)},
    model: '${getModel()}'
  };

  const generate = async (prompt) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify(${JSON.stringify(generateRequestBody(), null, 6).replace('"{{PROMPT}}"', 'prompt')})
      });

      if (!response.ok) {
        throw new Error(\`HTTP error! status: \${response.status}\`);
      }

      const data = await response.json();
      return ${generateResponseParser()};
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { generate, loading, error };
};

// Example Component
const AIChat = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const { generate, loading, error } = use${providerData.displayName.replace(/\s+/g, '')}();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await generate(prompt);
      setResponse(result);
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt..."
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </form>
      {error && <div style={{color: 'red'}}>Error: {error}</div>}
      {response && <div><strong>Response:</strong> {response}</div>}
    </div>
  );
};

export default AIChat;`;
  };

  const generateNodeJS = () => {
    return `// ${providerData.displayName} Node.js Configuration
const https = require('https');

class ${providerData.displayName.replace(/\s+/g, '')}Client {
  constructor() {
    this.config = {
      endpoint: '${getEndpoint()}',
      headers: ${JSON.stringify(generateHeaders(), null, 6)},
      model: '${getModel()}'
    };
  }

  async generate(prompt) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(${JSON.stringify(generateRequestBody(), null, 6).replace('"{{PROMPT}}"', 'prompt')});

      const options = {
        method: 'POST',
        headers: {
          ...this.config.headers,
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(this.config.endpoint, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            const result = ${generateResponseParser()};
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }
}

// Example usage
const client = new ${providerData.displayName.replace(/\s+/g, '')}Client();

client.generate("Hello, how are you?")
  .then(response => console.log(response))
  .catch(error => console.error('Error:', error));

module.exports = ${providerData.displayName.replace(/\s+/g, '')}Client;`;
  };

  const generateExpress = () => {
    return `// ${providerData.displayName} Express.js Integration
const express = require('express');
const https = require('https');
const app = express();

app.use(express.json());

// ${providerData.displayName} Configuration
const ${provider}Config = {
  endpoint: '${getEndpoint()}',
  headers: ${JSON.stringify(generateHeaders(), null, 2)},
  model: '${getModel()}'
};

// Helper function to call ${providerData.displayName}
async function call${providerData.displayName.replace(/\s+/g, '')}(prompt) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(${JSON.stringify(generateRequestBody(), null, 4).replace('"{{PROMPT}}"', 'prompt')});

    const options = {
      method: 'POST',
      headers: {
        ...${provider}Config.headers,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(${provider}Config.endpoint, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(${generateResponseParser()});
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// API Endpoint
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await call${providerData.displayName.replace(/\s+/g, '')}(prompt);
    res.json({ response });
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`;
  };

  const generatePython = () => {
    return `# ${providerData.displayName} Python Configuration
import requests
import json

class ${providerData.displayName.replace(/\s+/g, '')}Client:
    def __init__(self):
        self.config = {
            "endpoint": "${getEndpoint()}",
            "headers": ${JSON.stringify(generateHeaders(), null, 12).replace(/"/g, '"')},
            "model": "${getModel()}"
        }
    
    def generate(self, prompt):
        """Generate response using ${providerData.displayName}"""
        try:
            payload = ${JSON.stringify(generateRequestBody(), null, 12).replace('"{{PROMPT}}"', 'prompt').replace(/"/g, '"')}
            
            response = requests.post(
                self.config["endpoint"],
                headers=self.config["headers"],
                json=payload,
                timeout=30
            )
            
            response.raise_for_status()
            data = response.json()
            
            return ${generateResponseParser().replace(/\?\.|\?\[/g, '.get(').replace(/\]/g, ')')}
            
        except requests.exceptions.RequestException as e:
            print(f"Error calling ${providerData.displayName}: {e}")
            raise e

# Example usage
if __name__ == "__main__":
    client = ${providerData.displayName.replace(/\s+/g, '')}Client()
    
    try:
        result = client.generate("Hello, how are you?")
        print(f"Response: {result}")
    except Exception as e:
        print(f"Error: {e}")`;
  };

  const generateFlask = () => {
    return `# ${providerData.displayName} Flask Integration
from flask import Flask, request, jsonify
import requests
import json

app = Flask(__name__)

# ${providerData.displayName} Configuration
${provider.toUpperCase()}_CONFIG = {
    "endpoint": "${getEndpoint()}",
    "headers": ${JSON.stringify(generateHeaders(), null, 4).replace(/"/g, '"')},
    "model": "${getModel()}"
}

def call_${provider}(prompt):
    """Call ${providerData.displayName} API"""
    try:
        payload = ${JSON.stringify(generateRequestBody(), null, 8).replace('"{{PROMPT}}"', 'prompt').replace(/"/g, '"')}
        
        response = requests.post(
            ${provider.toUpperCase()}_CONFIG["endpoint"],
            headers=${provider.toUpperCase()}_CONFIG["headers"],
            json=payload,
            timeout=30
        )
        
        response.raise_for_status()
        data = response.json()
        
        return ${generateResponseParser().replace(/\?\.|\?\[/g, '.get(').replace(/\]/g, ')')}
        
    except requests.exceptions.RequestException as e:
        raise Exception(f"${providerData.displayName} API error: {str(e)}")

@app.route('/api/generate', methods=['POST'])
def generate():
    try:
        data = request.get_json()
        prompt = data.get('prompt')
        
        if not prompt:
            return jsonify({"error": "Prompt is required"}), 400
        
        response = call_${provider}(prompt)
        return jsonify({"response": response})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)`;
  };

  const generateDjango = () => {
    return `# ${providerData.displayName} Django Integration
# views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import requests
import json

# ${providerData.displayName} Configuration
${provider.toUpperCase()}_CONFIG = {
    "endpoint": "${getEndpoint()}",
    "headers": ${JSON.stringify(generateHeaders(), null, 4).replace(/"/g, '"')},
    "model": "${getModel()}"
}

def call_${provider}(prompt):
    """Call ${providerData.displayName} API"""
    try:
        payload = ${JSON.stringify(generateRequestBody(), null, 8).replace('"{{PROMPT}}"', 'prompt').replace(/"/g, '"')}
        
        response = requests.post(
            ${provider.toUpperCase()}_CONFIG["endpoint"],
            headers=${provider.toUpperCase()}_CONFIG["headers"],
            json=payload,
            timeout=30
        )
        
        response.raise_for_status()
        data = response.json()
        
        return ${generateResponseParser().replace(/\?\.|\?\[/g, '.get(').replace(/\]/g, ')')}
        
    except requests.exceptions.RequestException as e:
        raise Exception(f"${providerData.displayName} API error: {str(e)}")

@csrf_exempt
@require_http_methods(["POST"])
def generate_response(request):
    try:
        data = json.loads(request.body)
        prompt = data.get('prompt')
        
        if not prompt:
            return JsonResponse({"error": "Prompt is required"}, status=400)
        
        response = call_${provider}(prompt)
        return JsonResponse({"response": response})
        
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
  };

  const generateFastAPI = () => {
    return `# ${providerData.displayName} FastAPI Integration
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
import json

app = FastAPI(title="${providerData.displayName} API", version="1.0.0")

# ${providerData.displayName} Configuration
${provider.toUpperCase()}_CONFIG = {
    "endpoint": "${getEndpoint()}",
    "headers": ${JSON.stringify(generateHeaders(), null, 4).replace(/"/g, '"')},
    "model": "${getModel()}"
}

class GenerateRequest(BaseModel):
    prompt: str

class GenerateResponse(BaseModel):
    response: str

async def call_${provider}(prompt: str) -> str:
    """Call ${providerData.displayName} API"""
    try:
        payload = ${JSON.stringify(generateRequestBody(), null, 8).replace('"{{PROMPT}}"', 'prompt').replace(/"/g, '"')}
        
        response = requests.post(
            ${provider.toUpperCase()}_CONFIG["endpoint"],
            headers=${provider.toUpperCase()}_CONFIG["headers"],
            json=payload,
            timeout=30
        )
        
        response.raise_for_status()
        data = response.json()
        
        return ${generateResponseParser().replace(/\?\.|\?\[/g, '.get(').replace(/\]/g, ')')}
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"${providerData.displayName} API error: {str(e)}")

@app.post("/api/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """Generate response using ${providerData.displayName}"""
    try:
        response = await call_${provider}(request.prompt)
        return GenerateResponse(response=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)`;
  };

  const generateCurl = () => {
    const headers = generateHeaders();
    const body = generateRequestBody();
    
    let curlHeaders = Object.entries(headers)
      .map(([key, value]) => `  -H "${key}: ${showKeys ? value : '***HIDDEN***'}"`)
      .join(' \\\n');

    return `# ${providerData.displayName} cURL Example
curl -X POST "${getEndpoint()}" \\
${curlHeaders} \\
  -d '${JSON.stringify(body, null, 2).replace('"{{PROMPT}}"', '"Your prompt here"')}'

# Example with actual prompt
curl -X POST "${getEndpoint()}" \\
${curlHeaders} \\
  -d '${JSON.stringify({...body, ...getPromptField()}, null, 2).replace('"{{PROMPT}}"', '"Hello, how are you?"')}'`;
  };

  const getEndpoint = () => {
    const endpoints = {
      openai: 'https://api.openai.com/v1/chat/completions',
      gemini: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent${showKeys && keyData.apiKey ? `?key=${keyData.apiKey}` : '?key=YOUR_API_KEY'}`,
      claude: 'https://api.anthropic.com/v1/messages',
      ibm: 'https://us-south.ml.cloud.ibm.com/ml/v1/text/generation'
    };
    return endpoints[provider as keyof typeof endpoints] || '';
  };

  const getModel = () => {
    const models = {
      openai: 'gpt-4',
      gemini: 'gemini-2.0-flash',
      claude: 'claude-3-sonnet-20240229',
      ibm: 'ibm/granite-13b-chat-v2'
    };
    return models[provider as keyof typeof models] || '';
  };

  const generateHeaders = () => {
    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (showKeys) {
      switch (provider) {
        case 'openai':
          baseHeaders['Authorization'] = `Bearer ${keyData.apiKey}`;
          break;
        case 'gemini':
          // For Gemini, API key is in URL, no header needed
          break;
        case 'claude':
          baseHeaders['x-api-key'] = keyData.apiKey;
          baseHeaders['anthropic-version'] = '2023-06-01';
          break;
        case 'ibm':
          baseHeaders['Authorization'] = `Bearer ${keyData.apiKey}`;
          break;
      }
    } else {
      switch (provider) {
        case 'openai':
          baseHeaders['Authorization'] = 'Bearer YOUR_OPENAI_API_KEY';
          break;
        case 'gemini':
          // For Gemini, API key is in URL
          break;
        case 'claude':
          baseHeaders['x-api-key'] = 'YOUR_CLAUDE_API_KEY';
          baseHeaders['anthropic-version'] = '2023-06-01';
          break;
        case 'ibm':
          baseHeaders['Authorization'] = 'Bearer YOUR_IBM_API_KEY';
          break;
      }
    }

    return baseHeaders;
  };

  const generateRequestBody = () => {
    switch (provider) {
      case 'openai':
        return {
          model: 'gpt-4',
          messages: [{ role: 'user', content: '{{PROMPT}}' }],
          temperature: 0.7,
          max_tokens: 1000
        };
      case 'gemini':
        return {
          contents: [{ role: 'user', parts: [{ text: '{{PROMPT}}' }] }],
          generationConfig: { temperature: 0.7, topP: 1, maxOutputTokens: 1000 }
        };
      case 'claude':
        return {
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          messages: [{ role: 'user', content: '{{PROMPT}}' }]
        };
      case 'ibm':
        const body: any = {
          input: '{{PROMPT}}',
          model_id: 'ibm/granite-13b-chat-v2',
          parameters: { temperature: 0.7, max_new_tokens: 500 }
        };
        if (showKeys && keyData.projectId) {
          body.project_id = keyData.projectId;
        } else if (!showKeys) {
          body.project_id = 'YOUR_IBM_PROJECT_ID';
        }
        return body;
      default:
        return {};
    }
  };

  const getPromptField = () => {
    switch (provider) {
      case 'openai':
        return { messages: [{ role: 'user', content: 'Hello, how are you?' }] };
      case 'gemini':
        return { contents: [{ role: 'user', parts: [{ text: 'Hello, how are you?' }] }] };
      case 'claude':
        return { messages: [{ role: 'user', content: 'Hello, how are you?' }] };
      case 'ibm':
        return { input: 'Hello, how are you?' };
      default:
        return {};
    }
  };

  const generateResponseParser = () => {
    switch (provider) {
      case 'openai':
        return 'data?.choices?.[0]?.message?.content ?? ""';
      case 'gemini':
        return 'data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""';
      case 'claude':
        return 'data?.content?.[0]?.text ?? ""';
      case 'ibm':
        return 'data?.results?.[0]?.generated_text ?? ""';
      default:
        return 'data';
    }
  };

  const downloadConfiguration = () => {
    const config = generateConfiguration();
    const extension = selectedLanguage === 'javascript' ? 'js' : selectedLanguage === 'python' ? 'py' : 'sh';
    const filename = `${provider}-${selectedFramework}-config.${extension}`;
    
    const blob = new Blob([config], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Configuration downloaded as ${filename}`);
  };

  const languageOptions = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'curl', label: 'cURL' }
  ];

  const frameworkOptions = {
    javascript: [
      { value: 'vanilla', label: 'Vanilla JS' },
      { value: 'react', label: 'React' },
      { value: 'node', label: 'Node.js' },
      { value: 'express', label: 'Express.js' }
    ],
    python: [
      { value: 'vanilla', label: 'Python' },
      { value: 'flask', label: 'Flask' },
      { value: 'django', label: 'Django' },
      { value: 'fastapi', label: 'FastAPI' }
    ],
    curl: [
      { value: 'vanilla', label: 'cURL' }
    ]
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                <span className="text-2xl">{providerData.icon}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                  {providerData.displayName} Configuration
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Copy-paste ready code for your projects
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Configuration Options */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Language Selection */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => {
                  setSelectedLanguage(e.target.value);
                  setSelectedFramework('vanilla');
                }}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
              >
                {languageOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Framework Selection */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Framework
              </label>
              <select
                value={selectedFramework}
                onChange={(e) => setSelectedFramework(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
              >
                {frameworkOptions[selectedLanguage as keyof typeof frameworkOptions]?.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Show Keys Toggle */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                API Keys
              </label>
              <button
                onClick={() => setShowKeys(!showKeys)}
                className={`w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                  showKeys
                    ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300'
                    : 'border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                }`}
              >
                {showKeys ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span>{showKeys ? 'Hide Keys' : 'Show Keys'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Code Display */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Code className="w-5 h-5 text-primary-500" />
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {selectedFramework.charAt(0).toUpperCase() + selectedFramework.slice(1)} Configuration
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => copyToClipboard(generateConfiguration(), 'main')}
                    className="flex items-center space-x-2 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    {copiedSection === 'main' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>Copy Code</span>
                  </button>
                  <button
                    onClick={downloadConfiguration}
                    className="flex items-center space-x-2 px-3 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              <div className="bg-neutral-900 rounded-lg overflow-hidden">
                <pre className="p-4 text-sm text-neutral-100 overflow-x-auto">
                  <code>{generateConfiguration()}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              Configuration generated for {providerData.displayName} • {selectedLanguage} • {selectedFramework}
            </div>
            <div className="flex items-center space-x-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span>🔒 Keys are {showKeys ? 'visible' : 'hidden'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}