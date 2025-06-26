import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Brain, Moon, Sun, User, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export function LandingHeader({ theme, toggleTheme }: { theme: string; toggleTheme: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  return (
    <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                ModelShift AI
              </h1>
            </div>
          </Link>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <nav className="flex items-center space-x-6">
              <Link to="/features" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                Features
              </Link>
              <Link to="/pricing" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                Pricing
              </Link>
              <Link to="/docs" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                Documentation
              </Link>
            </nav>
            
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                ) : (
                  <Sun className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                )}
              </button>
              
              {/* Auth Links */}
              <Link
                to="/login"
                className="px-4 py-2 text-neutral-700 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
          <div className="px-4 py-3 space-y-3">
            <nav className="flex flex-col space-y-3 pt-2">
              <Link 
                to="/features" 
                className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link 
                to="/pricing" 
                className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link 
                to="/docs" 
                className="text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Documentation
              </Link>
            </nav>
            
            <div className="flex flex-col space-y-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex justify-between items-center">
                <span className="text-neutral-600 dark:text-neutral-400">Dark Mode</span>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  aria-label="Toggle theme"
                >
                  {theme === 'light' ? (
                    <Moon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  ) : (
                    <Sun className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  )}
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-center border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 text-center bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function Header() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Check if we're on a landing page
  const isLandingPage = location.pathname === '/' || location.pathname === '/pricing';
  
  // If we're on a landing page and not logged in, show the landing header
  if (isLandingPage && !user) {
    return <LandingHeader theme={theme} toggleTheme={toggleTheme} />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                ModelShift AI
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Multi-LLM SaaS Platform
              </p>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* User Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Usage Indicator */}
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full">
              <div className="w-2 h-2 bg-accent-500 rounded-full"></div>
              <span className="text-sm text-neutral-600 dark:text-neutral-300">
                {user?.usage_count || 0}/{user?.usage_limit || 100}
              </span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              ) : (
                <Sun className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              )}
            </button>

            {/* User Menu */}
            <div className="relative group">
              <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {user?.name}
                </span>
              </button>

              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">{user?.name}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{user?.email}</p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 mt-1">
                    {user?.plan} plan
                  </span>
                </div>
                <div className="p-1">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
          <div className="px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                <div className="w-2 h-2 bg-accent-500 rounded-full"></div>
                <span className="text-sm text-neutral-600 dark:text-neutral-300">
                  {user?.usage_count || 0}/{user?.usage_limit || 100}
                </span>
              </div>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                ) : (
                  <Sun className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                )}
              </button>
            </div>
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">{user?.name}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{user?.email}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors mt-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}