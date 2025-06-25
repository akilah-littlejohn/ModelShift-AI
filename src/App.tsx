import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { supabase, isUuid } from './lib/supabase';
import { LoginForm } from './components/Auth/LoginForm';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { PlaygroundView } from './components/Playground/PlaygroundView';
import { DebateView } from './components/Playground/DebateView';
import { AgentManagement } from './components/Agents/AgentManagement';
import { KeyManagement } from './components/Keys/KeyManagement';
import { HistoryView } from './components/History/HistoryView';
import { SDKDocsView } from './components/Docs/SDKDocsView';
import { SettingsView } from './components/Settings/SettingsView';
import { LandingPage } from './components/Landing/LandingPage';
import { PricingPage } from './components/Landing/PricingPage';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [activeView, setActiveView] = useState('playground');
  const [showLanding, setShowLanding] = useState(true);

  // Check if we should show the landing page or the app
  useEffect(() => {
    // If user is logged in, don't show landing page
    if (user) {
      setShowLanding(false);
    }
    
    // Check URL path - if it's not the root, don't show landing page
    const path = window.location.pathname;
    if (path !== '/' && path !== '/pricing') {
      setShowLanding(false);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400">Loading ModelShift AI...</p>
        </div>
      </div>
    );
  }

  // Show landing page for non-authenticated users on root path
  if (showLanding && !user) {
    return (
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/signup" element={<LoginForm isSignUp={true} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    );
  }

  // Show login form for non-authenticated users
  if (!user) {
    return <LoginForm />;
  }

  // Show app for authenticated users
  return (
    <Router>
      <div className="h-screen bg-neutral-50 dark:bg-neutral-900 flex flex-col">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar activeView={activeView} onViewChange={setActiveView} />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<PlaygroundView />} />
              <Route path="/playground" element={<PlaygroundView />} />
              <Route path="/debate" element={<DebateView />} />
              <Route path="/agents" element={<AgentManagement />} />
              <Route path="/keys" element={<KeyManagement />} />
              <Route path="/history" element={<HistoryView />} />
              <Route path="/sdk-docs" element={<SDKDocsView />} />
              <Route path="/settings" element={<SettingsView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#f9fafb',
              border: '1px solid #374151',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#f9fafb',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#f9fafb',
              },
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;