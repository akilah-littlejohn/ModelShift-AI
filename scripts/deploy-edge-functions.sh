#!/bin/bash

# ModelShift AI - Edge Functions Deployment Script
# This script deploys all required Edge Functions to your Supabase project

echo "🚀 Deploying ModelShift AI Edge Functions to Supabase..."
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

# Deploy ai-proxy function
echo "📦 Deploying ai-proxy Edge Function..."
if supabase functions deploy ai-proxy; then
    echo "✅ ai-proxy function deployed successfully!"
else
    echo "❌ Failed to deploy ai-proxy function."
    exit 1
fi

# Deploy dynamic-ai-proxy function
echo ""
echo "📦 Deploying dynamic-ai-proxy Edge Function..."
if supabase functions deploy dynamic-ai-proxy; then
    echo "✅ dynamic-ai-proxy function deployed successfully!"
else
    echo "⚠️ Failed to deploy dynamic-ai-proxy function. This is optional, so continuing..."
fi

# Test the deployed functions
echo ""
echo "🔍 Testing deployed functions..."

# Get the project URL
PROJECT_URL=$(supabase status | grep "API URL" | awk '{print $3}')
if [ -z "$PROJECT_URL" ]; then
    echo "⚠️ Could not determine project URL. Skipping tests."
else
    # Get the anon key
    ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')
    
    if [ -z "$ANON_KEY" ]; then
        echo "⚠️ Could not determine anon key. Skipping tests."
    else
        # Test ai-proxy health check
        echo "🔄 Testing ai-proxy health check..."
        HEALTH_CHECK=$(curl -s -X POST "${PROJECT_URL}/functions/v1/ai-proxy" \
            -H "Authorization: Bearer ${ANON_KEY}" \
            -H "Content-Type: application/json" \
            -d '{"providerId":"health-check","prompt":"test"}')
        
        if [[ $HEALTH_CHECK == *"success\":true"* ]]; then
            echo "✅ ai-proxy health check successful!"
            
            # Extract configured providers
            PROVIDERS=$(echo $HEALTH_CHECK | grep -o '"configuredProviders":\[.*\]' | sed 's/"configuredProviders":\[\(.*\)\]/\1/' | sed 's/"//g')
            if [ -n "$PROVIDERS" ]; then
                echo "   Configured providers: $PROVIDERS"
            else
                echo "   No providers configured yet."
            fi
        else
            echo "❌ ai-proxy health check failed."
            echo "   Response: $HEALTH_CHECK"
        fi
    fi
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "💡 Next steps:"
echo "   1. Configure your API keys in Supabase Edge Function secrets"
echo "   2. Run the check-secrets.sh script to verify your configuration"
echo "   3. Test the connection in your application's Settings → Connection Mode"
echo ""
echo "📚 For more information, see the documentation in docs/EDGE_FUNCTION_DEBUGGING.md"