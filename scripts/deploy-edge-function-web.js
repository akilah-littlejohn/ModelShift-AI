#!/usr/bin/env node

/**
 * ModelShift AI - Edge Function Deployment Script for WebContainer
 * 
 * This script helps deploy the ai-proxy Edge Function to your Supabase project
 * in a WebContainer-friendly way.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

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
${colors.bold}${colors.blue}ModelShift AI - Edge Function Deployment for WebContainer${colors.reset}
${colors.cyan}=======================================================${colors.reset}
`);

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

// Get Supabase credentials from environment files
function getSupabaseCredentials() {
  console.log(`\n${symbols.info} ${colors.bold}Getting Supabase credentials...${colors.reset}`);
  
  let supabaseUrl = '';
  let supabaseAnonKey = '';
  
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
  
  if (!supabaseUrl || !supabaseAnonKey || 
      supabaseUrl === 'https://your-project-id.supabase.co' || 
      supabaseAnonKey === 'your-anon-key-here') {
    console.log(`${symbols.error} ${colors.red}Could not find valid Supabase credentials in environment files${colors.reset}`);
    console.log(`${colors.yellow}Please update your .env or .env.local file with valid Supabase credentials${colors.reset}`);
    return null;
  }
  
  console.log(`${symbols.success} Found Supabase credentials`);
  return { supabaseUrl, supabaseAnonKey };
}

// Create a simple HTTP client for Supabase API
function createSupabaseClient(supabaseUrl, supabaseAnonKey) {
  return {
    functions: {
      list: () => {
        return new Promise((resolve, reject) => {
          const url = `${supabaseUrl}/functions/v1`;
          const options = {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json'
            }
          };
          
          const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  resolve(JSON.parse(data));
                } catch (e) {
                  reject(new Error(`Failed to parse response: ${e.message}`));
                }
              } else {
                reject(new Error(`HTTP error: ${res.statusCode} ${data}`));
              }
            });
          });
          
          req.on('error', reject);
          req.end();
        });
      },
      
      deploy: (functionName, functionCode) => {
        return new Promise((resolve, reject) => {
          const url = `${supabaseUrl}/functions/v1/${functionName}`;
          const options = {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/javascript'
            }
          };
          
          const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  resolve(JSON.parse(data));
                } catch (e) {
                  resolve({ success: true, message: 'Function deployed successfully' });
                }
              } else {
                reject(new Error(`HTTP error: ${res.statusCode} ${data}`));
              }
            });
          });
          
          req.on('error', reject);
          req.write(functionCode);
          req.end();
        });
      },
      
      invoke: (functionName, options = {}) => {
        return new Promise((resolve, reject) => {
          const url = `${supabaseUrl}/functions/v1/${functionName}`;
          const requestOptions = {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json'
            }
          };
          
          const req = https.request(url, requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  resolve(JSON.parse(data));
                } catch (e) {
                  reject(new Error(`Failed to parse response: ${e.message}`));
                }
              } else {
                reject(new Error(`HTTP error: ${res.statusCode} ${data}`));
              }
            });
          });
          
          req.on('error', reject);
          
          if (options.body) {
            req.write(JSON.stringify(options.body));
          }
          
          req.end();
        });
      }
    }
  };
}

// Deploy the Edge Function
async function deployEdgeFunction(supabaseClient) {
  console.log(`\n${symbols.info} ${colors.bold}Deploying ai-proxy Edge Function...${colors.reset}`);
  
  try {
    console.log(`${symbols.pending} Reading function code...`);
    
    const functionPath = path.join(process.cwd(), 'supabase', 'functions', 'ai-proxy', 'index.ts');
    const functionCode = fs.readFileSync(functionPath, 'utf8');
    
    console.log(`${symbols.pending} Deploying... (this may take a minute)`);
    
    const result = await supabaseClient.functions.deploy('ai-proxy', functionCode);
    
    console.log(`${symbols.success} ${colors.green}ai-proxy Edge Function deployed successfully!${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${symbols.error} ${colors.red}Failed to deploy Edge Function:${colors.reset}`);
    console.error(error.message);
    return false;
  }
}

// Test the deployed Edge Function
async function testEdgeFunction(supabaseClient) {
  console.log(`\n${symbols.info} ${colors.bold}Testing deployed Edge Function...${colors.reset}`);
  
  try {
    console.log(`${symbols.pending} Testing health check endpoint...`);
    
    const response = await supabaseClient.functions.invoke('ai-proxy', {
      body: {
        providerId: 'health-check',
        prompt: 'test'
      }
    });
    
    if (response.success) {
      console.log(`${symbols.success} ${colors.green}Health check successful!${colors.reset}`);
      
      // Show configured providers
      if (response.configuredProviders && response.configuredProviders.length > 0) {
        console.log(`${symbols.info} Configured providers: ${response.configuredProviders.join(', ')}`);
      } else {
        console.log(`${symbols.warning} ${colors.yellow}No providers configured yet${colors.reset}`);
      }
      
      // Show any errors
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
  } catch (error) {
    console.error(`${symbols.error} ${colors.red}Failed to test Edge Function:${colors.reset}`);
    console.error(error.message);
    return false;
  }
}

// Run all steps
async function runDeployment() {
  const functionExists = checkEdgeFunctionExists();
  
  if (!functionExists) {
    console.log(`${symbols.error} ${colors.red}Edge Function files not found. Deployment aborted.${colors.reset}`);
    return;
  }
  
  const credentials = getSupabaseCredentials();
  if (!credentials) {
    console.log(`${symbols.error} ${colors.red}Supabase credentials not found. Deployment aborted.${colors.reset}`);
    return;
  }
  
  const { supabaseUrl, supabaseAnonKey } = credentials;
  const supabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);
  
  const deploySuccess = await deployEdgeFunction(supabaseClient);
  
  if (deploySuccess) {
    const testSuccess = await testEdgeFunction(supabaseClient);
    
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
  console.log(`1. ${colors.green}Configure your API keys in the API Keys section${colors.reset}`);
  console.log(`2. ${colors.green}Test the connection in Settings → Connection Mode${colors.reset}`);
  console.log(`3. ${colors.green}Start using the AI proxy in your application${colors.reset}`);
}

// Run the deployment
runDeployment();