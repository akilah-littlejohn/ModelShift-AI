import React from 'react';
import { TrendingUp, Clock, DollarSign, Zap, Activity, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const usageData = [
  { date: '2024-01-01', requests: 45, cost: 2.3 },
  { date: '2024-01-02', requests: 67, cost: 3.2 },
  { date: '2024-01-03', requests: 89, cost: 4.1 },
  { date: '2024-01-04', requests: 123, cost: 5.8 },
  { date: '2024-01-05', requests: 156, cost: 7.2 },
  { date: '2024-01-06', requests: 178, cost: 8.9 },
  { date: '2024-01-07', requests: 201, cost: 10.4 },
];

const providerData = [
  { name: 'OpenAI', value: 40, cost: 15.2, color: '#10A37F' },
  { name: 'Claude', value: 30, cost: 12.8, color: '#D97706' },
  { name: 'Gemini', value: 20, cost: 3.4, color: '#4285F4' },
  { name: 'IBM WatsonX', value: 10, cost: 8.6, color: '#054ADA' },
];

const agentData = [
  { name: 'Business Names', requests: 89, success: 96 },
  { name: 'SaaS Pitch', requests: 67, success: 94 },
  { name: 'Support Tickets', requests: 156, success: 98 },
];

export function AnalyticsView() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          Analytics Dashboard
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Monitor your AI usage, costs, and performance metrics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Requests"
          value="1,247"
          change="+12.5%"
          icon={Activity}
          color="primary"
        />
        <MetricCard
          title="Total Spend"
          value="$89.32"
          change="+8.2%"
          icon={DollarSign}
          color="accent"
        />
        <MetricCard
          title="Avg Response Time"
          value="1.2s"
          change="-5.3%"
          icon={Clock}
          color="secondary"
        />
        <MetricCard
          title="Success Rate"
          value="98.7%"
          change="+0.8%"
          icon={TrendingUp}
          color="emerald"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Usage Trend */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Usage Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
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
        </div>

        {/* Provider Distribution */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Provider Usage
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={providerData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}
                labelLine={false}
              >
                {providerData.map((entry, index) => (
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
        </div>

        {/* Agent Performance */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Agent Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={agentData}>
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
        </div>

        {/* Cost Analysis */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Cost Breakdown
          </h3>
          <div className="space-y-4">
            {providerData.map(provider => (
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
                    ${provider.cost.toFixed(2)}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    {provider.value}% of usage
                  </div>
                </div>
              </div>
            ))}
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