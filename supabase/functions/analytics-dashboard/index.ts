import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers must be included in all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface AnalyticsRequest {
  userId: string;
  startDate: string;
  endDate: string;
  providers?: string[];
  agents?: string[];
}

interface AnalyticsResponse {
  summary: {
    totalRequests: number;
    totalSpend: number;
    avgResponseTime: number;
    successRate: number;
  };
  usageData: Array<{ date: string; requests: number; cost: number }>;
  providerData: Array<{ name: string; value: number; cost: number; color: string }>;
  agentData: Array<{ name: string; requests: number; success: number }>;
  insights: Array<{
    type: string;
    severity: string;
    title: string;
    description: string;
    recommendation?: string;
  }>;
}

serve(async (req) => {
  // CRITICAL: Handle CORS preflight requests first
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authentication token')
    }

    // Parse request body
    const { userId, startDate, endDate, providers, agents }: AnalyticsRequest = await req.json()

    // Validate that user can only access their own data
    if (userId !== user.id) {
      throw new Error('Unauthorized: Cannot access other user data')
    }

    // Query analytics events
    let query = supabaseClient
      .from('analytics_events')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .order('timestamp', { ascending: false })

    // Apply filters
    if (providers && providers.length > 0) {
      query = query.in('provider_id', providers)
    }
    if (agents && agents.length > 0) {
      query = query.in('agent_id', agents)
    }

    const { data: events, error: eventsError } = await query

    if (eventsError) {
      throw eventsError
    }

    // Process analytics data
    const analytics = processAnalyticsData(events || [])

    // Generate insights
    const insights = generateInsights(events || [])

    const response: AnalyticsResponse = {
      summary: analytics.summary,
      usageData: analytics.usageData,
      providerData: analytics.providerData,
      agentData: analytics.agentData,
      insights
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Analytics dashboard error:', error)
    
    // Always return error with CORS headers
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.stack 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

function processAnalyticsData(events: any[]) {
  // Calculate summary metrics
  const totalRequests = events.length
  const successfulEvents = events.filter(e => e.success)
  const successRate = totalRequests > 0 ? (successfulEvents.length / totalRequests) * 100 : 0
  
  const totalSpend = events.reduce((sum, event) => {
    return sum + (event.metrics?.cost || 0)
  }, 0)
  
  const avgResponseTime = events.length > 0 
    ? events.reduce((sum, event) => sum + (event.metrics?.latency || 0), 0) / events.length
    : 0

  // Generate daily usage data
  const dailyData = new Map<string, { requests: number; cost: number }>()
  
  events.forEach(event => {
    const date = new Date(event.timestamp).toISOString().split('T')[0]
    const existing = dailyData.get(date) || { requests: 0, cost: 0 }
    
    dailyData.set(date, {
      requests: existing.requests + 1,
      cost: existing.cost + (event.metrics?.cost || 0)
    })
  })

  const usageData = Array.from(dailyData.entries())
    .map(([date, data]) => ({
      date: new Date(date).toLocaleDateString(),
      requests: data.requests,
      cost: Number(data.cost.toFixed(4))
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Generate provider data
  const providerStats = new Map<string, { count: number; cost: number }>()
  
  events.forEach(event => {
    const existing = providerStats.get(event.provider_id) || { count: 0, cost: 0 }
    providerStats.set(event.provider_id, {
      count: existing.count + 1,
      cost: existing.cost + (event.metrics?.cost || 0)
    })
  })

  const providerColors: Record<string, string> = {
    openai: '#10A37F',
    gemini: '#4285F4',
    claude: '#D97706',
    ibm: '#054ADA'
  }

  const providerData = Array.from(providerStats.entries()).map(([providerId, stats]) => ({
    name: getProviderDisplayName(providerId),
    value: totalRequests > 0 ? Math.round((stats.count / totalRequests) * 100) : 0,
    cost: Number(stats.cost.toFixed(4)),
    color: providerColors[providerId] || '#6b7280'
  }))

  // Generate agent data
  const agentStats = new Map<string, { requests: number; successes: number }>()
  
  events.forEach(event => {
    const agentName = event.agent_id || 'Direct Input'
    const existing = agentStats.get(agentName) || { requests: 0, successes: 0 }
    
    agentStats.set(agentName, {
      requests: existing.requests + 1,
      successes: existing.successes + (event.success ? 1 : 0)
    })
  })

  const agentData = Array.from(agentStats.entries())
    .map(([name, stats]) => ({
      name: name.length > 15 ? name.substring(0, 15) + '...' : name,
      requests: stats.requests,
      success: Math.round((stats.successes / Math.max(stats.requests, 1)) * 100)
    }))
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 5)

  return {
    summary: {
      totalRequests,
      totalSpend: Number(totalSpend.toFixed(4)),
      avgResponseTime: Math.round(avgResponseTime),
      successRate: Number(successRate.toFixed(1))
    },
    usageData,
    providerData,
    agentData
  }
}

function generateInsights(events: any[]) {
  const insights = []

  // Check for cost spikes
  const recentEvents = events.slice(0, 10)
  const recentCost = recentEvents.reduce((sum, e) => sum + (e.metrics?.cost || 0), 0)
  const avgCostPerRequest = events.length > 0 
    ? events.reduce((sum, e) => sum + (e.metrics?.cost || 0), 0) / events.length 
    : 0

  if (recentCost > avgCostPerRequest * 10 && recentEvents.length > 0) {
    insights.push({
      type: 'cost_spike',
      severity: 'high',
      title: 'Cost Spike Detected',
      description: `Recent requests are costing ${(recentCost / avgCostPerRequest).toFixed(1)}x more than average`,
      recommendation: 'Consider using more cost-effective providers or optimizing prompt length'
    })
  }

  // Check for high error rates
  const recentFailures = recentEvents.filter(e => !e.success).length
  const recentFailureRate = recentEvents.length > 0 ? (recentFailures / recentEvents.length) * 100 : 0

  if (recentFailureRate > 20) {
    insights.push({
      type: 'high_error_rate',
      severity: 'medium',
      title: 'High Error Rate',
      description: `${recentFailureRate.toFixed(1)}% of recent requests failed`,
      recommendation: 'Check API key validity and provider status'
    })
  }

  // Check for performance degradation
  const recentLatency = recentEvents.length > 0
    ? recentEvents.reduce((sum, e) => sum + (e.metrics?.latency || 0), 0) / recentEvents.length
    : 0
  const avgLatency = events.length > 0
    ? events.reduce((sum, e) => sum + (e.metrics?.latency || 0), 0) / events.length
    : 0

  if (recentLatency > avgLatency * 1.5 && recentEvents.length > 0) {
    insights.push({
      type: 'performance_degradation',
      severity: 'medium',
      title: 'Performance Degradation',
      description: `Recent response times are ${(recentLatency / avgLatency).toFixed(1)}x slower than average`,
      recommendation: 'Consider switching to faster providers or reducing prompt complexity'
    })
  }

  return insights
}

function getProviderDisplayName(providerId: string): string {
  const names: Record<string, string> = {
    openai: 'OpenAI',
    gemini: 'Google Gemini',
    claude: 'Anthropic Claude',
    ibm: 'IBM WatsonX'
  }
  return names[providerId] || providerId
}