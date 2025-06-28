#!/usr/bin/env node

/**
 * ModelShift AI - Edge Function Checker
 * 
 * This script checks if your Edge Function is properly deployed and configured.
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
${colors.bold}${colors.blue}ModelShift AI - Edge Function Checker${colors.reset}
${colors.cyan}========================================${colors.reset}
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

// Check if we're in a WebContainer environment
function isWebContainerEnvironment() {
  return process.env.WEBCONTAINER === 'true' || 
         process.env.STACKBLITZ === 'true' || 
         process.env.BOLT_NEW === 'true' ||
         process.cwd().includes('webcontainer') ||
         process.cwd().includes('stackblitz') ||
         process.cwd().includes('bolt.new');
}

// Check if Supabase CLI is installed
function checkSupabaseCLI() {
  console.log(`\n${symbols.info} ${colors.bold}Checking Supabase CLI...${colors.reset}`);
  
  // Skip CLI check in WebContainer environments
  if (isWebContainerEnvironment()) {
    console.log(`${symbols.warning} ${colors.yellow}Running in WebContainer environment - Supabase CLI not available${colors.reset}`);
    console.log(`${colors.yellow}Use the Supabase Dashboard for all operations: https://supabase.com/dashboard${colors.reset}`);
    return false;
  }
  
  try {
    const version = execSync('npx supabase --version', { stdio: 'pipe' }).toString().trim();
    console.log(`${symbols.success} Supabase CLI available via npx: ${version}`);
    return true;
  } catch (error) {
    console.log(`${symbols.error} ${colors.red}Supabase CLI not available via npx${colors.reset}`);
    console.log(`${colors.yellow}Install with: npm install -g supabase${colors.reset}`);
    return false;
  }
}

// Test Edge Function health check
async function testEdgeFunction(supabaseUrl, supabaseAnonKey) {
  console.log(`\n${symbols.info} ${colors.bold}Testing Edge Function...${colors.reset}`);
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log(`${symbols.error} ${colors.red}Missing Supabase credentials. Cannot test Edge Function.${colors.reset}`);
    return false;
  }
  
  return new Promise((resolve) => {
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    };
    
    const requestBody = JSON.stringify({
      providerId: 'health-check',
      prompt: 'test'
    });
    
    console.log(`${symbols.pending} Testing Edge Function at: ${supabaseUrl}/functions/v1/ai-proxy`);
    
    const req = https.request(`${supabaseUrl}/functions/v1/ai-proxy`, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            if (response.success) {
              console.log(`${symbols.success} ${colors.green}Edge Function is working!${colors.reset}`);
              console.log(`${symbols.info} Configured providers: ${response.configuredProviders?.join(', ') || 'none'}`);
              
              if (response.errors && response.errors.length > 0) {
                console.log(`${symbols.warning} ${colors.yellow}Warnings:${colors.reset}`);
                response.errors.forEach(error => {
                  console.log(`  ${symbols.warning} ${colors.yellow}${error}${colors.reset}`);
                });
              }
              
              resolve(true);
            } else {
              console.log(`${symbols.error} ${colors.red}Edge Function returned error: ${response.error || 'Unknown error'}${colors.reset}`);
              resolve(false);
            }
          } catch (error) {
            console.log(`${symbols.error} ${colors.red}Failed to parse response: ${error.message}${colors.reset}`);
            console.log(`${colors.yellow}Raw response: ${data}${colors.reset}`);
            resolve(false);
          }
        } else if (res.statusCode === 404) {
          console.log(`${symbols.error} ${colors.red}Edge Function not found (404)${colors.reset}`);
          console.log(`${colors.yellow}The Edge Function 'ai-proxy' is not deployed. Please deploy it using the Supabase Dashboard or CLI.${colors.reset}`);
          resolve(false);
        } else {
          console.log(`${symbols.error} ${colors.red}Edge Function test failed with status ${res.statusCode}${colors.reset}`);
          try {
            const response = JSON.parse(data);
            console.log(`${colors.yellow}Error: ${response.error || 'Unknown error'}${colors.reset}`);
          } catch (e) {
            console.log(`${colors.yellow}Raw response: ${data}${colors.reset}`);
          }
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`${symbols.error} ${colors.red}Network error: ${error.message}${colors.reset}`);
      resolve(false);
    });
    
    // Set a timeout
    req.setTimeout(10000, () => {
      console.log(`${symbols.error} ${colors.red}Request timed out after 10 seconds${colors.reset}`);
      req.destroy();
      resolve(false);
    });
    
    req.write(requestBody);
    req.end();
  });
}

// Extract Supabase credentials from environment files
function getSupabaseCredentials() {
  const envFiles = ['.env.local', '.env', '.env.development'];
  let supabaseUrl = null;
  let supabaseAnonKey = null;
  
  for (const file of envFiles) {
    if (fs.existsSync(path.join(process.cwd(), file))) {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      const urlMatch = content.match(/VITE_SUPABASE_URL=([^\s]+)/);
      const keyMatch = content.match(/VITE_SUPABASE_ANON_KEY=([^\s]+)/);
      
      if (urlMatch && urlMatch[1] && !urlMatch[1].includes('your-project-id')) {
        supabaseUrl = urlMatch[1];
      }
      
      if (keyMatch && keyMatch[1] && !keyMatch[1].includes('your-anon-key')) {
        supabaseAnonKey = keyMatch[1];
      }
      
      if (supabaseUrl && supabaseAnonKey) break;
    }
  }
  
  return { supabaseUrl, supabaseAnonKey };
}

// Run all checks
async function runAllChecks() {
  const envCheck = checkEnvFiles();
  const cliCheck = checkSupabaseCLI();
  const { supabaseUrl, supabaseAnonKey } = getSupabaseCredentials();
  
  let functionCheck = false;
  if (supabaseUrl && supabaseAnonKey) {
    functionCheck = await testEdgeFunction(supabaseUrl, supabaseAnonKey);
  } else {
    console.log(`\n${symbols.error} ${colors.red}Cannot test Edge Function without Supabase credentials${colors.reset}`);
  }
  
  console.log(`\n${colors.bold}${colors.blue}Summary${colors.reset}`);
  console.log(`${colors.cyan}=======${colors.reset}`);
  
  if (!envCheck) {
    console.log(`${symbols.error} ${colors.red}Environment files check failed${colors.reset}`);
    console.log(`${colors.yellow}Create a .env.local file based on .env.example with your Supabase credentials${colors.reset}`);
  }
  
  if (isWebContainerEnvironment()) {
    console.log(`${symbols.info} ${colors.yellow}WebContainer environment detected${colors.reset}`);
    console.log(`${colors.yellow}Use the Supabase Dashboard for Edge Function deployment${colors.reset}`);
  } else if (!cliCheck) {
    console.log(`${symbols.warning} ${colors.yellow}Supabase CLI check failed${colors.reset}`);
    console.log(`${colors.yellow}Install the Supabase CLI for better development experience${colors.reset}`);
  }
  
  if (!functionCheck) {
    console.log(`${symbols.error} ${colors.red}Edge Function check failed${colors.reset}`);
    if (isWebContainerEnvironment()) {
      console.log(`${colors.yellow}Deploy the Edge Function through the Supabase Dashboard${colors.reset}`);
    } else {
      console.log(`${colors.yellow}Deploy the Edge Function with: npx supabase functions deploy ai-proxy${colors.reset}`);
    }
  }
  
  console.log(`\n${colors.bold}${colors.blue}Next Steps${colors.reset}`);
  console.log(`${colors.cyan}===========${colors.reset}`);
  
  if (!envCheck) {
    console.log(`1. ${colors.yellow}Set up your environment variables in .env.local${colors.reset}`);
  } else if (!functionCheck) {
    if (isWebContainerEnvironment()) {
      console.log(`1. ${colors.yellow}Deploy the Edge Function through the Supabase Dashboard${colors.reset}`);
      console.log(`   - Go to https://supabase.com/dashboard${colors.reset}`);
      console.log(`   - Select your project${colors.reset}`);
      console.log(`   - Navigate to Edge Functions${colors.reset}`);
      console.log(`   - Create a new function named "ai-proxy"${colors.reset}`);
      console.log(`   - Copy the code from supabase/functions/ai-proxy/index.ts${colors.reset}`);
    } else {
      console.log(`1. ${colors.yellow}Deploy the Edge Function with: npx supabase functions deploy ai-proxy${colors.reset}`);
    }
  } else {
    console.log(`1. ${colors.green}Start your development server with: npm run dev${colors.reset}`);
  }
  
  console.log(`2. ${colors.green}Check browser console for any Supabase-related errors${colors.reset}`);
  console.log(`3. ${colors.green}Set connection mode to "Server Proxy" in Settings${colors.reset}`);
  
  console.log(`\n${colors.bold}${colors.blue}Documentation${colors.reset}`);
  console.log(`${colors.cyan}==============${colors.reset}`);
  console.log(`${colors.green}Edge Function Debugging: docs/EDGE_FUNCTION_DEBUGGING.md${colors.reset}`);
  console.log(`${colors.green}Supabase Setup Guide: docs/SUPABASE_SETUP_GUIDE.md${colors.reset}`);
  console.log(`${colors.green}Supabase Docs: https://supabase.com/docs${colors.reset}`);
}

runAllChecks();