import React, { useState } from 'react';
import { Brain, Mail, Lock, Eye, EyeOff, UserPlus, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showDemoInfo, setShowDemoInfo] = useState(false);
  const { login } = useAuth();

  // Check if we're using demo/development environment
  const isDemoEnvironment = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    return !supabaseUrl || !supabaseAnonKey || 
           supabaseUrl.includes('demo') || supabaseAnonKey.includes('demo');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign up flow
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }

        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || email.split('@')[0]
            }
          }
        });

        if (error) {
          throw error;
        }

        if (data.user && !data.session) {
          toast.success('Please check your email to confirm your account!');
        } else {
          toast.success('Account created successfully!');
        }
      } else {
        // Sign in flow
        await login(email, password);
        toast.success('Welcome back to ModelShift AI!');
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      
      // Enhanced error handling with more specific messages
      if (error.message?.includes('Invalid login credentials')) {
        if (isSignUp) {
          toast.error('Sign up failed. This email may already be registered. Try signing in instead.');
        } else {
          toast.error('Invalid email or password. Please check your credentials and try again.');
        }
      } else if (error.message?.includes('Email not confirmed')) {
        toast.error('Please check your email and confirm your account before signing in.');
      } else if (error.message?.includes('User already registered')) {
        toast.error('An account with this email already exists. Please sign in instead.');
        setIsSignUp(false); // Switch to sign in mode
      } else if (error.message?.includes('Signup is disabled')) {
        toast.error('Account registration is currently disabled. Please contact the administrator.');
      } else if (error.message?.includes('Email rate limit exceeded')) {
        toast.error('Too many email attempts. Please wait a few minutes before trying again.');
      } else if (error.message?.includes('Password should be at least')) {
        toast.error('Password must be at least 6 characters long.');
      } else if (error.message?.includes('Unable to validate email address')) {
        toast.error('Please enter a valid email address.');
      } else if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
        toast.error('Network error. Please check your internet connection and try again.');
      } else {
        // Generic error with helpful context
        const errorMsg = error.message || 'Authentication failed. Please try again.';
        toast.error(errorMsg);
        
        // Show demo info if in demo environment and authentication fails
        if (isDemoEnvironment() && !isSignUp) {
          setShowDemoInfo(true);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setEmail('demo@modelshift.ai');
    setPassword('demo123');
    setShowDemoInfo(false);
    toast.info('Demo credentials filled. Click Sign In to continue.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            ModelShift AI
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Multi-LLM SaaS Platform for AI Orchestration
          </p>
        </div>

        {/* Demo Environment Notice */}
        {isDemoEnvironment() && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Demo Environment
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                  You're using a demo version. Create an account to test the authentication flow, or use demo credentials.
                </p>
                <button
                  onClick={handleDemoLogin}
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                >
                  Use Demo Credentials
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Demo Info Modal */}
        {showDemoInfo && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                  Authentication Failed
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                  If you're testing the demo, you can either create a new account or use the demo credentials.
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={handleDemoLogin}
                    className="text-sm bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700 transition-colors"
                  >
                    Use Demo Login
                  </button>
                  <button
                    onClick={() => {
                      setIsSignUp(true);
                      setShowDemoInfo(false);
                    }}
                    className="text-sm border border-amber-600 text-amber-600 px-3 py-1 rounded hover:bg-amber-50 transition-colors"
                  >
                    Create Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Login/Signup Card */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              {isSignUp ? 'Sign up to access your AI playground' : 'Sign in to access your AI playground'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field (Sign Up Only) */}
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white transition-colors"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white transition-colors"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field (Sign Up Only) */}
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white transition-colors"
                    placeholder="Confirm your password"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white py-3 rounded-lg font-medium hover:from-primary-600 hover:to-secondary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2">
                    {isSignUp ? 'Creating Account...' : 'Signing In...'}
                  </span>
                </div>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          {/* Toggle Sign Up/Sign In */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setPassword('');
                setConfirmPassword('');
                setName('');
                setShowDemoInfo(false);
              }}
              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"
              }
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">
            © 2024 ModelShift AI. Built with advanced SaaS architecture.
          </p>
        </div>
      </div>
    </div>
  );
}