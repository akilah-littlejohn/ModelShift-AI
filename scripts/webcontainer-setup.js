#!/usr/bin/env node

/**
 * WebContainer Setup Script for ModelShift AI
 * 
 * This script helps set up the project in WebContainer environments
 * where the Supabase CLI is not available.
 */

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

const symbols = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  pending: '🔄'
};

console.log(`
${colors.bold}${colors.blue}ModelShift AI - WebContainer Setup${colors.reset}
${colors.cyan}===================================${colors.reset}
`);

console.log(`${symbols.info} ${colors.bold}WebContainer Environment Detected${colors.reset}`);
console.log(`
${colors.yellow}In WebContainer environments (like Bolt.new), the Supabase CLI is not available.${colors.reset}
${colors.yellow}Please use the Supabase Dashboard for all configuration tasks.${colors.reset}

${colors.bold}Setup Steps:${colors.reset}

${colors.green}1. Environment Configuration:${colors.reset}
   - Copy .env.example to .env.local
   - Add your Supabase URL and anon key

${colors.green}2. Database Setup:${colors.reset}
   - Go to your Supabase Dashboard
   - Navigate to SQL Editor
   - Run migration files from supabase/migrations/ in order

${colors.green}3. Edge Functions:${colors.reset}
   - Go to Edge Functions in Supabase Dashboard
   - Create function named 'ai-proxy'
   - Copy code from supabase/functions/ai-proxy/index.ts

${colors.green}4. Secrets Configuration:${colors.reset}
   - Go to Project Settings → API → Secrets
   - Add your AI provider API keys

${colors.green}5. Test Configuration:${colors.reset}
   - Run: npm run check-supabase
   - Start development: npm run dev

${colors.bold}Useful Commands:${colors.reset}
- ${colors.cyan}npm run check-supabase${colors.reset} - Check configuration
- ${colors.cyan}npm run dev${colors.reset} - Start development server
- ${colors.cyan}npm run setup-local${colors.reset} - Run setup checks

${colors.bold}Documentation:${colors.reset}
- ${colors.cyan}README.md${colors.reset} - Full setup guide
- ${colors.cyan}docs/EDGE_FUNCTION_DEBUGGING.md${colors.reset} - Debugging guide
`);