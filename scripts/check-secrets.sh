#!/bin/bash

# ModelShift AI - Check Supabase Secrets Script
# This script helps verify that your Supabase secrets are properly configured

echo "🔍 Checking ModelShift AI Supabase secrets configuration..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI is not installed."
    echo "Please install it first: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if user is logged in to Supabase
if ! supabase projects list &> /dev/null; then
    echo "❌ Error: Not logged in to Supabase CLI."
    echo "Please run: supabase login"
    exit 1
fi

echo "📋 Checking for required AI provider secrets..."
echo ""

# Function to check if a secret exists
check_secret() {
    local secret_name="$1"
    local provider_name="$2"
    
    # List secrets and check if our secret exists
    if supabase secrets list | grep -q "^$secret_name"; then
        echo "✅ $secret_name is configured ($provider_name)"
        return 0
    else
        echo "❌ $secret_name is missing ($provider_name)"
        return 1
    fi
}

# Check each required secret
secrets_configured=0
total_secrets=0

echo "🔑 AI Provider Secrets:"
if check_secret "OPENAI_API_KEY" "OpenAI GPT models"; then
    ((secrets_configured++))
fi
((total_secrets++))

if check_secret "GEMINI_API_KEY" "Google Gemini models"; then
    ((secrets_configured++))
fi
((total_secrets++))

if check_secret "ANTHROPIC_API_KEY" "Anthropic Claude models"; then
    ((secrets_configured++))
fi
((total_secrets++))

if check_secret "IBM_API_KEY" "IBM WatsonX models"; then
    ((secrets_configured++))
    if check_secret "IBM_PROJECT_ID" "IBM WatsonX Project ID"; then
        echo "✅ IBM_PROJECT_ID is configured (required for IBM WatsonX)"
    else
        echo "⚠️  IBM_PROJECT_ID is missing (required when using IBM_API_KEY)"
    fi
fi
((total_secrets++))

echo ""
echo "📊 Summary:"
echo "   Configured: $secrets_configured/$total_secrets AI provider secrets"

if [ $secrets_configured -eq 0 ]; then
    echo ""
    echo "❌ No AI provider secrets are configured!"
    echo "   Your ai-proxy Edge Function will not work properly."
    echo ""
    echo "🔧 To fix this:"
    echo "   1. Run: ./scripts/setup-secrets.sh"
    echo "   2. Or manually set secrets using: supabase secrets set KEY_NAME=your-key-here"
elif [ $secrets_configured -lt $total_secrets ]; then
    echo ""
    echo "⚠️  Some AI providers are not configured."
    echo "   Users will only be able to use providers with configured API keys."
    echo ""
    echo "🔧 To add missing providers:"
    echo "   1. Run: ./scripts/setup-secrets.sh"
    echo "   2. Or manually set secrets using: supabase secrets set KEY_NAME=your-key-here"
else
    echo ""
    echo "🎉 All AI provider secrets are configured!"
    echo "   Your ModelShift AI platform should work properly."
fi

echo ""
echo "🔗 Additional checks:"

# Check if Edge Functions are deployed
echo "📦 Checking Edge Functions..."
if supabase functions list | grep -q "ai-proxy"; then
    echo "✅ ai-proxy Edge Function is deployed"
else
    echo "❌ ai-proxy Edge Function is not deployed"
    echo "   Run: supabase functions deploy ai-proxy"
fi

echo ""
echo "💡 Next steps:"
echo "   1. Test your configuration in the ModelShift AI playground"
echo "   2. Monitor usage through provider dashboards"
echo "   3. Check Supabase Edge Function logs if issues persist"
echo ""
echo "📚 Documentation:"
echo "   - Supabase Edge Functions: https://supabase.com/docs/guides/functions"
echo "   - ModelShift AI Setup: Check the docs/ folder in your project"