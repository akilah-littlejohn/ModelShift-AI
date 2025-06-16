import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Clock, DollarSign, Zap, Activity, Users, RefreshCw, AlertTriangle, Calendar, Filter } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { analyticsService } from '../../lib/analytics/AnalyticsService';
import { useAuth } from '../../contexts/AuthContext';
import type { AnalyticsSummary } from '../../lib/analytics/types';

type TimeRange = '7d' | '30d' | '90d';

export function AnalyticsView() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  const loadAnalyticsData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      // Set start date based on selected time range
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
      }

      const analyticsData = analyticsService.getAnalyticsSummary(user.id, startDate, endDate);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to load analytics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [user, timeRange]);

  const filteredAnalytics = useMemo(() => {
    if (!analytics || !selectedProvider) return analytics;
    
    // Filter analytics data by selected provider
    return {
      ...analytics,
      providerData: analytics.providerData.filter(p => p.name.toLowerCase().includes(selectedProvider.toLowerCase())),
      usageData: analytics.usageData, // Keep usage data as is for now
      agentData: analytics.agentData // Keep agent data as is for now
    };
  }, [analytics, selectedProvider]);

  const syncQueueStatus = analyticsService.getSyncQueueStatus();

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Monitor your AI usage, costs, and performance metrics
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" />
            <p className="text-neutral-500 dark:text-neutral-400">Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Monitor your AI usage, costs, and performance metrics
          </p>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-red-900 dark:text-red-100 mb-2">
                Error Loading Analytics
              </h3>
              <p className="text-red-700 dark:text-red-300 mb-4">
                {error}
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={loadAnalyticsData}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics || analytics.totalRequests === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Monitor your AI usage, costs, and performance metrics
          </p>
        </div>
        
        {/* Sync Status */}
        {syncQueueStatus.pending > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                  Sync Status
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {syncQueueStatus.pending} events pending sync to Supabase
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="text-center py-12 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <Activity className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
            No Analytics Data Yet
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Start using the AI playground to see your analytics data here
          </p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={loadAnalyticsData}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayAnalytics = filteredAnalytics || analytics;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-center flex-1">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Monitor your AI usage, costs, and performance metrics
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Time Range Selector */}
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>

            {/* Provider Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
              >
                <option value="">All Providers</option>
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
                <option value="claude">Anthropic Claude</option>
                <option value="ibm">IBM WatsonX</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Sync Status */}
            {syncQueueStatus.pending > 0 && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                <RefreshCw className="w-3 h-3" />
                <span>{syncQueueStatus.pending} pending sync</span>
              </div>
            )}
            
            <button
              onClick={loadAnalyticsData}
              className="flex items-center space-x-2 px-3 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Requests"
          value={displayAnalytics.totalRequests.toLocaleString()}
          change={displayAnalytics.totalRequests > 0 ? "+100%" : "0%"}
          icon={Activity}
          color="primary"
        />
        <MetricCard
          title="Total Spend"
          value={`$${displayAnalytics.totalSpend.toFixed(4)}`}
          change={displayAnalytics.totalSpend > 0 ? "+100%" : "0%"}
          icon={DollarSign}
          color="accent"
        />
        <MetricCard
          title="Avg Response Time"
          value={`${displayAnalytics.avgResponseTime}ms`}
          change="0%"
          icon={Clock}
          color="secondary"
        />
        <MetricCard
          title="Success Rate"
          value={`${displayAnalytics.successRate}%`}
          change={displayAnalytics.successRate > 90 ? "+5%" : "0%"}
          icon={TrendingUp}
          color="emerald"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Usage Trend */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Usage Trend ({timeRange})
          </h3>
          {displayAnalytics.usageData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={displayAnalytics.usageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f9fafb'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="requests" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-neutral-500 dark:text-neutral-400">
              No usage data available for selected time range
            </div>
          )}
        </div>

        {/* Provider Distribution */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Provider Usage
          </h3>
          {displayAnalytics.providerData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={displayAnalytics.providerData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                  labelLine={false}
                >
                  {displayAnalytics.providerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f9fafb'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-neutral-500 dark:text-neutral-400">
              No provider data available
            </div>
          )}
        </div>

        {/* Agent Performance */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Top Agent Performance
          </h3>
          {displayAnalytics.agentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={displayAnalytics.agentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f9fafb'
                  }}
                />
                <Bar dataKey="requests" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-neutral-500 dark:text-neutral-400">
              No agent data available
            </div>
          )}
        </div>

        {/* Cost Breakdown */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Cost Breakdown
          </h3>
          <div className="space-y-4">
            {displayAnalytics.providerData.length > 0 ? (
              displayAnalytics.providerData.map(provider => (
                <div key={provider.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: provider.color }}
                    ></div>
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {provider.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                      ${provider.cost.toFixed(4)}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {provider.value}% of usage
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                No cost data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Time Range Summary */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          Summary for {timeRange === '7d' ? 'Last 7 Days' : timeRange === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {displayAnalytics.totalRequests}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">Total Requests</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-600 dark:text-accent-400">
              ${displayAnalytics.totalSpend.toFixed(2)}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">Total Spend</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-secondary-600 dark:text-secondary-400">
              {displayAnalytics.successRate}%
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">Success Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'primary' | 'secondary' | 'accent' | 'emerald';
}

function MetricCard({ title, value, change, icon: Icon, color }: MetricCardProps) {
  const colorClasses = {
    primary: 'from-primary-500 to-primary-600',
    secondary: 'from-secondary-500 to-secondary-600',
    accent: 'from-accent-500 to-accent-600',
    emerald: 'from-emerald-500 to-emerald-600',
  };

  const isPositive = change.startsWith('+');

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
          {title}
        </h3>
        <div className={`w-10 h-10 bg-gradient-to-br ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-bold text-neutral-900 dark:text-white">
          {value}
        </div>
        <div className={`text-sm font-medium ${
          isPositive 
            ? 'text-emerald-600 dark:text-emerald-400' 
            : 'text-red-600 dark:text-red-400'
        }`}>
          {change}
        </div>
      </div>
    </div>
  );
}