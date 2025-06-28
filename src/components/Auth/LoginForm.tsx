import React, { useState, useEffect } from 'react';
import { Brain, Mail, Lock, Eye, EyeOff, UserPlus, AlertTriangle, Info, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Link, useNavigate, useLocation } from 'react-router-dom';

interface LoginFormProps {
  isSignUp?: boolean;
}

export function LoginForm({ isSignUp = false }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(isSignUp ? 'signup' : 'signin');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Force redirect to /playground if user is already authenticated
  useEffect(() => {
    if (user && !loading) {
      console.log('User already authenticated, redirecting to /playground');
      navigate('/playground', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (activeTab === 'signup') {
        // Sign up flow
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }

        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }

        console.log('Attempting sign up for:', email);

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || email.split('@')[0],
              full_name: name || email.split('@')[0]
            }
          }
        });

        if (error) {
          console.error('Sign up error:', error);
          throw error;
        }

        console.log('Sign up response:', data);

        if (data.user && !data.session) {
          // Email confirmation required
          toast.success('Please check your email to confirm your account!');
        } else if (data.session) {
          // Auto-confirmed, user is logged in
          // Set default connection mode to browser for new users
          localStorage.setItem('modelshift-connection-mode', 'browser');
          toast.success('Account created successfully! Welcome to ModelShift AI!');
          // Redirect to playground
          navigate('/playground', { replace: true });
        }
      } else {
        // Sign in flow
        console.log('Attempting sign in for:', email);
        
        // Use direct Supabase auth call for better control
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) {
          console.error('Sign in error:', error);
          throw error;
        }
        
        console.log('Sign in successful:', data);
        toast.success('Welcome back to ModelShift AI!');
        
        // Redirect to playground
        navigate('/playground', { replace: true });
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      
      // Enhanced error handling with more specific messages
      if (error.message?.includes('Failed to fetch') || error.message?.includes('Network request failed')) {
        toast.error('Unable to connect. Please check your internet connection and try again.');
      } else if (error.message?.includes('Invalid API key') || error.message?.includes('Project not found')) {
        // Handle invalid Supabase configuration
        console.warn('Invalid Supabase configuration detected');
        toast.error('Authentication service configuration issue. Please check your environment variables.');
      } else if (error.message?.includes('Invalid login credentials')) {
        if (activeTab === 'signup') {
          toast.error('This email may already be registered. Try signing in instead.');
        } else {
          toast.error('Invalid email or password. Please try again.');
        }
      } else if (error.message?.includes('Email not confirmed')) {
        toast.error('Please check your email and confirm your account before signing in.');
      } else if (error.message?.includes('User already registered')) {
        toast.error('An account with this email already exists. Please sign in instead.');
        setActiveTab('signin'); // Switch to sign in mode
      } else if (error.message?.includes('Signup is disabled')) {
        toast.error('Account registration is currently disabled. Please contact support.');
      } else if (error.message?.includes('Email rate limit exceeded')) {
        toast.error('Too many attempts. Please wait a few minutes before trying again.');
      } else if (error.message?.includes('Password should be at least')) {
        toast.error('Password must be at least 6 characters long.');
      } else if (error.message?.includes('Unable to validate email address')) {
        toast.error('Please enter a valid email address.');
      } else {
        // Generic error with helpful context
        const errorMsg = error.message || 'Authentication failed. Please try again.';
        toast.error(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home Link */}
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span>Back to Home</span>
          </Link>
        </div>
        
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl mb-6">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            ModelShift AI
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Multi-LLM SaaS Platform for AI Orchestration
          </p>
        </div>

        {/* Configuration Issue Notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Authentication
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {activeTab === 'signup' 
                  ? 'Create a new account to access the ModelShift AI platform.'
                  : 'Sign in with your existing account or create a new one.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Login/Signup Card */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-8">
          {/* Tabs */}
          <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-6">
            <button
              onClick={() => setActiveTab('signin')}
              className={`flex-1 py-3 text-center font-medium ${
                activeTab === 'signin'
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-3 text-center font-medium ${
                activeTab === 'signup'
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
              {activeTab === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              {activeTab === 'signin' ? 'Sign in to access your AI playground' : 'Sign up to access your AI playground'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field (Sign Up Only) */}
            {activeTab === 'signup' && (
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
            {activeTab === 'signup' && (
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
                    {activeTab === 'signup' ? 'Creating Account...' : 'Signing In...'}
                  </span>
                </div>
              ) : (
                <>
                  {activeTab === 'signup' ? 'Create Account' : 'Sign In'}
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">
              © 2025 ModelShift AI. Built with advanced SaaS architecture.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}