import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Brain, Zap, Shield } from 'lucide-react';

export function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950">
      {/* Header */}
      <header className="pt-16 md:pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
            Choose the plan that's right for you and start building with ModelShift AI today
          </p>
        </div>
      </header>

      {/* Pricing Table */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Free Plan */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-lg overflow-hidden">
              <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Free</h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-neutral-900 dark:text-white">$0</span>
                  <span className="text-neutral-500 dark:text-neutral-400 ml-2">/month</span>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-4">
                  Perfect for individuals exploring AI capabilities
                </p>
              </div>
              <div className="p-6 space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-600 dark:text-neutral-400">100 AI requests per month</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-600 dark:text-neutral-400">Access to all AI providers</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-600 dark:text-neutral-400">Basic prompt agents</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-600 dark:text-neutral-400">Secure API key storage</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-600 dark:text-neutral-400">7-day execution history</span>
                  </li>
                </ul>
                <Link
                  to="/signup"
                  className="block w-full text-center px-6 py-3 bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white rounded-lg font-medium hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors mt-6"
                >
                  Get Started
                </Link>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border-2 border-primary-500 shadow-xl overflow-hidden transform md:scale-105 z-10">
              <div className="bg-primary-500 text-white text-center py-2 text-sm font-medium">
                MOST POPULAR
              </div>
              <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Pro</h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-neutral-900 dark:text-white">$29</span>
                  <span className="text-neutral-500 dark:text-neutral-400 ml-2">/month</span>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-4">
                  For professionals and small teams
                </p>
              </div>
              <div className="p-6 space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-600 dark:text-neutral-400">2,500 AI requests per month</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-600 dark:text-neutral-400">Access to all AI providers</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-600 dark:text-neutral-400">Advanced prompt agents</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-600 dark:text-neutral-400">AI Debate Arena</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-600 dark:text-neutral-400">Advanced analytics</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-600 dark:text-neutral-400">30-day execution history</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-600 dark:text-neutral-400">API access</span>
                  </li>
                </ul>
                <Link
                  to="/signup?plan=pro"
                  className="block w-full text-center px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg font-medium hover:from-primary-600 hover:to-secondary-600 transition-all duration-200 mt-6"
                >
                  Subscribe to Pro
                </Link>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-lg overflow-hidden">
              <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Enterprise</h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-neutral-900 dark:text-white">Custom</span>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-4">
                  For organizations with advanced needs
                </p>
              </div>
              <div className="p-6 space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-600 dark:text-neutral-400">Unlimited AI requests</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-600 dark:text-neutral-400">Custom AI provider integration</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-600 dark:text-neutral-400">Advanced security features</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-600 dark:text-neutral-400">Dedicated support</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-600 dark:text-neutral-400">Custom analytics</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-600 dark:text-neutral-400">Unlimited history</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-600 dark:text-neutral-400">SSO & team management</span>
                  </li>
                </ul>
                <Link
                  to="/contact"
                  className="block w-full text-center px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors mt-6"
                >
                  Contact Sales
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24 bg-neutral-100 dark:bg-neutral-900/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Everything you need to know about ModelShift AI
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                How does ModelShift AI handle API keys?
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                ModelShift AI uses a BYOK (Bring Your Own Key) architecture. Your API keys are encrypted before storage and are only accessible by you. We never store your raw API keys on our servers. You can choose between server-side proxy mode (more secure) or direct browser mode for development.
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                Do I need to provide my own API keys?
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                Yes, ModelShift AI requires you to provide your own API keys for the AI providers you want to use. This gives you full control over your usage and billing. We provide easy-to-follow instructions for obtaining and configuring API keys for each supported provider.
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                Can I use ModelShift AI in my own applications?
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                Yes! ModelShift AI provides a comprehensive SDK and API that you can use to integrate our platform into your own applications. Our documentation includes examples for TypeScript/JavaScript, Python (coming soon), and RESTful API access.
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                How does billing work?
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                ModelShift AI charges a flat monthly fee based on your plan. You're responsible for the costs of API calls to the providers you use. We provide detailed analytics to help you track your usage and costs across all providers.
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                Can I cancel my subscription anytime?
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                Yes, you can cancel your subscription at any time. Your subscription will remain active until the end of your current billing period. After that, your account will be downgraded to the Free plan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-12 md:p-12 lg:p-16 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Start building with ModelShift AI today
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
                  to="/contact"
                  className="px-8 py-3 bg-transparent text-white border border-white/30 rounded-lg font-medium hover:bg-white/10 transition-all duration-200"
                >
                  Contact Sales
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