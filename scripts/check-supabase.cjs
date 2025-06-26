#!/usr/bin/env node

/**
 * ModelShift AI - Supabase Configuration Checker
 * 
 * This script checks your Supabase configuration and helps diagnose common issues.
 * Run it with: node scripts/check-supabase.js
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
${colors.bold}${colors.blue}ModelShift AI - Supabase Configuration Checker${colors.reset}
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
    const version = execSync('supabase --version', { stdio: 'pipe' }).toString().trim();
    console.log(`${symbols.success} Supabase CLI installed: ${version}`);
    return true;
  } catch (error) {
    console.log(`${symbols.error} ${colors.red}Supabase CLI not installed or not in PATH${colors.reset}`);
    console.log(`${colors.yellow}Install with: npm install -g supabase${colors.reset}`);
    return false;
  }
}

// Check Supabase Edge Functions
function checkEdgeFunctions() {
  console.log(`\n${symbols.info} ${colors.bold}Checking Supabase Edge Functions...${colors.reset}`);
  
  try {
    const functions = execSync('supabase functions list', { stdio: 'pipe' }).toString().trim();
    
    if (functions.includes('ai-proxy')) {
      console.log(`${symbols.success} ai-proxy function is deployed`);
    } else {
      console.log(`${symbols.error} ${colors.red}ai-proxy function is not deployed${colors.reset}`);
      console.log(`${colors.yellow}Deploy with: supabase functions deploy ai-proxy${colors.reset}`);
    }
    
    if (functions.includes('dynamic-ai-proxy')) {
      console.log(`${symbols.success} dynamic-ai-proxy function is deployed`);
    } else {
      console.log(`${symbols.warning} dynamic-ai-proxy function is not deployed (optional)`);
    }
    
    return true;
  } catch (error) {
    console.log(`${symbols.warning} ${colors.yellow}Could not check Edge Functions: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}Make sure you're logged in with: supabase login${colors.reset}`);
    return false;
  }
}

// Check Supabase Secrets
function checkSecrets() {
  console.log(`\n${symbols.info} ${colors.bold}Checking Supabase Secrets...${colors.reset}`);
  
  try {
    const secrets = execSync('supabase secrets list', { stdio: 'pipe' }).toString().trim();
    
    const requiredSecrets = [
      'OPENAI_API_KEY',
      'GEMINI_API_KEY',
      'ANTHROPIC_API_KEY',
      'IBM_API_KEY',
      'IBM_PROJECT_ID'
    ];
    
    const missingSecrets = [];
    
    requiredSecrets.forEach(secret => {
      if (secrets.includes(secret)) {
        console.log(`${symbols.success} ${secret} is configured`);
      } else {
        console.log(`${symbols.error} ${colors.red}${secret} is not configured${colors.reset}`);
        missingSecrets.push(secret);
      }
    });
    
    if (missingSecrets.length > 0) {
      console.log(`\n${symbols.warning} ${colors.yellow}Missing secrets: ${missingSecrets.join(', ')}${colors.reset}`);
      console.log(`${colors.yellow}Set with: supabase secrets set SECRET_NAME=value${colors.reset}`);
    }
    
    return missingSecrets.length === 0;
  } catch (error) {
    console.log(`${symbols.warning} ${colors.yellow}Could not check secrets: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}Make sure you're logged in with: supabase login${colors.reset}`);
    return false;
  }
}

// Check package.json for required dependencies
function checkDependencies() {
  console.log(`\n${symbols.info} ${colors.bold}Checking package.json dependencies...${colors.reset}`);
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    
    const requiredDeps = ['@supabase/supabase-js'];
    const missingDeps = [];
    
    requiredDeps.forEach(dep => {
      if (packageJson.dependencies[dep]) {
        console.log(`${symbols.success} ${dep} is installed (${packageJson.dependencies[dep]})`);
      } else {
        console.log(`${symbols.error} ${colors.red}${dep} is not installed${colors.reset}`);
        missingDeps.push(dep);
      }
    });
    
    if (missingDeps.length > 0) {
      console.log(`\n${symbols.warning} ${colors.yellow}Missing dependencies: ${missingDeps.join(', ')}${colors.reset}`);
      console.log(`${colors.yellow}Install with: npm install ${missingDeps.join(' ')}${colors.reset}`);
    }
    
    return missingDeps.length === 0;
  } catch (error) {
    console.log(`${symbols.error} ${colors.red}Could not check package.json: ${error.message}${colors.reset}`);
    return false;
  }
}

// Run all checks
async function runAllChecks() {
  const envCheck = checkEnvFiles();
  const cliCheck = checkSupabaseCLI();
  const depsCheck = checkDependencies();
  
  if (cliCheck) {
    const functionsCheck = checkEdgeFunctions();
    const secretsCheck = checkSecrets();
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
  
  if (!depsCheck) {
    console.log(`${symbols.error} ${colors.red}Dependencies check failed${colors.reset}`);
    console.log(`${colors.yellow}Install missing dependencies with npm${colors.reset}`);
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
  console.log(`3. ${colors.green}Use the browser console to run tests: window.supabaseTests.runAll()${colors.reset}`);
  
  console.log(`\n${colors.bold}${colors.blue}Documentation${colors.reset}`);
  console.log(`${colors.cyan}==============${colors.reset}`);
  console.log(`${colors.green}Supabase Docs: https://supabase.com/docs${colors.reset}`);
  console.log(`${colors.green}Edge Functions: https://supabase.com/docs/guides/functions${colors.reset}`);
  console.log(`${colors.green}Authentication: https://supabase.com/docs/guides/auth${colors.reset}`);
}

runAllChecks();