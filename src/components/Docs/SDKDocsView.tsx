import React, { useState } from 'react';
import { FileText, Code, Book, ExternalLink, Copy, Check, ChevronRight, ChevronDown, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export function SDKDocsView() {
  const [activeSection, setActiveSection] = useState('overview');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['typescript', 'python']));

  const copyToClipboard = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(id);
      toast.success('Code copied to clipboard!');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const sections = [
    { id: 'overview', title: 'Overview', icon: Book },
    { id: 'typescript', title: 'TypeScript SDK (In Development)', icon: Code },
    { id: 'python', title: 'Python SDK (Planned)', icon: FileText },
    { id: 'examples', title: 'Examples', icon: ExternalLink },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          ModelShift AI SDK Documentation
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Preview documentation for the ModelShift AI SDK (Under Development)
        </p>
      </div>

      {/* Development Notice */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-8">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
              🚧 Development Status
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Both the TypeScript and Python SDKs are currently under active development. 
              This documentation serves as a preview of the planned architecture and API design. 
              Features and interfaces may change before the stable release.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 sticky top-6">
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Documentation</h3>
            <nav className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    activeSection === section.id
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  <section.icon className="w-4 h-4" />
                  <span>{section.title}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-8">
            {activeSection === 'overview' && <OverviewSection />}
            {activeSection === 'typescript' && (
              <TypeScriptSDKSection 
                copyToClipboard={copyToClipboard} 
                copiedCode={copiedCode}
                expandedSections={expandedSections}
                toggleSection={toggleSection}
              />
            )}
            {activeSection === 'python' && (
              <PythonSDKSection 
                copyToClipboard={copyToClipboard} 
                copiedCode={copiedCode}
                expandedSections={expandedSections}
                toggleSection={toggleSection}
              />
            )}
            {activeSection === 'examples' && (
              <ExamplesSection 
                copyToClipboard={copyToClipboard} 
                copiedCode={copiedCode}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
          ModelShift AI SDK Overview
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
          The ModelShift AI SDK will provide a unified interface for integrating multiple AI providers 
          into your applications. It will abstract away the complexity of different API formats and 
          provide a consistent experience across OpenAI, Google Gemini, Anthropic Claude, and IBM WatsonX.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-6">
          <h3 className="font-semibold text-primary-900 dark:text-primary-100 mb-3">
            🎯 Planned Features
          </h3>
          <ul className="space-y-2 text-sm text-primary-700 dark:text-primary-300">
            <li>• Multi-provider support (OpenAI, Gemini, Claude, IBM)</li>
            <li>• Unified API interface</li>
            <li>• Built-in prompt engineering utilities</li>
            <li>• Type-safe configuration</li>
            <li>• Error handling and retries</li>
            <li>• Configurable parameters per provider</li>
          </ul>
        </div>

        <div className="bg-secondary-50 dark:bg-secondary-900/20 rounded-lg p-6">
          <h3 className="font-semibold text-secondary-900 dark:text-secondary-100 mb-3">
            📋 Development Status
          </h3>
          <ul className="space-y-2 text-sm text-secondary-700 dark:text-secondary-300">
            <li>🔄 TypeScript SDK (In Development)</li>
            <li>📋 Python SDK (Planned)</li>
            <li>📋 Go SDK (Future)</li>
            <li>📋 Java SDK (Future)</li>
            <li>✅ REST API Documentation</li>
            <li>✅ Configuration Export/Import</li>
          </ul>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
              Important Note
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              The current implementation in the ModelShift AI platform serves as a prototype and 
              proof-of-concept. The final SDK will be refactored, optimized, and packaged as 
              standalone libraries for distribution via npm (TypeScript) and PyPI (Python).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SDKSectionProps {
  copyToClipboard: (code: string, id: string) => void;
  copiedCode: string | null;
  expandedSections?: Set<string>;
  toggleSection?: (section: string) => void;
}

function TypeScriptSDKSection({ copyToClipboard, copiedCode, expandedSections, toggleSection }: SDKSectionProps) {
  const codeBlocks = {
    client: `import { ModelShiftAIClientFactory } from '@modelshift/ai-sdk';

// Create a client for OpenAI
const client = ModelShiftAIClientFactory.create('openai', {
  apiKey: 'your-openai-api-key'
});

// Generate a response
const response = await client.generate('Hello, how are you?');
console.log(response);`,

    config: `interface ProviderConfig {
  endpoint: string;
  buildRequestBody: (prompt: string, keyData: Record<string, string>) => object;
  parseResponse: (response: any) => string;
  buildHeaders?: (keyData: Record<string, string>) => Record<string, string>;
  buildEndpoint?: (keyData: Record<string, string>) => string;
  defaultModel?: string;
  defaultParameters?: Record<string, any>;
}

// Example OpenAI configuration
export const openAIConfig: ProviderConfig = {
  endpoint: 'https://api.openai.com/v1/chat/completions',
  buildRequestBody: (prompt: string) => ({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 1000
  }),
  parseResponse: (response: any) => response?.choices?.[0]?.message?.content ?? '',
  buildHeaders: (keyData: Record<string, string>) => ({
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${keyData.apiKey}\`
  }),
  defaultModel: 'gpt-4',
  defaultParameters: {
    temperature: 0.7,
    max_tokens: 1000
  }
};`,

    promptBuilder: `import { PromptBuilder } from '@modelshift/ai-sdk';

// Chain of thought reasoning
const prompt1 = PromptBuilder.chainOfThought(
  'Analyze the business model and provide recommendations',
  'SaaS platform for project management'
);

// Classification task
const prompt2 = PromptBuilder.classification(
  'Categorize this support ticket',
  'User cannot login after password reset',
  ['Technical Issue', 'Account Access', 'Billing', 'Feature Request']
);

// Simple instruction
const prompt3 = PromptBuilder.simpleInstruction(
  'Translate the following text to Spanish',
  'Hello, how are you today?'
);`,

    factory: `// The ModelShiftAIClientFactory handles provider-specific client creation
export class ModelShiftAIClientFactory {
  static create(provider: string, keyData: Record<string, string>): ModelShiftAIClient {
    const config = providerConfigs[provider];
    if (!config) {
      throw new Error(\`Provider '\${provider}' not supported\`);
    }
    return new ConfigurableClient(keyData, config);
  }

  // Create client from serialized configuration
  static createFromSerializedConfig(serializedConfig: SerializedConfig): ModelShiftAIClient {
    const baseConfig = providerConfigs[serializedConfig.providerId];
    if (!baseConfig) {
      throw new Error(\`Provider '\${serializedConfig.providerId}' not supported\`);
    }

    // Custom config with overrides
    const customConfig: ProviderConfig = {
      ...baseConfig,
      buildRequestBody: (prompt: string, keyData: Record<string, string>) => {
        const baseBody = baseConfig.buildRequestBody(prompt, keyData);
        const customBody = { ...baseBody };
        
        // Apply custom model and parameters
        if (serializedConfig.model) {
          if ('model' in customBody) {
            customBody.model = serializedConfig.model;
          }
        }
        
        if (serializedConfig.parameters) {
          Object.assign(customBody, serializedConfig.parameters);
        }
        
        return customBody;
      }
    };

    return new ConfigurableClient(serializedConfig.keyData, customConfig);
  }
}`
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center space-x-3 mb-4">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
            TypeScript SDK Documentation
          </h2>
          <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-sm font-medium">
            In Development
          </span>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
          <p className="text-amber-800 dark:text-amber-200 font-medium mb-2">
            🚧 Development Status
          </p>
          <p className="text-amber-700 dark:text-amber-300 text-sm">
            The TypeScript SDK is currently under active development. While the core architecture 
            is implemented in the ModelShift AI platform, it's being refactored into a standalone 
            package. The API design shown below represents the planned interface.
          </p>
        </div>
        <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
          The TypeScript SDK will provide full type safety for all operations and serve as the 
          foundation for other language implementations. It will be distributed as an npm package 
          for easy integration into Node.js and browser applications.
        </p>
      </div>

      {/* Core Components */}
      <div className="space-y-6">
        <CollapsibleSection
          title="ModelShiftAIClient Interface"
          isExpanded={expandedSections?.has('client') ?? true}
          onToggle={() => toggleSection?.('client')}
        >
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            The main interface for interacting with AI providers. All provider-specific clients will implement this interface.
          </p>
          <CodeBlock
            code={`interface ModelShiftAIClient {
  generate(prompt: string): Promise<string>;
}`}
            language="typescript"
            onCopy={() => copyToClipboard(`interface ModelShiftAIClient {
  generate(prompt: string): Promise<string>;
}`, 'client-interface')}
            copied={copiedCode === 'client-interface'}
          />
          <div className="mt-4">
            <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">Planned Usage:</h4>
            <CodeBlock
              code={codeBlocks.client}
              language="typescript"
              onCopy={() => copyToClipboard(codeBlocks.client, 'client-usage')}
              copied={copiedCode === 'client-usage'}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="ProviderConfig"
          isExpanded={expandedSections?.has('config') ?? true}
          onToggle={() => toggleSection?.('config')}
        >
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Configuration object that will define how to interact with a specific AI provider. 
            Each provider will have its own configuration that handles API endpoints, request formatting, and response parsing.
          </p>
          <CodeBlock
            code={codeBlocks.config}
            language="typescript"
            onCopy={() => copyToClipboard(codeBlocks.config, 'provider-config')}
            copied={copiedCode === 'provider-config'}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="PromptBuilder Utilities"
          isExpanded={expandedSections?.has('prompt') ?? true}
          onToggle={() => toggleSection?.('prompt')}
        >
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Utility class for building structured prompts for common AI tasks like reasoning, classification, and instruction following.
          </p>
          <CodeBlock
            code={codeBlocks.promptBuilder}
            language="typescript"
            onCopy={() => copyToClipboard(codeBlocks.promptBuilder, 'prompt-builder')}
            copied={copiedCode === 'prompt-builder'}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="ModelShiftAIClientFactory"
          isExpanded={expandedSections?.has('factory') ?? false}
          onToggle={() => toggleSection?.('factory')}
        >
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Factory class for creating provider-specific clients. Will support both simple creation and creation from serialized configurations.
          </p>
          <CodeBlock
            code={codeBlocks.factory}
            language="typescript"
            onCopy={() => copyToClipboard(codeBlocks.factory, 'factory')}
            copied={copiedCode === 'factory'}
          />
        </CollapsibleSection>
      </div>

      {/* Installation (Planned) */}
      <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-6">
        <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Planned Installation</h3>
        <CodeBlock
          code={`# Install via npm (when available)
npm install @modelshift/ai-sdk

# Or install from source
git clone https://github.com/modelshift/typescript-sdk
cd typescript-sdk
npm install
npm run build`}
          language="bash"
          onCopy={() => copyToClipboard(`# Install via npm (when available)
npm install @modelshift/ai-sdk

# Or install from source
git clone https://github.com/modelshift/typescript-sdk
cd typescript-sdk
npm install
npm run build`, 'ts-install')}
          copied={copiedCode === 'ts-install'}
        />
      </div>
    </div>
  );
}

function PythonSDKSection({ copyToClipboard, copiedCode, expandedSections, toggleSection }: SDKSectionProps) {
  const pythonCodeBlocks = {
    client: `from modelshift_ai import ModelShiftAIClientFactory

# Create a client for OpenAI
client = ModelShiftAIClientFactory.create('openai', {
    'api_key': 'your-openai-api-key'
})

# Generate a response
response = await client.generate('Hello, how are you?')
print(response)`,

    config: `from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class ProviderConfig(ABC):
    """Abstract base class for provider configurations."""
    
    @property
    @abstractmethod
    def endpoint(self) -> str:
        """API endpoint URL."""
        pass
    
    @abstractmethod
    def build_request_body(self, prompt: str, key_data: Dict[str, str]) -> Dict[str, Any]:
        """Build the request body for the API call."""
        pass
    
    @abstractmethod
    def parse_response(self, response: Dict[str, Any]) -> str:
        """Parse the API response and extract the generated text."""
        pass
    
    def build_headers(self, key_data: Dict[str, str]) -> Dict[str, str]:
        """Build headers for the API request."""
        return {
            'Content-Type': 'application/json',
            'Authorization': f"Bearer {key_data['api_key']}"
        }
    
    def build_endpoint(self, key_data: Dict[str, str]) -> str:
        """Build the endpoint URL (override if dynamic)."""
        return self.endpoint

class OpenAIConfig(ProviderConfig):
    """Configuration for OpenAI GPT models."""
    
    @property
    def endpoint(self) -> str:
        return 'https://api.openai.com/v1/chat/completions'
    
    def build_request_body(self, prompt: str, key_data: Dict[str, str]) -> Dict[str, Any]:
        return {
            'model': 'gpt-4',
            'messages': [{'role': 'user', 'content': prompt}],
            'temperature': 0.7,
            'max_tokens': 1000
        }
    
    def parse_response(self, response: Dict[str, Any]) -> str:
        return response.get('choices', [{}])[0].get('message', {}).get('content', '')`,

    promptBuilder: `class PromptBuilder:
    """Utility class for building structured prompts."""
    
    @staticmethod
    def chain_of_thought(task_description: str, user_input: str) -> str:
        """Build a chain-of-thought reasoning prompt."""
        return f"""You are an expert assistant. Your task is: {task_description}

Follow these steps before answering:
1. Analyze input carefully
2. Reason step-by-step
3. Identify key factors
4. Formulate response based on reasoning

Input:
\"\"\"
{user_input}
\"\"\"

Provide your reasoning and final answer."""

    @staticmethod
    def classification(task_description: str, user_input: str, classes: list[str]) -> str:
        """Build a classification prompt."""
        return f"""You are a classification AI.
Task: {task_description}

Input:
\"\"\"
{user_input}
\"\"\"

Available categories: {', '.join(classes)}

Classify the input into one of the categories."""

    @staticmethod
    def simple_instruction(instruction: str, user_input: str) -> str:
        """Build a simple instruction prompt."""
        return f"Instruction: {instruction}\\n\\nInput: {user_input}"`,

    factory: `import asyncio
import aiohttp
from typing import Dict, Any, Optional

class ModelShiftAIClient(ABC):
    """Abstract base class for AI clients."""
    
    @abstractmethod
    async def generate(self, prompt: str) -> str:
        """Generate a response from the AI model."""
        pass

class ConfigurableClient(ModelShiftAIClient):
    """Configurable client that works with any provider configuration."""
    
    def __init__(self, key_data: Dict[str, str], config: ProviderConfig):
        self.key_data = key_data
        self.config = config
    
    async def generate(self, prompt: str) -> str:
        """Generate a response using the configured provider."""
        endpoint = self.config.build_endpoint(self.key_data)
        headers = self.config.build_headers(self.key_data)
        body = self.config.build_request_body(prompt, self.key_data)
        
        async with aiohttp.ClientSession() as session:
            async with session.post(endpoint, headers=headers, json=body) as response:
                if not response.ok:
                    raise Exception(f"API request failed: {response.status}")
                
                data = await response.json()
                return self.config.parse_response(data) or 'No response'

class ModelShiftAIClientFactory:
    """Factory for creating provider-specific clients."""
    
    _configs = {
        'openai': OpenAIConfig(),
        'gemini': GeminiConfig(),
        'claude': ClaudeConfig(),
        'ibm': IBMConfig()
    }
    
    @classmethod
    def create(cls, provider: str, key_data: Dict[str, str]) -> ModelShiftAIClient:
        """Create a client for the specified provider."""
        config = cls._configs.get(provider)
        if not config:
            raise ValueError(f"Provider '{provider}' not supported")
        
        return ConfigurableClient(key_data, config)
    
    @classmethod
    def create_from_config(cls, serialized_config: Dict[str, Any]) -> ModelShiftAIClient:
        """Create a client from a serialized configuration."""
        provider_id = serialized_config['provider_id']
        base_config = cls._configs.get(provider_id)
        
        if not base_config:
            raise ValueError(f"Provider '{provider_id}' not supported")
        
        # Create custom config with overrides
        custom_config = CustomProviderConfig(
            base_config=base_config,
            model_override=serialized_config.get('model'),
            parameters_override=serialized_config.get('parameters')
        )
        
        return ConfigurableClient(serialized_config['key_data'], custom_config)`
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center space-x-3 mb-4">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Python SDK Documentation
          </h2>
          <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full text-sm font-medium">
            Planned Feature
          </span>
        </div>
        <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 mb-6">
          <p className="text-neutral-800 dark:text-neutral-200 font-medium mb-2">
            📋 Planning Status
          </p>
          <p className="text-neutral-700 dark:text-neutral-300 text-sm">
            The Python SDK is currently in planning phase and not yet implemented. The code examples 
            below represent the planned API design and architecture that will mirror the TypeScript SDK.
          </p>
        </div>
        <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
          The Python SDK will provide the same functionality as the TypeScript SDK with Pythonic 
          conventions and async/await support. It will be fully compatible with the configuration 
          export/import system.
        </p>
      </div>

      {/* Planned Components */}
      <div className="space-y-6">
        <CollapsibleSection
          title="ModelShiftAIClient (Planned)"
          isExpanded={expandedSections?.has('py-client') ?? true}
          onToggle={() => toggleSection?.('py-client')}
        >
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            The main abstract base class for AI clients. All provider-specific clients will implement this interface.
          </p>
          <CodeBlock
            code={pythonCodeBlocks.client}
            language="python"
            onCopy={() => copyToClipboard(pythonCodeBlocks.client, 'py-client')}
            copied={copiedCode === 'py-client'}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="ProviderConfig (Planned)"
          isExpanded={expandedSections?.has('py-config') ?? true}
          onToggle={() => toggleSection?.('py-config')}
        >
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Abstract base class for provider configurations. Each provider will have its own configuration class.
          </p>
          <CodeBlock
            code={pythonCodeBlocks.config}
            language="python"
            onCopy={() => copyToClipboard(pythonCodeBlocks.config, 'py-config')}
            copied={copiedCode === 'py-config'}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="PromptBuilder (Planned)"
          isExpanded={expandedSections?.has('py-prompt') ?? true}
          onToggle={() => toggleSection?.('py-prompt')}
        >
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Utility class for building structured prompts with common patterns.
          </p>
          <CodeBlock
            code={pythonCodeBlocks.promptBuilder}
            language="python"
            onCopy={() => copyToClipboard(pythonCodeBlocks.promptBuilder, 'py-prompt')}
            copied={copiedCode === 'py-prompt'}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Factory and Client Implementation (Planned)"
          isExpanded={expandedSections?.has('py-factory') ?? false}
          onToggle={() => toggleSection?.('py-factory')}
        >
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Factory class and configurable client implementation with async support.
          </p>
          <CodeBlock
            code={pythonCodeBlocks.factory}
            language="python"
            onCopy={() => copyToClipboard(pythonCodeBlocks.factory, 'py-factory')}
            copied={copiedCode === 'py-factory'}
          />
        </CollapsibleSection>
      </div>

      {/* Installation and Setup (Planned) */}
      <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-6">
        <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Planned Installation</h3>
        <CodeBlock
          code={`# Install via pip (when available)
pip install modelshift-ai

# Or install from source
git clone https://github.com/modelshift/python-sdk
cd python-sdk
pip install -e .`}
          language="bash"
          onCopy={() => copyToClipboard(`# Install via pip (when available)
pip install modelshift-ai

# Or install from source
git clone https://github.com/modelshift/python-sdk
cd python-sdk
pip install -e .`, 'py-install')}
          copied={copiedCode === 'py-install'}
        />
      </div>
    </div>
  );
}

function ExamplesSection({ copyToClipboard, copiedCode }: Pick<SDKSectionProps, 'copyToClipboard' | 'copiedCode'>) {
  const examples = {
    basic: `import { ModelShiftAIClientFactory } from '@modelshift/ai-sdk';

// Basic usage with OpenAI (when SDK is available)
const client = ModelShiftAIClientFactory.create('openai', {
  apiKey: process.env.OPENAI_API_KEY
});

const response = await client.generate('Explain quantum computing in simple terms');
console.log(response);`,

    multiProvider: `import { ModelShiftAIClientFactory } from '@modelshift/ai-sdk';

// Compare responses from multiple providers (planned feature)
const providers = [
  { id: 'openai', keys: { apiKey: process.env.OPENAI_API_KEY } },
  { id: 'claude', keys: { apiKey: process.env.CLAUDE_API_KEY } },
  { id: 'gemini', keys: { apiKey: process.env.GEMINI_API_KEY } }
];

const prompt = 'Write a haiku about artificial intelligence';
const results = await Promise.all(
  providers.map(async ({ id, keys }) => {
    const client = ModelShiftAIClientFactory.create(id, keys);
    const response = await client.generate(prompt);
    return { provider: id, response };
  })
);

results.forEach(({ provider, response }) => {
  console.log(\`\${provider}: \${response}\`);
});`,

    withPromptBuilder: `import { ModelShiftAIClientFactory, PromptBuilder } from '@modelshift/ai-sdk';

const client = ModelShiftAIClientFactory.create('openai', {
  apiKey: process.env.OPENAI_API_KEY
});

// Chain of thought reasoning (planned feature)
const analysisPrompt = PromptBuilder.chainOfThought(
  'Analyze the business model and provide strategic recommendations',
  'A subscription-based meal delivery service targeting busy professionals'
);

const analysis = await client.generate(analysisPrompt);

// Classification task (planned feature)
const classificationPrompt = PromptBuilder.classification(
  'Categorize this customer feedback',
  'The app crashes every time I try to place an order',
  ['Bug Report', 'Feature Request', 'General Feedback', 'Billing Issue']
);

const category = await client.generate(classificationPrompt);

console.log('Analysis:', analysis);
console.log('Category:', category);`,

    configExport: `import { ConfigurationSerializer } from '@modelshift/ai-sdk';

// Export configuration for sharing (planned feature)
const configJson = ConfigurationSerializer.serialize('openai', {
  agentId: 'business-name',
  includeKeys: false, // Use placeholders for security
  customModel: 'gpt-4-turbo',
  customParameters: { temperature: 0.8, max_tokens: 1500 },
  description: 'Business name generation configuration'
});

console.log('Shareable configuration:', configJson);

// Import and use configuration (planned feature)
const config = ConfigurationSerializer.deserialize(configJson);
const client = ModelShiftAIClientFactory.createFromSerializedConfig(config);

const businessNames = await client.generate('AI-powered fitness app');
console.log('Generated names:', businessNames);`,

    errorHandling: `import { ModelShiftAIClientFactory } from '@modelshift/ai-sdk';

async function generateWithRetry(provider: string, keyData: Record<string, string>, prompt: string, maxRetries = 3) {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = ModelShiftAIClientFactory.create(provider, keyData);
      return await client.generate(prompt);
    } catch (error) {
      lastError = error as Error;
      console.warn(\`Attempt \${attempt} failed: \${error.message}\`);
      
      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  throw new Error(\`Failed after \${maxRetries} attempts: \${lastError.message}\`);
}

// Usage (when SDK is available)
try {
  const response = await generateWithRetry('openai', {
    apiKey: process.env.OPENAI_API_KEY
  }, 'Explain machine learning');
  
  console.log('Response:', response);
} catch (error) {
  console.error('All attempts failed:', error.message);
}`
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
          SDK Usage Examples
        </h2>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
          <p className="text-amber-800 dark:text-amber-200 font-medium mb-2">
            📝 Preview Examples
          </p>
          <p className="text-amber-700 dark:text-amber-300 text-sm">
            These examples show the planned API design for the ModelShift AI SDK. 
            The actual implementation may vary as development progresses.
          </p>
        </div>
        <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Practical examples showing how the ModelShift AI SDK will be used in real-world scenarios.
        </p>
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">
            Basic Usage (Planned)
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Simple example of creating a client and generating a response.
          </p>
          <CodeBlock
            code={examples.basic}
            language="typescript"
            onCopy={() => copyToClipboard(examples.basic, 'basic')}
            copied={copiedCode === 'basic'}
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">
            Multi-Provider Comparison (Planned)
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Compare responses from multiple AI providers simultaneously.
          </p>
          <CodeBlock
            code={examples.multiProvider}
            language="typescript"
            onCopy={() => copyToClipboard(examples.multiProvider, 'multi-provider')}
            copied={copiedCode === 'multi-provider'}
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">
            Using PromptBuilder 
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Leverage built-in prompt engineering utilities for better results.
          </p>
          <CodeBlock
            code={examples.withPromptBuilder}
            language="typescript"
            onCopy={() => copyToClipboard(examples.withPromptBuilder, 'prompt-builder')}
            copied={copiedCode === 'prompt-builder'}
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">
            Configuration Export/Import (Planned)
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Export configurations for sharing and import them in different environments.
          </p>
          <CodeBlock
            code={examples.configExport}
            language="typescript"
            onCopy={() => copyToClipboard(examples.configExport, 'config-export')}
            copied={copiedCode === 'config-export'}
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">
            Error Handling and Retries (Planned)
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Implement robust error handling with exponential backoff for production use.
          </p>
          <CodeBlock
            code={examples.errorHandling}
            language="typescript"
            onCopy={() => copyToClipboard(examples.errorHandling, 'error-handling')}
            copied={copiedCode === 'error-handling'}
          />
        </div>
      </div>

      {/* Best Practices */}
      <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-6">
        <h3 className="font-semibold text-primary-900 dark:text-primary-100 mb-4">
          Planned Best Practices
        </h3>
        <ul className="space-y-2 text-sm text-primary-700 dark:text-primary-300">
          <li>• Always use environment variables for API keys</li>
          <li>• Implement proper error handling and retries</li>
          <li>• Use PromptBuilder for consistent prompt formatting</li>
          <li>• Cache configurations when possible to avoid repeated parsing</li>
          <li>• Monitor API usage and costs across providers</li>
          <li>• Use configuration export/import for team collaboration</li>
          <li>• Test with multiple providers to find the best fit for your use case</li>
        </ul>
      </div>
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
}

function CollapsibleSection({ title, children, isExpanded, onToggle }: CollapsibleSectionProps) {
  return (
    <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
      >
        <h3 className="font-semibold text-neutral-900 dark:text-white">{title}</h3>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-neutral-500" />
        ) : (
          <ChevronRight className="w-5 h-5 text-neutral-500" />
        )}
      </button>
      {isExpanded && (
        <div className="p-4 pt-0 border-t border-neutral-200 dark:border-neutral-700">
          {children}
        </div>
      )}
    </div>
  );
}

interface CodeBlockProps {
  code: string;
  language: string;
  onCopy: () => void;
  copied: boolean;
}

function CodeBlock({ code, language, onCopy, copied }: CodeBlockProps) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          {language}
        </span>
        <button
          onClick={onCopy}
          className="flex items-center space-x-1 px-2 py-1 text-xs bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <div className="bg-neutral-900 rounded-lg p-4 overflow-x-auto">
        <pre className="text-sm text-neutral-100">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}