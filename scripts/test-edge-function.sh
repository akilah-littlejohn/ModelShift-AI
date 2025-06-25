#!/bin/bash

# ModelShift AI - Edge Function Test Script
# This script tests the ai-proxy Edge Function with various providers

echo "🔍 Testing ModelShift AI Edge Functions..."
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

# Get the project URL
PROJECT_URL=$(supabase status | grep "API URL" | awk '{print $3}')
if [ -z "$PROJECT_URL" ]; then
    echo "❌ Error: Could not determine project URL."
    echo "Please run: supabase status"
    exit 1
fi

# Get the anon key
ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')
if [ -z "$ANON_KEY" ]; then
    echo "❌ Error: Could not determine anon key."
    echo "Please run: supabase status"
    exit 1
fi

# Test health check
echo "🔄 Testing health check endpoint..."
HEALTH_CHECK=$(curl -s -X POST "${PROJECT_URL}/functions/v1/ai-proxy" \
    -H "Authorization: Bearer ${ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"providerId":"health-check","prompt":"test"}')

if [[ $HEALTH_CHECK == *"success\":true"* ]]; then
    echo "✅ Health check successful!"
    
    # Extract configured providers
    PROVIDERS=$(echo $HEALTH_CHECK | grep -o '"configuredProviders":\[.*\]' | sed 's/"configuredProviders":\[\(.*\)\]/\1/' | sed 's/"//g')
    if [ -n "$PROVIDERS" ]; then
        echo "   Configured providers: $PROVIDERS"
        
        # Test each configured provider
        IFS=',' read -ra PROVIDER_ARRAY <<< "$PROVIDERS"
        for PROVIDER in "${PROVIDER_ARRAY[@]}"; do
            PROVIDER=$(echo $PROVIDER | tr -d '[]" ')
            if [ -n "$PROVIDER" ]; then
                echo ""
                echo "🔄 Testing $PROVIDER provider..."
                PROVIDER_TEST=$(curl -s -X POST "${PROJECT_URL}/functions/v1/ai-proxy" \
                    -H "Authorization: Bearer ${ANON_KEY}" \
                    -H "Content-Type: application/json" \
                    -d "{\"providerId\":\"$PROVIDER\",\"prompt\":\"Hello, please respond with a single word greeting.\",\"parameters\":{\"max_tokens\":10}}")
                
                if [[ $PROVIDER_TEST == *"success\":true"* ]]; then
                    RESPONSE=$(echo $PROVIDER_TEST | grep -o '"response":"[^"]*"' | sed 's/"response":"\(.*\)"/\1/')
                    echo "✅ $PROVIDER test successful!"
                    echo "   Response: $RESPONSE"
                else
                    ERROR=$(echo $PROVIDER_TEST | grep -o '"error":"[^"]*"' | sed 's/"error":"\(.*\)"/\1/')
                    echo "❌ $PROVIDER test failed."
                    echo "   Error: $ERROR"
                fi
            fi
        done
    else
        echo "   No providers configured yet."
    fi
    
    # Extract errors
    ERRORS=$(echo $HEALTH_CHECK | grep -o '"errors":\[.*\]' | sed 's/"errors":\[\(.*\)\]/\1/' | sed 's/"//g')
    if [ -n "$ERRORS" ]; then
        echo ""
        echo "⚠️ Configuration issues:"
        echo "   $ERRORS"
    fi
else
    echo "❌ Health check failed."
    echo "   Response: $HEALTH_CHECK"
fi

echo ""
echo "🎉 Testing complete!"
echo ""
echo "💡 Next steps:"
echo "   1. If any tests failed, check your API key configuration"
echo "   2. Run the check-secrets.sh script to verify your configuration"
echo "   3. Check the Edge Function logs for more details: supabase functions logs ai-proxy --follow"