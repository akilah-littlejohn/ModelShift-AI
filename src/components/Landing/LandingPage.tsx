import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, Zap, Layers, Code, Lock, BarChart2, Sparkles, ArrowRight, CheckCircle, Globe, Shield, Cpu } from 'lucide-react';

export function LandingPage() {
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
                ModelShift AI
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-300 max-w-3xl mx-auto mb-8">
              The multi-LLM SaaS platform for AI orchestration, comparison, and management
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                to="/signup"
                className="px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg font-medium hover:from-primary-600 hover:to-secondary-600 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Get Started Free
              </Link>
              <Link
                to="/playground"
                className="px-6 py-3 bg-white dark:bg-neutral-800 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 rounded-lg font-medium hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Try Demo
              </Link>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-500/10 dark:bg-primary-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary-500/10 dark:bg-secondary-500/5 rounded-full blur-3xl"></div>
      </header>

      {/* Why Choose ModelShift AI Section */}
      <section className="py-16 md:py-24 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              Why Choose ModelShift AI?
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
              Our platform offers unique advantages that set us apart from other AI solutions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Advantage 1 */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mb-4">
                <Layers className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                True Multi-Provider Orchestration
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Unlike single-vendor solutions, ModelShift AI lets you seamlessly switch between OpenAI, Google Gemini, Anthropic Claude, and IBM WatsonX through one unified interface.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Side-by-side model comparison</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>No vendor lock-in</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Automatic fallback between providers</span>
                </li>
              </ul>
            </div>

            {/* Advantage 2 */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="w-12 h-12 bg-secondary-100 dark:bg-secondary-900/30 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-secondary-600 dark:text-secondary-400" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                Superior Security Architecture
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Our BYOK (Bring Your Own Key) architecture ensures your API keys remain under your control. Choose between secure server-side proxy or direct browser mode for maximum flexibility.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>End-to-end encryption</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>No API key storage on our servers</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Enterprise-grade security controls</span>
                </li>
              </ul>
            </div>

            {/* Advantage 3 */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="w-12 h-12 bg-accent-100 dark:bg-accent-900/30 rounded-lg flex items-center justify-center mb-4">
                <Cpu className="w-6 h-6 text-accent-600 dark:text-accent-400" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                Advanced Prompt Engineering
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Our platform offers sophisticated prompt engineering tools that competitors lack, including AI-assisted prompt improvement and structured prompt templates.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>AI-powered prompt enhancement</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Reusable prompt templates</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Structured prompt engineering framework</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              One Platform, Multiple AI Models
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
              Compare responses from leading AI providers side-by-side and build powerful workflows
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mb-4">
                <Layers className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                Multi-Provider Support
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Seamlessly integrate with OpenAI, Google Gemini, Anthropic Claude, and IBM WatsonX through a unified interface.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Side-by-side model comparison</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Unified API for all providers</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Bring your own API keys</span>
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="w-12 h-12 bg-secondary-100 dark:bg-secondary-900/30 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-secondary-600 dark:text-secondary-400" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                Prompt Agent Management
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Create, customize, and manage prompt agents with specialized templates and behaviors for different use cases.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Custom prompt templates</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Advanced prompt engineering</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Reusable prompt patterns</span>
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="w-12 h-12 bg-accent-100 dark:bg-accent-900/30 rounded-lg flex items-center justify-center mb-4">
                <BarChart2 className="w-6 h-6 text-accent-600 dark:text-accent-400" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                Analytics Dashboard
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Track usage, costs, and performance metrics across all your AI interactions in one centralized dashboard.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Usage tracking and metrics</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Cost estimation</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Performance comparison</span>
                </li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                AI Debate Arena
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Compare different AI models in a structured debate format to evaluate reasoning, knowledge, and capabilities.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Multi-round debates</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Position comparison</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Export debate transcripts</span>
                </li>
              </ul>
            </div>

            {/* Feature 5 */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                <Code className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                Developer SDK
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Integrate ModelShift AI into your applications with our comprehensive SDK and API documentation.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>TypeScript/JavaScript SDK</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>Python SDK (coming soon)</span>
                </li>
                <li className="flex items-center text-sm text-neutral-600 dark:text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>RESTful API access</span>
                </li>
              </ul>
            </div>

            {/* Feature 6 */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                Secure API Key Management
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Securely store and manage your API keys with enterprise-grade encryption and access controls.
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
                  <span>Server-side proxy mode</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Competitive Edge Section */}
      <section className="py-16 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20">
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
                <Link
                  to="/signup"
                  className="px-8 py-3 bg-white text-primary-600 rounded-lg font-medium hover:bg-neutral-100 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Get Started Free
                </Link>
                <Link
                  to="/docs"
                  className="px-8 py-3 bg-transparent text-white border border-white/30 rounded-lg font-medium hover:bg-white/10 transition-all duration-200"
                >
                  View Documentation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-100 dark:bg-neutral-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
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
                <li>
                  <Link to="/changelog" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    Changelog
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-4">
                Resources
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/blog" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link to="/tutorials" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    Tutorials
                  </Link>
                </li>
                <li>
                  <Link to="/sdk" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    SDK
                  </Link>
                </li>
                <li>
                  <Link to="/support" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    Support
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wider mb-4">
                Company
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/about" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link to="/careers" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    Terms
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