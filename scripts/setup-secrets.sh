#!/bin/bash

# ModelShift AI - Supabase Secrets Setup Script
# This script sets up the required AI provider API keys in Supabase Edge Function secrets

echo "🚀 Setting up ModelShift AI provider secrets in Supabase..."
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

echo "📋 This script will set up the following secrets:"
echo "   - OPENAI_API_KEY (for GPT models)"
echo "   - GEMINI_API_KEY (for Google Gemini models)"
echo "   - ANTHROPIC_API_KEY (for Claude models)"
echo "   - IBM_API_KEY (for IBM WatsonX models)"
echo "   - IBM_PROJECT_ID (required for IBM WatsonX)"
echo ""

# Function to prompt for API key
prompt_for_key() {
    local key_name="$1"
    local description="$2"
    local example="$3"
    local required="$4"
    
    echo "🔑 Setting up $key_name"
    echo "   Description: $description"
    echo "   Example format: $example"
    
    if [ "$required" = "optional" ]; then
        echo "   (Optional - press Enter to skip)"
    fi
    
    read -p "   Enter your $key_name: " key_value
    
    if [ -z "$key_value" ] && [ "$required" = "required" ]; then
        echo "   ⚠️  Warning: $key_name is required for the service to work properly"
        echo "   You can set it later using: supabase secrets set $key_name=your-key-here"
        echo ""
        return 1
    elif [ -z "$key_value" ]; then
        echo "   ⏭️  Skipped $key_name"
        echo ""
        return 1
    fi
    
    # Set the secret
    if supabase secrets set "$key_name=$key_value" > /dev/null 2>&1; then
        echo "   ✅ $key_name set successfully"
    else
        echo "   ❌ Failed to set $key_name"
        return 1
    fi
    
    echo ""
    return 0
}

# Set up each provider
echo "Let's set up your AI provider API keys:"
echo ""

# OpenAI
prompt_for_key "OPENAI_API_KEY" \
    "OpenAI API key for GPT models" \
    "sk-..." \
    "optional"

# Google Gemini
prompt_for_key "GEMINI_API_KEY" \
    "Google AI API key for Gemini models" \
    "AIza..." \
    "optional"

# Anthropic Claude
prompt_for_key "ANTHROPIC_API_KEY" \
    "Anthropic API key for Claude models" \
    "sk-ant-..." \
    "optional"

# IBM WatsonX API Key
if prompt_for_key "IBM_API_KEY" \
    "IBM Cloud API key for WatsonX models" \
    "your-ibm-api-key" \
    "optional"; then
    
    # If IBM API key was set, also prompt for Project ID
    prompt_for_key "IBM_PROJECT_ID" \
        "IBM WatsonX Project ID (required with IBM API key)" \
        "12345678-90ab-cdef-ghij-klmnopqrstuvw" \
        "required"
fi

echo "🎉 Secret setup complete!"
echo ""
echo "📊 To verify your secrets were set correctly:"
echo "   1. Go to your Supabase dashboard"
echo "   2. Navigate to Settings → Edge Functions → Secrets"
echo "   3. Verify the secrets are listed there"
echo ""
echo "🔄 Your Edge Functions will now have access to these API keys."
echo "   The ai-proxy function should work properly now!"
echo ""
echo "💡 Tips:"
echo "   - Keep your API keys secure and never commit them to version control"
echo "   - Monitor usage through each provider's dashboard"
echo "   - Rotate keys regularly for security"
echo ""
echo "✨ Your ModelShift AI platform is now ready to use!"