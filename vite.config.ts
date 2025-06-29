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
        target: process.env.VITE_SUPABASE_URL || 'https://owzbrgcwyuugzjafadjy.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/supabase/, ''),
        secure: true,
        timeout: 180000,
        headers: {
          'Origin': process.env.VITE_SUPABASE_URL || 'https://owzbrgcwyuugzjafadjy.supabase.co'
        }
      },
      // Proxy for Supabase Edge Functions
      '/api/supabase-functions': {
        target: `${process.env.VITE_SUPABASE_URL || 'https://owzbrgcwyuugzjafadjy.supabase.co'}/functions/v1`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/supabase-functions/, ''),
        secure: true,
        timeout: 180000,
        headers: {
          'Origin': process.env.VITE_SUPABASE_URL || 'https://owzbrgcwyuugzjafadjy.supabase.co'
        }
      },
      // Proxy for OpenAI API (for development CORS bypass)
      '/api/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, ''),
        secure: true,
        timeout: 180000,
        configure: (proxy, _options) => {
          proxy.options.proxyTimeout = 180000;
          proxy.on('error', (err, _req, _res) => {
            console.log('OpenAI proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to OpenAI:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from OpenAI:', proxyRes.statusCode, req.url);
          });
        }
      },
      // Proxy for Anthropic Claude API
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
        secure: true,
        timeout: 180000,
        configure: (proxy, _options) => {
          proxy.options.proxyTimeout = 180000;
          proxy.on('error', (err, _req, _res) => {
            console.log('Anthropic proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to Anthropic:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from Anthropic:', proxyRes.statusCode, req.url);
          });
        }
      },
      // Proxy for Google Gemini API
      '/api/gemini': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gemini/, ''),
        secure: true,
        timeout: 180000,
        configure: (proxy, _options) => {
          proxy.options.proxyTimeout = 180000;
          proxy.on('error', (err, _req, _res) => {
            console.log('Gemini proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to Gemini:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from Gemini:', proxyRes.statusCode, req.url);
          });
        }
      },
      // Proxy for IBM WatsonX API
      '/api/ibm': {
        target: 'https://us-south.ml.cloud.ibm.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ibm/, ''),
        secure: true,
        timeout: 180000,
        configure: (proxy, _options) => {
          proxy.options.proxyTimeout = 180000;
          proxy.on('error', (err, _req, _res) => {
            console.log('IBM proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to IBM:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from IBM:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  }
});