import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Clock, DollarSign, Zap, Activity, Users, RefreshCw, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { db } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { providers } from '../../data/providers';
import { AgentService } from '../../lib/agents';
import type { PromptExecution } from '../../types';

interface AnalyticsData {
  totalRequests: number;
  totalSpend: number;
  avgResponseTime: number;
  successRate: number;
  usageData: Array<{ date: string; requests: number; cost: number }>;
  providerData: Array<{ name: string; value: number; cost: number; color: string }>;
  agentData: Array<{ name: string; requests: number; success: number }>;
}

export function AnalyticsView() {
  const { user } = useAuth();
  const [executions, setExecutions] = useState<PromptExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(true);

  const loadAnalyticsData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if Supabase is properly configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('demo') || supabaseKey.includes('demo')) {
        setIsSupabaseConfigured(false);
        setError('Supabase is not configured. Please set up your Supabase environment variables.');
        setIsLoading(false);
        return;
      }

      const data = await db.prompts.getByUserId(user.id, 100); // Get last 100 executions
      setExecutions(data);
      setIsSupabaseConfigured(true);
    } catch (err) {
      console.error('Failed to load analytics data:', err);
      
      // Enhanced error handling
      if (err instanceof Error) {
        if (err.message.includes('404') || err.message.includes('not found')) {
          setError('Database tables not found. Please run the Supabase migrations to set up the required tables.');
        } else if (err.message.includes('permission') || err.message.includes('RLS') || err.message.includes('policy')) {
          setError('Database permission error. Please check your Supabase Row Level Security policies.');
        } else if (err.message.includes('Invalid or missing')) {
          setError('Supabase configuration error. Please check your environment variables.');
          setIsSupabaseConfigured(false);
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          setError('Network error. Please check your internet connection and Supabase URL.');
        } else {
          setError(`Database error: ${err.message}`);
        }
      } else {
        setError('An unknown error occurred while loading analytics data.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [user]);

  const analyticsData: AnalyticsData = useMemo(() => {
    if (executions.length === 0) {
      return {
        totalRequests: 0,
        totalSpend: 0,
        avgResponseTime: 0,
        successRate: 0,
        usageData: [],
        providerData: [],
        agentData: []
      };
    }

    // Calculate total metrics
    const totalRequests = executions.length;
    let totalResponseTime = 0;
    let totalSuccessfulResponses = 0;
    let totalResponses = 0;
    let totalSpend = 0;

    // Provider usage tracking
    const providerUsage: Record<string, { count: number; cost: number }> = {};
    
    // Agent usage tracking
    const agentUsage: Record<string, { requests: number; success: number }> = {};

    // Daily usage tracking
    const dailyUsage: Record<string, { requests: number; cost: number }> = {};

    executions.forEach(execution => {
      // Track daily usage
      const date = new Date(execution.created_at).toISOString().split('T')[0];
      if (!dailyUsage[date]) {
        dailyUsage[date] = { requests: 0, cost: 0 };
      }
      dailyUsage[date].requests += 1;

      // Track agent usage
      const agentName = execution.agent_type === 'direct' ? 'Direct Input' : 
        AgentService.getAgent(execution.agent_type)?.name || execution.agent_type;
      
      if (!agentUsage[agentName]) {
        agentUsage[agentName] = { requests: 0, success: 0 };
      }
      agentUsage[agentName].requests += 1;

      // Process each provider response
      execution.responses.forEach(response => {
        totalResponses += 1;
        totalResponseTime += response.latency;

        if (response.success) {
          totalSuccessfulResponses += 1;
          agentUsage[agentName].success += 1;
        }

        // Calculate cost based on tokens and provider pricing
        const provider = providers.find(p => p.id === response.provider);
        let cost = 0;
        if (provider && response.tokens > 0) {
          cost = (response.tokens * provider.capabilities.pricing.output) / 1000;
        }
        totalSpend += cost;
        dailyUsage[date].cost += cost;

        // Track provider usage
        if (!providerUsage[response.provider]) {
          providerUsage[response.provider] = { count: 0, cost: 0 };
        }
        providerUsage[response.provider].count += 1;
        providerUsage[response.provider].cost += cost;
      });
    });

    // Calculate averages
    const avgResponseTime = totalResponses > 0 ? totalResponseTime / totalResponses : 0;
    const successRate = totalResponses > 0 ? (totalSuccessfulResponses / totalResponses) * 100 : 0;

    // Prepare usage data for chart (last 7 days)
    const usageData = Object.entries(dailyUsage)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString(),
        requests: data.requests,
        cost: Number(data.cost.toFixed(4))
      }));

    // Prepare provider data for pie chart
    const totalProviderRequests = Object.values(providerUsage).reduce((sum, p) => sum + p.count, 0);
    const providerData = Object.entries(providerUsage).map(([providerId, data]) => {
      const provider = providers.find(p => p.id === providerId);
      return {
        name: provider?.displayName || providerId,
        value: totalProviderRequests > 0 ? Math.round((data.count / totalProviderRequests) * 100) : 0,
        cost: Number(data.cost.toFixed(4)),
        color: provider?.color || '#6b7280'
      };
    });

    // Prepare agent data for bar chart
    const agentData = Object.entries(agentUsage)
      .map(([name, data]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        requests: data.requests,
        success: Math.round((data.success / Math.max(data.requests, 1)) * 100)
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 5); // Top 5 agents

    return {
      totalRequests,
      totalSpend: Number(totalSpend.toFixed(4)),
      avgResponseTime: Math.round(avgResponseTime),
      successRate: Number(successRate.toFixed(1)),
      usageData,
      providerData,
      agentData
    };
  }, [executions]);

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
              
              {!isSupabaseConfigured && (
                <div className="bg-red-100 dark:bg-red-900/40 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">
                    Supabase Setup Required
                  </h4>
                  <div className="text-sm text-red-700 dark:text-red-300 space-y-2">
                    <p>To enable analytics, you need to:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-4">
                      <li>Create a Supabase project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline">supabase.com</a></li>
                      <li>Set up your environment variables in the .env file</li>
                      <li>Run the database migrations to create required tables</li>
                    </ol>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-3">
                <button
                  onClick={loadAnalyticsData}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry</span>
                </button>
                
                {isSupabaseConfigured && (
                  <button
                    onClick={() => {
                      setError(null);
                      setExecutions([]);
                    }}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-neutral-600 text-white rounded-lg hover:bg-neutral-700 transition-colors"
                  >
                    <span>Continue Without Analytics</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (executions.length === 0) {
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
        <button
          onClick={loadAnalyticsData}
          className="flex items-center space-x-2 px-3 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
          title="Refresh data"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Requests"
          value={analyticsData.totalRequests.toLocaleString()}
          change={executions.length > 0 ? "+100%" : "0%"}
          icon={Activity}
          color="primary"
        />
        <MetricCard
          title="Total Spend"
          value={`$${analyticsData.totalSpend.toFixed(4)}`}
          change={analyticsData.totalSpend > 0 ? "+100%" : "0%"}
          icon={DollarSign}
          color="accent"
        />
        <MetricCard
          title="Avg Response Time"
          value={`${analyticsData.avgResponseTime}ms`}
          change="0%"
          icon={Clock}
          color="secondary"
        />
        <MetricCard
          title="Success Rate"
          value={`${analyticsData.successRate}%`}
          change={analyticsData.successRate > 90 ? "+5%" : "0%"}
          icon={TrendingUp}
          color="emerald"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Usage Trend */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Usage Trend (Last 7 Days)
          </h3>
          {analyticsData.usageData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.usageData}>
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
              No usage data available
            </div>
          )}
        </div>

        {/* Provider Distribution */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Provider Usage
          </h3>
          {analyticsData.providerData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.providerData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                  labelLine={false}
                >
                  {analyticsData.providerData.map((entry, index) => (
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
          {analyticsData.agentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.agentData}>
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
            {analyticsData.providerData.length > 0 ? (
              analyticsData.providerData.map(provider => (
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