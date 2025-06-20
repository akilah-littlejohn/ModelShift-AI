import React, { useState } from 'react';
import { Copy, Check, Code, X, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { providers } from '../../data/providers';
import { keyVault } from '../../lib/encryption';
import toast from 'react-hot-toast';

interface CodeSnippetModalProps {
  provider: string;
  onClose: () => void;
}

export function CodeSnippetModal({ provider, onClose }: CodeSnippetModalProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

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

  const generateSnippet = (language: string): string => {
    const apiKey = showKey ? keyData.apiKey : 'YOUR_API_KEY'; // Mask key unless revealed
    
    switch (language) {
      case 'javascript':
        return generateJavaScriptSnippet(apiKey);
      case 'typescript':
        return generateTypeScriptSnippet(apiKey);
      case 'python':
        return generatePythonSnippet(apiKey);
      case 'nodejs':
        return generateNodeJSSnippet(apiKey);
      case 'curl':
        return generateCurlSnippet(apiKey);
      default:
        return generateJavaScriptSnippet(apiKey);
    }
  };

  const generateJavaScriptSnippet = (apiKey: string): string => {
    switch (provider) {
      case 'openai':
        return `// JavaScript example using fetch with OpenAI API
const apiKey = "${apiKey}"; // Store this securely, never expose in client-side code

async function callOpenAI(prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${apiKey}\`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    throw new Error(\`API request failed: \${response.status}\`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Example usage
callOpenAI("Hello, how are you?")
  .then(response => console.log(response))
  .catch(error => console.error('Error:', error));`;

      case 'gemini':
        return `// JavaScript example using fetch with Google Gemini API
const apiKey = "${apiKey}"; // Store this securely, never expose in client-side code

async function callGemini(prompt) {
  const response = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=\${apiKey}\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.5,
        topP: 1,
        maxOutputTokens: 1000
      }
    })
  });

  if (!response.ok) {
    throw new Error(\`API request failed: \${response.status}\`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// Example usage
callGemini("Hello, how are you?")
  .then(response => console.log(response))
  .catch(error => console.error('Error:', error));`;

      case 'claude':
        return `// JavaScript example using fetch with Anthropic Claude API
const apiKey = "${apiKey}"; // Store this securely, never expose in client-side code

async function callClaude(prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(\`API request failed: \${response.status}\`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// Example usage
callClaude("Hello, how are you?")
  .then(response => console.log(response))
  .catch(error => console.error('Error:', error));`;

      case 'ibm':
        const projectId = keyData.projectId || 'YOUR_IBM_PROJECT_ID';
        return `// JavaScript example using fetch with IBM WatsonX API
const apiKey = "${apiKey}"; // Store this securely, never expose in client-side code
const projectId = "${projectId}"; // Your IBM Project ID

async function callIBMWatsonX(prompt) {
  const response = await fetch('https://us-south.ml.cloud.ibm.com/ml/v1/text/generation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${apiKey}\`
    },
    body: JSON.stringify({
      input: prompt,
      model_id: 'ibm/granite-13b-chat-v2',
      project_id: projectId,
      parameters: {
        temperature: 0.7,
        max_new_tokens: 500
      }
    })
  });

  if (!response.ok) {
    throw new Error(\`API request failed: \${response.status}\`);
  }

  const data = await response.json();
  return data.results[0].generated_text;
}

// Example usage
callIBMWatsonX("Hello, how are you?")
  .then(response => console.log(response))
  .catch(error => console.error('Error:', error));`;

      default:
        return `// No JavaScript example available for this provider`;
    }
  };

  const generateTypeScriptSnippet = (apiKey: string): string => {
    switch (provider) {
      case 'openai':
        return `// TypeScript example using fetch with OpenAI API
const apiKey = "${apiKey}"; // Store this securely, never expose in client-side code

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

async function callOpenAI(prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${apiKey}\`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    throw new Error(\`API request failed: \${response.status}\`);
  }

  const data: OpenAIResponse = await response.json();
  return data.choices[0].message.content;
}

// Example usage
callOpenAI("Hello, how are you?")
  .then(response => console.log(response))
  .catch(error => console.error('Error:', error));`;

      case 'gemini':
        return `// TypeScript example using fetch with Google Gemini API
const apiKey = "${apiKey}"; // Store this securely, never expose in client-side code

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

async function callGemini(prompt: string): Promise<string> {
  const response = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=\${apiKey}\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.5,
        topP: 1,
        maxOutputTokens: 1000
      }
    })
  });

  if (!response.ok) {
    throw new Error(\`API request failed: \${response.status}\`);
  }

  const data: GeminiResponse = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// Example usage
callGemini("Hello, how are you?")
  .then(response => console.log(response))
  .catch(error => console.error('Error:', error));`;

      case 'claude':
        return `// TypeScript example using fetch with Anthropic Claude API
const apiKey = "${apiKey}"; // Store this securely, never expose in client-side code

interface ClaudeResponse {
  content: Array<{
    text: string;
  }>;
}

async function callClaude(prompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(\`API request failed: \${response.status}\`);
  }

  const data: ClaudeResponse = await response.json();
  return data.content[0].text;
}

// Example usage
callClaude("Hello, how are you?")
  .then(response => console.log(response))
  .catch(error => console.error('Error:', error));`;

      case 'ibm':
        const projectId = keyData.projectId || 'YOUR_IBM_PROJECT_ID';
        return `// TypeScript example using fetch with IBM WatsonX API
const apiKey = "${apiKey}"; // Store this securely, never expose in client-side code
const projectId = "${projectId}"; // Your IBM Project ID

interface IBMResponse {
  results: Array<{
    generated_text: string;
  }>;
}

async function callIBMWatsonX(prompt: string): Promise<string> {
  const response = await fetch('https://us-south.ml.cloud.ibm.com/ml/v1/text/generation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${apiKey}\`
    },
    body: JSON.stringify({
      input: prompt,
      model_id: 'ibm/granite-13b-chat-v2',
      project_id: projectId,
      parameters: {
        temperature: 0.7,
        max_new_tokens: 500
      }
    })
  });

  if (!response.ok) {
    throw new Error(\`API request failed: \${response.status}\`);
  }

  const data: IBMResponse = await response.json();
  return data.results[0].generated_text;
}

// Example usage
callIBMWatsonX("Hello, how are you?")
  .then(response => console.log(response))
  .catch(error => console.error('Error:', error));`;

      default:
        return `// No TypeScript example available for this provider`;
    }
  };

  const generatePythonSnippet = (apiKey: string): string => {
    switch (provider) {
      case 'openai':
        return `# Python example using requests with OpenAI API
import requests
import json

api_key = "${apiKey}"  # Store this securely, never expose in public code

def call_openai(prompt):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    data = {
        "model": "gpt-4",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 1000
    }
    
    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers=headers,
        json=data
    )
    
    if response.status_code != 200:
        raise Exception(f"API request failed: {response.status_code}")
    
    return response.json()["choices"][0]["message"]["content"]

# Example usage
try:
    response = call_openai("Hello, how are you?")
    print(response)
except Exception as e:
    print(f"Error: {e}")`;

      case 'gemini':
        return `# Python example using requests with Google Gemini API
import requests
import json

api_key = "${apiKey}"  # Store this securely, never expose in public code

def call_gemini(prompt):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
    
    headers = {
        "Content-Type": "application/json"
    }
    
    data = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.5,
            "topP": 1,
            "maxOutputTokens": 1000
        }
    }
    
    response = requests.post(
        url,
        headers=headers,
        json=data
    )
    
    if response.status_code != 200:
        raise Exception(f"API request failed: {response.status_code}")
    
    return response.json()["candidates"][0]["content"]["parts"][0]["text"]

# Example usage
try:
    response = call_gemini("Hello, how are you?")
    print(response)
except Exception as e:
    print(f"Error: {e}")`;

      case 'claude':
        return `# Python example using requests with Anthropic Claude API
import requests
import json

api_key = "${apiKey}"  # Store this securely, never expose in public code

def call_claude(prompt):
    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01"
    }
    
    data = {
        "model": "claude-3-sonnet-20240229",
        "max_tokens": 1000,
        "messages": [{"role": "user", "content": prompt}]
    }
    
    response = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers=headers,
        json=data
    )
    
    if response.status_code != 200:
        raise Exception(f"API request failed: {response.status_code}")
    
    return response.json()["content"][0]["text"]

# Example usage
try:
    response = call_claude("Hello, how are you?")
    print(response)
except Exception as e:
    print(f"Error: {e}")`;

      case 'ibm':
        const projectId = keyData.projectId || 'YOUR_IBM_PROJECT_ID';
        return `# Python example using requests with IBM WatsonX API
import requests
import json

api_key = "${apiKey}"  # Store this securely, never expose in public code
project_id = "${projectId}"  # Your IBM Project ID

def call_ibm_watsonx(prompt):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    data = {
        "input": prompt,
        "model_id": "ibm/granite-13b-chat-v2",
        "project_id": project_id,
        "parameters": {
            "temperature": 0.7,
            "max_new_tokens": 500
        }
    }
    
    response = requests.post(
        "https://us-south.ml.cloud.ibm.com/ml/v1/text/generation",
        headers=headers,
        json=data
    )
    
    if response.status_code != 200:
        raise Exception(f"API request failed: {response.status_code}")
    
    return response.json()["results"][0]["generated_text"]

# Example usage
try:
    response = call_ibm_watsonx("Hello, how are you?")
    print(response)
except Exception as e:
    print(f"Error: {e}")`;

      default:
        return `# No Python example available for this provider`;
    }
  };

  const generateNodeJSSnippet = (apiKey: string): string => {
    switch (provider) {
      case 'openai':
        return `// Node.js example using axios with OpenAI API
const axios = require('axios');

const apiKey = "${apiKey}"; // Store this securely in environment variables

async function callOpenAI(prompt) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${apiKey}\`
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI API:', error.response?.data || error.message);
    throw error;
  }
}

// Example usage
callOpenAI("Hello, how are you?")
  .then(response => console.log(response))
  .catch(error => console.error('Error:', error));`;

      case 'gemini':
        return `// Node.js example using axios with Google Gemini API
const axios = require('axios');

const apiKey = "${apiKey}"; // Store this securely in environment variables

async function callGemini(prompt) {
  try {
    const response = await axios.post(
      \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=\${apiKey}\`,
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          topP: 1,
          maxOutputTokens: 1000
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error calling Gemini API:', error.response?.data || error.message);
    throw error;
  }
}

// Example usage
callGemini("Hello, how are you?")
  .then(response => console.log(response))
  .catch(error => console.error('Error:', error));`;

      case 'claude':
        return `// Node.js example using axios with Anthropic Claude API
const axios = require('axios');

const apiKey = "${apiKey}"; // Store this securely in environment variables

async function callClaude(prompt) {
  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    return response.data.content[0].text;
  } catch (error) {
    console.error('Error calling Claude API:', error.response?.data || error.message);
    throw error;
  }
}

// Example usage
callClaude("Hello, how are you?")
  .then(response => console.log(response))
  .catch(error => console.error('Error:', error));`;

      case 'ibm':
        const projectId = keyData.projectId || 'YOUR_IBM_PROJECT_ID';
        return `// Node.js example using axios with IBM WatsonX API
const axios = require('axios');

const apiKey = "${apiKey}"; // Store this securely in environment variables
const projectId = "${projectId}"; // Your IBM Project ID

async function callIBMWatsonX(prompt) {
  try {
    const response = await axios.post(
      'https://us-south.ml.cloud.ibm.com/ml/v1/text/generation',
      {
        input: prompt,
        model_id: 'ibm/granite-13b-chat-v2',
        project_id: projectId,
        parameters: {
          temperature: 0.7,
          max_new_tokens: 500
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${apiKey}\`
        }
      }
    );

    return response.data.results[0].generated_text;
  } catch (error) {
    console.error('Error calling IBM WatsonX API:', error.response?.data || error.message);
    throw error;
  }
}

// Example usage
callIBMWatsonX("Hello, how are you?")
  .then(response => console.log(response))
  .catch(error => console.error('Error:', error));`;

      default:
        return `// No Node.js example available for this provider`;
    }
  };

  const generateCurlSnippet = (apiKey: string): string => {
    switch (provider) {
      case 'openai':
        return `# cURL example for OpenAI API
curl -X POST https://api.openai.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello, how are you?"}],
    "temperature": 0.7,
    "max_tokens": 1000
  }'`;

      case 'gemini':
        return `# cURL example for Google Gemini API
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contents": [{"role": "user", "parts": [{"text": "Hello, how are you?"}]}],
    "generationConfig": {
      "temperature": 0.5,
      "topP": 1,
      "maxOutputTokens": 1000
    }
  }'`;

      case 'claude':
        return `# cURL example for Anthropic Claude API
curl -X POST https://api.anthropic.com/v1/messages \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -H "anthropic-version: 2023-06-01" \\
  -d '{
    "model": "claude-3-sonnet-20240229",
    "max_tokens": 1000,
    "messages": [{"role": "user", "content": "Hello, how are you?"}]
  }'`;

      case 'ibm':
        const projectId = keyData.projectId || 'YOUR_IBM_PROJECT_ID';
        return `# cURL example for IBM WatsonX API
curl -X POST https://us-south.ml.cloud.ibm.com/ml/v1/text/generation \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -d '{
    "input": "Hello, how are you?",
    "model_id": "ibm/granite-13b-chat-v2",
    "project_id": "${projectId}",
    "parameters": {
      "temperature": 0.7,
      "max_new_tokens": 500
    }
  }'`;

      default:
        return `# No cURL example available for this provider`;
    }
  };

  const languageOptions = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'nodejs', label: 'Node.js' },
    { value: 'curl', label: 'cURL' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                <span className="text-2xl">{providerData.icon}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                  How to use your {providerData.displayName} API Key
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Code snippets for integrating with {providerData.displayName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Language Selector */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Code className="w-5 h-5 text-primary-500" />
              <span className="font-medium text-neutral-900 dark:text-white">
                Select Language
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {languageOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setSelectedLanguage(option.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    selectedLanguage === option.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowKey(!showKey)}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-800/30 transition-colors"
            >
              {showKey ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span>Hide API Key</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span>Reveal API Key</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Code Display */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                  Security Warning
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Never expose your API key in client-side code or commit it to public repositories. 
                  Store it securely in environment variables or a secure vault service.
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-neutral-900 dark:text-white">
                {providerData.displayName} Integration
              </h3>
              <button
                onClick={() => copyToClipboard(generateSnippet(selectedLanguage), selectedLanguage)}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                {copiedSection === selectedLanguage ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-neutral-900 rounded-lg overflow-hidden">
              <pre className="p-4 text-sm text-neutral-100 overflow-x-auto">
                <code>{generateSnippet(selectedLanguage)}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              {providerData.displayName} API • {selectedLanguage}
            </div>
            <div className="flex items-center space-x-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span>🔒 API Key is {showKey ? 'visible' : 'hidden'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}