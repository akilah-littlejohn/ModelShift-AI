import React, { useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoginForm } from './components/Auth/LoginForm';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { PlaygroundView } from './components/Playground/PlaygroundView';
import { AgentManagement } from './components/Agents/AgentManagement';
import { KeyManagement } from './components/Keys/KeyManagement';
import { AnalyticsView } from './components/Analytics/AnalyticsView';
import { HistoryView } from './components/History/HistoryView';
import { SDKDocsView } from './components/Docs/SDKDocsView';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [activeView, setActiveView] = useState('playground');

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

  if (!user) {
    return <LoginForm />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'playground':
        return <PlaygroundView />;
      case 'agents':
        return <AgentManagement />;
      case 'keys':
        return <KeyManagement />;
      case 'history':
        return <HistoryView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'sdk-docs':
        return <SDKDocsView />;
      default:
        return <PlaygroundView />;
    }
  };

  return (
    <div className="h-screen bg-neutral-50 dark:bg-neutral-900 flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
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
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;