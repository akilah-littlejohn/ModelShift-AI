#!/usr/bin/env node

/**
 * ModelShift AI - Edge Functions Deployment Script
 * 
 * This script deploys the ai-proxy Edge Function to your Supabase project.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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
${colors.bold}${colors.blue}ModelShift AI - Edge Function Deployment${colors.reset}
${colors.cyan}========================================${colors.reset}
`);

// Check if Supabase CLI is installed
function checkSupabaseCLI() {
  console.log(`${symbols.info} ${colors.bold}Checking Supabase CLI...${colors.reset}`);
  
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

// Check if the Edge Function directory exists
function checkEdgeFunctionExists() {
  console.log(`\n${symbols.info} ${colors.bold}Checking Edge Function files...${colors.reset}`);
  
  const functionPath = path.join(process.cwd(), 'supabase', 'functions', 'ai-proxy');
  
  if (fs.existsSync(functionPath)) {
    console.log(`${symbols.success} Edge Function directory found at: ${functionPath}`);
    return true;
  } else {
    console.log(`${symbols.error} ${colors.red}Edge Function directory not found at: ${functionPath}${colors.reset}`);
    return false;
  }
}

// Deploy the Edge Function
function deployEdgeFunction() {
  console.log(`\n${symbols.info} ${colors.bold}Deploying ai-proxy Edge Function...${colors.reset}`);
  
  try {
    console.log(`${symbols.pending} Deploying... (this may take a minute)`);
    
    // Use npx to run the Supabase CLI command
    execSync('npx supabase functions deploy ai-proxy', { stdio: 'inherit' });
    
    console.log(`${symbols.success} ${colors.green}ai-proxy Edge Function deployed successfully!${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${symbols.error} ${colors.red}Failed to deploy Edge Function:${colors.reset}`);
    console.error(error.message);
    return false;
  }
}

// Test the deployed Edge Function
function testEdgeFunction() {
  console.log(`\n${symbols.info} ${colors.bold}Testing deployed Edge Function...${colors.reset}`);
  
  try {
    // Get the project URL and anon key
    console.log(`${symbols.pending} Getting Supabase project details...`);
    
    let supabaseUrl = '';
    let supabaseAnonKey = '';
    
    try {
      // Try to get from .env.local first
      if (fs.existsSync(path.join(process.cwd(), '.env.local'))) {
        const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
        const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
        const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);
        
        if (urlMatch && urlMatch[1]) supabaseUrl = urlMatch[1].trim();
        if (keyMatch && keyMatch[1]) supabaseAnonKey = keyMatch[1].trim();
      }
      
      // If not found in .env.local, try .env
      if ((!supabaseUrl || !supabaseAnonKey) && fs.existsSync(path.join(process.cwd(), '.env'))) {
        const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
        const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
        const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);
        
        if (urlMatch && urlMatch[1]) supabaseUrl = urlMatch[1].trim();
        if (keyMatch && keyMatch[1]) supabaseAnonKey = keyMatch[1].trim();
      }
      
      // If still not found, try to get from Supabase CLI
      if (!supabaseUrl || !supabaseAnonKey) {
        console.log(`${symbols.warning} ${colors.yellow}Could not find Supabase credentials in .env files${colors.reset}`);
        console.log(`${symbols.pending} Attempting to get from Supabase CLI...`);
        
        try {
          const status = execSync('npx supabase status', { stdio: 'pipe' }).toString();
          
          const apiUrlMatch = status.match(/API URL:\s+(.+)/);
          const anonKeyMatch = status.match(/anon key:\s+(.+)/);
          
          if (apiUrlMatch && apiUrlMatch[1]) supabaseUrl = apiUrlMatch[1].trim();
          if (anonKeyMatch && anonKeyMatch[1]) supabaseAnonKey = anonKeyMatch[1].trim();
        } catch (cliError) {
          console.log(`${symbols.warning} ${colors.yellow}Could not get Supabase credentials from CLI${colors.reset}`);
        }
      }
    } catch (error) {
      console.log(`${symbols.warning} ${colors.yellow}Error getting Supabase credentials: ${error.message}${colors.reset}`);
    }
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.log(`${symbols.error} ${colors.red}Could not determine Supabase URL and anon key. Skipping test.${colors.reset}`);
      return false;
    }
    
    console.log(`${symbols.success} Found Supabase credentials`);
    
    // Test the health check endpoint
    console.log(`${symbols.pending} Testing health check endpoint...`);
    
    const testCommand = `curl -s -X POST "${supabaseUrl}/functions/v1/ai-proxy" \\
      -H "Authorization: Bearer ${supabaseAnonKey}" \\
      -H "Content-Type: application/json" \\
      -d '{"providerId":"health-check","prompt":"test"}'`;
    
    const response = execSync(testCommand, { stdio: 'pipe' }).toString();
    
    try {
      const jsonResponse = JSON.parse(response);
      
      if (jsonResponse.success) {
        console.log(`${symbols.success} ${colors.green}Health check successful!${colors.reset}`);
        
        // Show configured providers
        if (jsonResponse.configuredProviders && jsonResponse.configuredProviders.length > 0) {
          console.log(`${symbols.info} Configured providers: ${jsonResponse.configuredProviders.join(', ')}`);
        } else {
          console.log(`${symbols.warning} ${colors.yellow}No providers configured yet${colors.reset}`);
        }
        
        // Show any errors
        if (jsonResponse.errors && jsonResponse.errors.length > 0) {
          console.log(`${symbols.warning} ${colors.yellow}Configuration issues:${colors.reset}`);
          jsonResponse.errors.forEach(error => {
            console.log(`  ${symbols.warning} ${colors.yellow}${error}${colors.reset}`);
          });
        }
        
        return true;
      } else {
        console.log(`${symbols.error} ${colors.red}Health check failed: ${jsonResponse.error || 'Unknown error'}${colors.reset}`);
        return false;
      }
    } catch (parseError) {
      console.log(`${symbols.error} ${colors.red}Failed to parse health check response${colors.reset}`);
      console.log(`${colors.yellow}Raw response: ${response}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.error(`${symbols.error} ${colors.red}Failed to test Edge Function:${colors.reset}`);
    console.error(error.message);
    return false;
  }
}

// Run all steps
function runDeployment() {
  const cliAvailable = checkSupabaseCLI();
  const functionExists = checkEdgeFunctionExists();
  
  if (!functionExists) {
    console.log(`${symbols.error} ${colors.red}Edge Function files not found. Deployment aborted.${colors.reset}`);
    return;
  }
  
  const deploySuccess = deployEdgeFunction();
  
  if (deploySuccess) {
    const testSuccess = testEdgeFunction();
    
    if (testSuccess) {
      console.log(`\n${symbols.success} ${colors.green}Edge Function deployment and testing completed successfully!${colors.reset}`);
    } else {
      console.log(`\n${symbols.warning} ${colors.yellow}Edge Function deployed but testing failed.${colors.reset}`);
      console.log(`${colors.yellow}Please check your Supabase configuration and try again.${colors.reset}`);
    }
  } else {
    console.log(`\n${symbols.error} ${colors.red}Edge Function deployment failed.${colors.reset}`);
    console.log(`${colors.yellow}Please check the error messages above and try again.${colors.reset}`);
  }
  
  console.log(`\n${colors.bold}${colors.blue}Next Steps${colors.reset}`);
  console.log(`${colors.cyan}===========${colors.reset}`);
  console.log(`1. ${colors.green}Configure your API keys in Supabase Edge Function secrets${colors.reset}`);
  console.log(`2. ${colors.green}Test the connection in Settings → Connection Mode${colors.reset}`);
  console.log(`3. ${colors.green}Start using the AI proxy in your application${colors.reset}`);
  
  console.log(`\n${colors.bold}${colors.blue}API Key Configuration${colors.reset}`);
  console.log(`${colors.cyan}======================${colors.reset}`);
  console.log(`Run these commands to set up your API keys (optional):`);
  console.log(`${colors.green}npx supabase secrets set OPENAI_API_KEY=sk-your-openai-key-here${colors.reset}`);
  console.log(`${colors.green}npx supabase secrets set GEMINI_API_KEY=AIza-your-gemini-key-here${colors.reset}`);
  console.log(`${colors.green}npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-claude-key-here${colors.reset}`);
  console.log(`${colors.green}npx supabase secrets set IBM_API_KEY=your-ibm-key-here${colors.reset}`);
  console.log(`${colors.green}npx supabase secrets set IBM_PROJECT_ID=your-ibm-project-id-here${colors.reset}`);
}

// Run the deployment
runDeployment();