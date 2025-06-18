import React, { useState } from 'react';
import { UserCog, Key, Bell, ShieldCheck, Database, Zap, User, CreditCard } from 'lucide-react';
import { ApiKeysSettings } from './ApiKeysSettings';
import { useAuth } from '../../contexts/AuthContext';

export function SettingsView() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('api-keys');

  const tabs = [
    { id: 'api-keys', name: 'API Keys', icon: Key },
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: ShieldCheck },
    { id: 'billing', name: 'Billing', icon: CreditCard },
    { id: 'advanced', name: 'Advanced', icon: Zap },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'api-keys':
        return <ApiKeysSettings />;
      case 'profile':
        return <ProfileSettings />;
      default:
        const currentTab = tabs.find(tab => tab.id === activeTab);
        const IconComponent = currentTab?.icon || Key;
        
        return (
          <div className="max-w-4xl mx-auto p-6 text-center">
            <div className="py-12">
              <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <IconComponent className="w-8 h-8 text-neutral-400" />
              </div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                {currentTab?.name} Settings
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                This feature is coming soon.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
            Account Settings
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-2">
            Manage your account preferences and settings
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full md:w-64 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
            <div className="flex items-center space-x-3 mb-6 p-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full flex items-center justify-center">
                <UserCog className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-neutral-900 dark:text-white">
                  {user?.name}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {user?.email}
                </p>
              </div>
            </div>

            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSettings() {
  const { user } = useAuth();
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          Profile Settings
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Manage your personal information and preferences
        </p>
      </div>
      
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
              {user?.name}
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              {user?.email}
            </p>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 mt-1">
              {user?.plan} plan
            </span>
          </div>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              defaultValue={user?.name}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              defaultValue={user?.email}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
              disabled
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Email address cannot be changed
            </p>
          </div>
          
          <div className="pt-4 flex justify-end">
            <button className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}