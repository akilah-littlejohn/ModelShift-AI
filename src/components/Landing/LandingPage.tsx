import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, Zap, Layers, Code, Lock, BarChart2, Sparkles, CheckCircle, Globe, Shield, Cpu, Repeat, Terminal, Workflow, Wrench, Compass } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Debug logging for authentication state
  React.useEffect(() => {
    console.log('Auth state in LandingPage:', { user });
  }, [user]);

  const handleGetStarted = () => {
    if (user) {
      console.log('User already authenticated, navigating to playground');
      navigate('/playground');
    } else {
      console.log('User not authenticated, navigating to signup');
      navigate('/signup');
    }
  };

  const handleTryDemo = () => {
    if (user) {
      console.log('User already authenticated, navigating to playground');
      navigate('/playground');
    } else {
      console.log('User not authenticated, navigating to demo login');
      navigate('/login?demo=true');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950">
      {/* Hero Section */}
      <header className="relative overflow-hidden pt-16 md:pt-20 lg:pt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl mb-6">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 dark:text-white mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-secondary-500">
                Postman for AI Models
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-300 max-w-3xl mx-auto mb-8">
              Test, configure, and manage multi-model LLM workflows with a developer-first platform
            </p>
            
            {/* Key Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-10">
              <div className="flex flex-col items-center p-4">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mb-3">
                  <Terminal className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">Rapid Testing</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Compare responses across models in seconds, not minutes
                </p>
              </div>
              
              <div className="flex flex-col items-center p-4">
                <div className="w-12 h-12 bg-secondary-100 dark:bg-secondary-900/30 rounded-lg flex items-center justify-center mb-3">
                  <Workflow className="w-6 h-6 text-secondary-600 dark:text-secondary-400" />
                </div>
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">Seamless Switching</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Swap between providers with zero code changes
                </p>
              </div>
              
              <div className="flex flex-col items-center p-4">
                <div className="w-12 h-12 bg-accent-100 dark:bg-accent-900/30 rounded-lg flex items-center justify-center mb-3">
                  <Wrench className="w-6 h-6 text-accent-600 dark:text-accent-400" />
                </div>
                <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">Config Export</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Generate production-ready code in multiple languages
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <button
                onClick={handleGetStarted}
                className="px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg font-medium hover:from-primary-600 hover:to-secondary-600 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Get Started Free
              </button>
              <button
                onClick={handleTryDemo}
                className="px-6 py-3 bg-white dark:bg-neutral-800 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 rounded-lg font-medium hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Try Demo
              </button>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-500/10 dark:bg-primary-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary-500/10 dark:bg-secondary-500/5 rounded-full blur-3xl"></div>
      </header>

      {/* Developer-First Section */}
      <section className="py-16 md:py-24 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              Built for Developers, by Developers
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
              ModelShift AI gives you the tools to build, test, and deploy AI integrations faster
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mb-4">
                <Compass className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                API Explorer
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Test AI models with a powerful interface designed for developers. Compare responses side-by-side.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Side-by-side model comparison</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Parameter customization</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Response metrics and analysis</span>
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="w-12 h-12 bg-secondary-100 dark:bg-secondary-900/30 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-secondary-600 dark:text-secondary-400" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                Secure Key Management
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Manage API keys with enterprise-grade security. Your keys, your control.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>End-to-end encryption</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>BYOK architecture</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Server or client-side modes</span>
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="w-12 h-12 bg-accent-100 dark:bg-accent-900/30 rounded-lg flex items-center justify-center mb-4">
                <Repeat className="w-6 h-6 text-accent-600 dark:text-accent-400" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                Provider Switching
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Seamlessly switch between OpenAI, Gemini, Claude, and IBM WatsonX with one interface.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Unified API abstraction</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>No vendor lock-in</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Cost optimization</span>
                </li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                <Code className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                Code Generation
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Export configurations as production-ready code in multiple languages and frameworks.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>TypeScript/JavaScript</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Python/Django/Flask</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Next.js/Express</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose ModelShift AI Section */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              The ModelShift AI Advantage
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
              What sets us apart from other AI platforms in the market
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Competitive Edge 1 */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-lg">
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4 flex items-center">
                <Globe className="w-5 h-5 text-primary-500 mr-2" />
                <span>True Provider Independence</span>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Unlike platforms that lock you into a single AI provider, ModelShift AI gives you the freedom to use multiple providers simultaneously. This means:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">Cost Optimization</span>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Use more affordable models for simple tasks and premium models for complex reasoning, saving up to 70% on API costs.
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">Resilience Against Outages</span>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Automatic failover between providers ensures your AI services remain operational even when a provider experiences downtime.
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">Best-of-Breed Selection</span>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Choose the best model for each specific task rather than compromising with a one-size-fits-all approach.
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Competitive Edge 2 */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-lg">
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4 flex items-center">
                <Cpu className="w-5 h-5 text-secondary-500 mr-2" />
                <span>Advanced Prompt Engineering Tools</span>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Our platform offers sophisticated prompt engineering capabilities that most competitors lack:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">AI-Assisted Prompt Improvement</span>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Our system can analyze and enhance your prompts automatically, improving results by up to 40%.
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">Structured Prompt Framework</span>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Our proprietary prompt engineering framework helps you create more effective prompts with less effort.
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">Debate Arena</span>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Unique feature that allows you to compare different AI models in a structured debate format, revealing strengths and weaknesses.
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Competitive Edge 3 */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-lg">
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4 flex items-center">
                <Shield className="w-5 h-5 text-accent-500 mr-2" />
                <span>Enterprise-Grade Security</span>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                ModelShift AI offers security features that exceed industry standards:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">BYOK Architecture</span>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Your API keys are encrypted and never stored in plain text, with the option to keep them entirely client-side.
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">Dual Connection Modes</span>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Choose between secure server proxy mode or direct browser mode based on your security requirements.
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">Row-Level Security</span>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Database-level security ensures users can only access their own data, preventing data leakage.
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Competitive Edge 4 */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-lg">
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4 flex items-center">
                <Code className="w-5 h-5 text-purple-500 mr-2" />
                <span>Developer-First Approach</span>
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Built by developers, for developers, with features that make integration seamless:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">Comprehensive SDK</span>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      TypeScript and Python SDKs with full type safety and detailed documentation.
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">Configuration Portability</span>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Export and import configurations between environments and team members with ease.
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">Custom Provider Support</span>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Create and integrate custom AI providers beyond our built-in options, including private deployments.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Providers Section */}
      <section className="py-16 md:py-24 bg-neutral-100 dark:bg-neutral-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              Supported AI Providers
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
              Connect with the world's leading AI models through a single, unified interface
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* OpenAI */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-md hover:shadow-lg transition-all duration-200">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🤖</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">OpenAI GPT-4</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Advanced reasoning</p>
                </div>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                Access OpenAI's powerful GPT-4 and other models with advanced reasoning capabilities.
              </p>
            </div>

            {/* Google Gemini */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-md hover:shadow-lg transition-all duration-200">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">✨</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Google Gemini</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Multimodal AI</p>
                </div>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                Leverage Google's Gemini models for powerful multimodal capabilities at competitive pricing.
              </p>
            </div>

            {/* Anthropic Claude */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-md hover:shadow-lg transition-all duration-200">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🧠</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Anthropic Claude</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Nuanced understanding</p>
                </div>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                Utilize Claude's exceptional understanding of context and nuance for complex tasks.
              </p>
            </div>

            {/* IBM WatsonX */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-md hover:shadow-lg transition-all duration-200">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">💼</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">IBM WatsonX</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Enterprise-grade AI</p>
                </div>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                Harness IBM's enterprise-focused AI models with robust security and compliance features.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-12 md:p-12 lg:p-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Ready to transform your AI workflow?
              </h2>
              <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto mb-8">
                Join thousands of developers, researchers, and businesses using ModelShift AI to build better AI-powered applications.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={handleGetStarted}
                  className="px-8 py-3 bg-white text-primary-600 rounded-lg font-medium hover:bg-neutral-100 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Get Started Free
                </button>
                <button
                  onClick={handleTryDemo}
                  className="px-8 py-3 bg-transparent text-white border border-white/30 rounded-lg font-medium hover:bg-white/10 transition-all duration-200"
                >
                  Try Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-100 dark:bg-neutral-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-neutral-900 dark:text-white">ModelShift AI</span>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                The multi-LLM SaaS platform for AI orchestration, comparison, and management.
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-500">
                © 2025 ModelShift AI. All rights reserved.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-4">
                Product
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/features" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link to="/docs" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    Documentation
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800 text-center">
            <p className="text-sm text-neutral-500 dark:text-neutral-500">
              Built with Bolt. Powered by Supabase.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}