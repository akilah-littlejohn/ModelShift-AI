#!/usr/bin/env node

/**
 * ModelShift AI - Edge Function Verification Script
 * 
 * This script tests the ai-proxy Edge Function to verify it's working correctly
 * and provides detailed diagnostics for troubleshooting.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Symbols for status indicators
const symbols = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  pending: '🔄'
};

console.log(`
${colors.bold}${colors.blue}ModelShift AI - Edge Function Verification${colors.reset}
${colors.cyan}===============================================${colors.reset}
`);

// Check for .env or .env.local file
function checkEnvFiles() {
  console.log(`${symbols.info} ${colors.bold}Checking environment files...${colors.reset}`);
  
  const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
  const foundFiles = [];
  
  envFiles.forEach(file => {
    if (fs.existsSync(path.join(process.cwd(), file))) {
      foundFiles.push(file);
    }
  });
  
  if (foundFiles.length === 0) {
    console.log(`${symbols.error} ${colors.red}No environment files found. Create a .env.local file based on .env.example${colors.reset}`);
    return false;
  }
  
  console.log(`${symbols.success} Found environment files: ${foundFiles.join(', ')}`);
  
  // Check for required variables in found files
  let hasSupabaseUrl = false;
  let hasSupabaseAnonKey = false;
  
  foundFiles.forEach(file => {
    const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    if (content.includes('VITE_SUPABASE_URL=') && !content.includes('VITE_SUPABASE_URL=your-project-id')) {
      hasSupabaseUrl = true;
    }
    if (content.includes('VITE_SUPABASE_ANON_KEY=') && !content.includes('VITE_SUPABASE_ANON_KEY=your-anon-key')) {
      hasSupabaseAnonKey = true;
    }
  });
  
  if (!hasSupabaseUrl) {
    console.log(`${symbols.error} ${colors.red}VITE_SUPABASE_URL not found or not set in any environment file${colors.reset}`);
  } else {
    console.log(`${symbols.success} VITE_SUPABASE_URL is configured`);
  }
  
  if (!hasSupabaseAnonKey) {
    console.log(`${symbols.error} ${colors.red}VITE_SUPABASE_ANON_KEY not found or not set in any environment file${colors.reset}`);
  } else {
    console.log(`${symbols.success} VITE_SUPABASE_ANON_KEY is configured`);
  }
  
  return hasSupabaseUrl && hasSupabaseAnonKey;
}

// Check if Supabase CLI is installed
function checkSupabaseCLI() {
  console.log(`\n${symbols.info} ${colors.bold}Checking Supabase CLI...${colors.reset}`);
  
  try {
    const version = execSync('npx supabase --version', { stdio: 'pipe' }).toString().trim();
    console.log(`${symbols.success} Supabase CLI available: ${version}`);
    return true;
  } catch (error) {
    console.log(`${symbols.error} ${colors.red}Supabase CLI not available${colors.reset}`);
    console.log(`${colors.yellow}We'll use npx to run the Supabase CLI commands${colors.reset}`);
    return false;
  }
}

// Check Supabase Edge Functions
function checkEdgeFunctions() {
  console.log(`\n${symbols.info} ${colors.bold}Checking Supabase Edge Functions...${colors.reset}`);
  
  try {
    const functions = execSync('npx supabase functions list', { stdio: 'pipe' }).toString().trim();
    
    if (functions.includes('ai-proxy')) {
      console.log(`${symbols.success} ai-proxy function is deployed`);
    } else {
      console.log(`${symbols.error} ${colors.red}ai-proxy function is not deployed${colors.reset}`);
      console.log(`${colors.yellow}Deploy with: npx supabase functions deploy ai-proxy${colors.reset}`);
    }
    
    if (functions.includes('dynamic-ai-proxy')) {
      console.log(`${symbols.success} dynamic-ai-proxy function is deployed`);
    } else {
      console.log(`${symbols.warning} dynamic-ai-proxy function is not deployed (optional)`);
    }
    
    return true;
  } catch (error) {
    console.log(`${symbols.warning} ${colors.yellow}Could not check Edge Functions: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}Make sure you're logged in with: npx supabase login${colors.reset}`);
    return false;
  }
}

// Check Supabase Secrets
function checkSecrets() {
  console.log(`\n${symbols.info} ${colors.bold}Checking Supabase Secrets...${colors.reset}`);
  
  try {
    const secrets = execSync('npx supabase secrets list', { stdio: 'pipe' }).toString().trim();
    
    const requiredSecrets = [
      'OPENAI_API_KEY',
      'GEMINI_API_KEY',
      'ANTHROPIC_API_KEY',
      'IBM_API_KEY',
      'IBM_PROJECT_ID',
      'ENCRYPTION_KEY'
    ];
    
    const missingSecrets = [];
    
    requiredSecrets.forEach(secret => {
      if (secrets.includes(secret)) {
        console.log(`${symbols.success} ${secret} is configured`);
      } else {
        console.log(`${symbols.warning} ${colors.yellow}${secret} is not configured${colors.reset}`);
        missingSecrets.push(secret);
      }
    });
    
    if (missingSecrets.length > 0) {
      console.log(`\n${symbols.warning} ${colors.yellow}Missing secrets: ${missingSecrets.join(', ')}${colors.reset}`);
      console.log(`${colors.yellow}Set with: npx supabase secrets set SECRET_NAME=value${colors.reset}`);
      console.log(`${colors.yellow}Note: These secrets are optional if users provide their own API keys${colors.reset}`);
    }
    
    return true;
  } catch (error) {
    console.log(`${symbols.warning} ${colors.yellow}Could not check secrets: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}Make sure you're logged in with: npx supabase login${colors.reset}`);
    return false;
  }
}

// Test the Edge Function
async function testEdgeFunction() {
  console.log(`\n${symbols.info} ${colors.bold}Testing ai-proxy Edge Function...${colors.reset}`);
  
  try {
    // Get Supabase URL and anon key from .env.local
    let supabaseUrl = '';
    let supabaseAnonKey = '';
    
    try {
      const envFile = fs.existsSync('.env.local') 
        ? fs.readFileSync('.env.local', 'utf8')
        : fs.readFileSync('.env', 'utf8');
      
      const urlMatch = envFile.match(/VITE_SUPABASE_URL=(.+)/);
      const keyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY=(.+)/);
      
      if (urlMatch && urlMatch[1]) supabaseUrl = urlMatch[1].trim();
      if (keyMatch && keyMatch[1]) supabaseAnonKey = keyMatch[1].trim();
    } catch (error) {
      console.log(`${symbols.error} ${colors.red}Could not read environment files: ${error.message}${colors.reset}`);
      return false;
    }
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.log(`${symbols.error} ${colors.red}Missing Supabase URL or anon key in environment files${colors.reset}`);
      return false;
    }
    
    // Test the health check endpoint
    console.log(`${symbols.pending} Testing health check endpoint...`);
    
    try {
      const result = execSync(`curl -s -X POST "${supabaseUrl}/functions/v1/ai-proxy" \
        -H "Authorization: Bearer ${supabaseAnonKey}" \
        -H "Content-Type: application/json" \
        -d '{"providerId":"health-check","prompt":"test"}'`, 
        { stdio: 'pipe' }
      ).toString();
      
      try {
        const response = JSON.parse(result);
        
        if (response.success) {
          console.log(`${symbols.success} Health check successful!`);
          console.log(`${symbols.info} Configured providers: ${response.configuredProviders.join(', ') || 'None'}`);
          
          if (response.errors && response.errors.length > 0) {
            console.log(`${symbols.warning} ${colors.yellow}Configuration issues:${colors.reset}`);
            response.errors.forEach(error => {
              console.log(`  ${symbols.warning} ${colors.yellow}${error}${colors.reset}`);
            });
          }
          
          return true;
        } else {
          console.log(`${symbols.error} ${colors.red}Health check failed: ${response.error || 'Unknown error'}${colors.reset}`);
          return false;
        }
      } catch (parseError) {
        console.log(`${symbols.error} ${colors.red}Failed to parse health check response: ${parseError.message}${colors.reset}`);
        console.log(`${colors.yellow}Raw response: ${result}${colors.reset}`);
        return false;
      }
    } catch (error) {
      console.log(`${symbols.error} ${colors.red}Failed to call health check endpoint: ${error.message}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${symbols.error} ${colors.red}Failed to test Edge Function: ${error.message}${colors.reset}`);
    return false;
  }
}

// Run all checks
async function runAllChecks() {
  const envCheck = checkEnvFiles();
  const cliCheck = checkSupabaseCLI();
  
  if (cliCheck) {
    const functionsCheck = checkEdgeFunctions();
    const secretsCheck = checkSecrets();
    const testResult = await testEdgeFunction();
  }
  
  console.log(`\n${colors.bold}${colors.blue}Summary${colors.reset}`);
  console.log(`${colors.cyan}=======${colors.reset}`);
  
  if (!envCheck) {
    console.log(`${symbols.error} ${colors.red}Environment files check failed${colors.reset}`);
    console.log(`${colors.yellow}Create a .env.local file based on .env.example with your Supabase credentials${colors.reset}`);
  }
  
  if (!cliCheck) {
    console.log(`${symbols.warning} ${colors.yellow}Supabase CLI check failed${colors.reset}`);
    console.log(`${colors.yellow}Install the Supabase CLI for better development experience${colors.reset}`);
  }
  
  console.log(`\n${colors.bold}${colors.blue}Next Steps${colors.reset}`);
  console.log(`${colors.cyan}===========${colors.reset}`);
  
  if (!envCheck) {
    console.log(`1. ${colors.yellow}Set up your environment variables in .env.local${colors.reset}`);
  } else if (!cliCheck) {
    console.log(`1. ${colors.yellow}Install the Supabase CLI${colors.reset}`);
  } else {
    console.log(`1. ${colors.green}Start your development server with: npm run dev${colors.reset}`);
  }
  
  console.log(`2. ${colors.green}Check browser console for any Supabase-related errors${colors.reset}`);
  console.log(`3. ${colors.green}Test the connection in Settings → Connection Mode${colors.reset}`);
  
  console.log(`\n${colors.bold}${colors.blue}Documentation${colors.reset}`);
  console.log(`${colors.cyan}==============${colors.reset}`);
  console.log(`${colors.green}Supabase Docs: https://supabase.com/docs${colors.reset}`);
  console.log(`${colors.green}Edge Functions: https://supabase.com/docs/guides/functions${colors.reset}`);
  console.log(`${colors.green}Authentication: https://supabase.com/docs/guides/auth${colors.reset}`);
}

runAllChecks();