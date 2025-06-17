import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['crypto-js', 'react-hot-toast'],
  },
  server: {
    proxy: {
      // Proxy for Supabase API
      '/api/supabase': {
        target: 'https://owzbrgcwyuugzjafadjy.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/supabase/, ''),
        secure: true,
        headers: {
          'Origin': 'https://owzbrgcwyuugzjafadjy.supabase.co'
        }
      },
      // Proxy for OpenAI API
      '/api/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, ''),
        secure: true,
        headers: {
          'Origin': 'https://api.openai.com'
        }
      },
      // Proxy for Anthropic Claude API
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
        secure: true,
        headers: {
          'Origin': 'https://api.anthropic.com'
        }
      },
      // Proxy for Google Gemini API
      '/api/gemini': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gemini/, ''),
        secure: true,
        headers: {
          'Origin': 'https://generativelanguage.googleapis.com'
        }
      },
      // Proxy for IBM WatsonX API
      '/api/ibm': {
        target: 'https://us-south.ml.cloud.ibm.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ibm/, ''),
        secure: true,
        headers: {
          'Origin': 'https://us-south.ml.cloud.ibm.com'
        }
      }
    }
  }
});