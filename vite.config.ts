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
      }
      // Note: Removed AI provider proxies as they're now handled by the Supabase Edge Function
    }
  }
});