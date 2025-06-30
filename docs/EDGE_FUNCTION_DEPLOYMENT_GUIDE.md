# Edge Function Deployment Guide

## Overview

This guide will help you deploy the Edge Functions to your Supabase project. Since you're working in a WebContainer environment, you'll need to deploy the functions manually through the Supabase Dashboard.

## Step 1: Access Your Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your project (or create a new one)

## Step 2: Deploy the AI Proxy Edge Function

1. In the Supabase Dashboard, navigate to **Edge Functions** in the left sidebar
2. Click **Create a new function**
3. Name it `ai-proxy`
4. Copy the contents of `supabase/functions/ai-proxy/index.ts` from this project
5. Paste it into the editor in the Supabase Dashboard
6. Click **Deploy**

## Step 3: Configure API Keys as Secrets

1. In the Supabase Dashboard, go to **Settings** → **API**
2. Scroll down to the **Project API keys** section
3. Find the **Secrets** section
4. Add your API keys as secrets with the following names:
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `GEMINI_API_KEY` - Your Google Gemini API key
   - `ANTHROPIC_API_KEY` - Your Anthropic Claude API key
   - `IBM_API_KEY` - Your IBM WatsonX API key
   - `IBM_PROJECT_ID` - Your IBM WatsonX Project ID

## Step 4: Deploy the Generate Embedding Edge Function

1. Go back to **Edge Functions** in the left sidebar
2. Click **Create a new function**
3. Name it `generate-embedding`
4. Copy the contents of `supabase/functions/generate-embedding/index.ts` from this project
5. Paste it into the editor in the Supabase Dashboard
6. Click **Deploy**

## Step 5: Deploy the Search Knowledge Base Edge Function

1. Go back to **Edge Functions** in the left sidebar
2. Click **Create a new function**
3. Name it `search-knowledge-base`
4. Copy the contents of `supabase/functions/search-knowledge-base/index.ts` from this project
5. Paste it into the editor in the Supabase Dashboard
6. Click **Deploy**

## Step 6: Test the Deployment

1. In the Supabase Dashboard, go back to **Edge Functions**
2. Click on your `ai-proxy` function
3. Click the **Invoke** button
4. Use the following test payload:
   ```json
   {
     "providerId": "health-check",
     "prompt": "test"
   }
   ```
5. You should see a successful response with status information

## Verifying in the Application

1. In the ModelShift AI application, go to **Settings** → **Connection Mode**
2. Select **Server Proxy Mode**
3. Click **Check Status**
4. You should see "Server connected" if everything is working correctly

## Troubleshooting

If you encounter issues:

1. **404 Not Found Error**: Make sure the Edge Function is deployed with the correct name (`ai-proxy`)
2. **Authentication Error**: Ensure you're signed in to the application
3. **API Key Errors**: Verify that you've added the correct API keys as secrets
4. **CORS Errors**: Make sure your Supabase project allows requests from your application domain

## Using Direct Browser Mode as Fallback

If you're unable to deploy the Edge Function or encounter persistent issues:

1. Go to **Settings** → **Connection Mode**
2. Select **Direct Browser Mode**
3. Add your API keys in the **API Keys** section
4. The application will make API calls directly from your browser