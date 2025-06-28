// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["lucide-react"],
    include: ["crypto-js", "react-hot-toast"]
  },
  server: {
    proxy: {
      // Proxy for Supabase API
      "/api/supabase": {
        target: process.env.VITE_SUPABASE_URL || "https://owzbrgcwyuugzjafadjy.supabase.co",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/supabase/, ""),
        secure: true,
        headers: {
          "Origin": process.env.VITE_SUPABASE_URL || "https://owzbrgcwyuugzjafadjy.supabase.co"
        }
      },
      // Proxy for Supabase Edge Functions
      "/api/supabase-functions": {
        target: `${process.env.VITE_SUPABASE_URL || "https://owzbrgcwyuugzjafadjy.supabase.co"}/functions/v1`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/supabase-functions/, ""),
        secure: true,
        headers: {
          "Origin": process.env.VITE_SUPABASE_URL || "https://owzbrgcwyuugzjafadjy.supabase.co"
        }
      },
      // Proxy for OpenAI API (for development CORS bypass)
      "/api/openai": {
        target: "https://api.openai.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, ""),
        secure: true,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("OpenAI proxy error", err);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            console.log("Sending Request to OpenAI:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log("Received Response from OpenAI:", proxyRes.statusCode, req.url);
          });
        }
      },
      // Proxy for Anthropic Claude API
      "/api/anthropic": {
        target: "https://api.anthropic.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ""),
        secure: true,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("Anthropic proxy error", err);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            console.log("Sending Request to Anthropic:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log("Received Response from Anthropic:", proxyRes.statusCode, req.url);
          });
        }
      },
      // Proxy for Google Gemini API
      "/api/gemini": {
        target: "https://generativelanguage.googleapis.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gemini/, ""),
        secure: true,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("Gemini proxy error", err);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            console.log("Sending Request to Gemini:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log("Received Response from Gemini:", proxyRes.statusCode, req.url);
          });
        }
      },
      // Proxy for IBM WatsonX API
      "/api/ibm": {
        target: "https://us-south.ml.cloud.ibm.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ibm/, ""),
        secure: true,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("IBM proxy error", err);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            console.log("Sending Request to IBM:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log("Received Response from IBM:", proxyRes.statusCode, req.url);
          });
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFsnbHVjaWRlLXJlYWN0J10sXG4gICAgaW5jbHVkZTogWydjcnlwdG8tanMnLCAncmVhY3QtaG90LXRvYXN0J10sXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHByb3h5OiB7XG4gICAgICAvLyBQcm94eSBmb3IgU3VwYWJhc2UgQVBJXG4gICAgICAnL2FwaS9zdXBhYmFzZSc6IHtcbiAgICAgICAgdGFyZ2V0OiBwcm9jZXNzLmVudi5WSVRFX1NVUEFCQVNFX1VSTCB8fCAnaHR0cHM6Ly9vd3picmdjd3l1dWd6amFmYWRqeS5zdXBhYmFzZS5jbycsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2FwaVxcL3N1cGFiYXNlLywgJycpLFxuICAgICAgICBzZWN1cmU6IHRydWUsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnT3JpZ2luJzogcHJvY2Vzcy5lbnYuVklURV9TVVBBQkFTRV9VUkwgfHwgJ2h0dHBzOi8vb3d6YnJnY3d5dXVnemphZmFkankuc3VwYWJhc2UuY28nXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICAvLyBQcm94eSBmb3IgU3VwYWJhc2UgRWRnZSBGdW5jdGlvbnNcbiAgICAgICcvYXBpL3N1cGFiYXNlLWZ1bmN0aW9ucyc6IHtcbiAgICAgICAgdGFyZ2V0OiBgJHtwcm9jZXNzLmVudi5WSVRFX1NVUEFCQVNFX1VSTCB8fCAnaHR0cHM6Ly9vd3picmdjd3l1dWd6amFmYWRqeS5zdXBhYmFzZS5jbyd9L2Z1bmN0aW9ucy92MWAsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2FwaVxcL3N1cGFiYXNlLWZ1bmN0aW9ucy8sICcnKSxcbiAgICAgICAgc2VjdXJlOiB0cnVlLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ09yaWdpbic6IHByb2Nlc3MuZW52LlZJVEVfU1VQQUJBU0VfVVJMIHx8ICdodHRwczovL293emJyZ2N3eXV1Z3pqYWZhZGp5LnN1cGFiYXNlLmNvJ1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgLy8gUHJveHkgZm9yIE9wZW5BSSBBUEkgKGZvciBkZXZlbG9wbWVudCBDT1JTIGJ5cGFzcylcbiAgICAgICcvYXBpL29wZW5haSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cHM6Ly9hcGkub3BlbmFpLmNvbScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2FwaVxcL29wZW5haS8sICcnKSxcbiAgICAgICAgc2VjdXJlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmU6IChwcm94eSwgX29wdGlvbnMpID0+IHtcbiAgICAgICAgICBwcm94eS5vbignZXJyb3InLCAoZXJyLCBfcmVxLCBfcmVzKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnT3BlbkFJIHByb3h5IGVycm9yJywgZXJyKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBwcm94eS5vbigncHJveHlSZXEnLCAocHJveHlSZXEsIHJlcSwgX3JlcykgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1NlbmRpbmcgUmVxdWVzdCB0byBPcGVuQUk6JywgcmVxLm1ldGhvZCwgcmVxLnVybCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVzJywgKHByb3h5UmVzLCByZXEsIF9yZXMpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSZWNlaXZlZCBSZXNwb25zZSBmcm9tIE9wZW5BSTonLCBwcm94eVJlcy5zdGF0dXNDb2RlLCByZXEudXJsKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIC8vIFByb3h5IGZvciBBbnRocm9waWMgQ2xhdWRlIEFQSVxuICAgICAgJy9hcGkvYW50aHJvcGljJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL2FwaS5hbnRocm9waWMuY29tJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpXFwvYW50aHJvcGljLywgJycpLFxuICAgICAgICBzZWN1cmU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyZTogKHByb3h5LCBfb3B0aW9ucykgPT4ge1xuICAgICAgICAgIHByb3h5Lm9uKCdlcnJvcicsIChlcnIsIF9yZXEsIF9yZXMpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdBbnRocm9waWMgcHJveHkgZXJyb3InLCBlcnIpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcScsIChwcm94eVJlcSwgcmVxLCBfcmVzKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnU2VuZGluZyBSZXF1ZXN0IHRvIEFudGhyb3BpYzonLCByZXEubWV0aG9kLCByZXEudXJsKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBwcm94eS5vbigncHJveHlSZXMnLCAocHJveHlSZXMsIHJlcSwgX3JlcykgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1JlY2VpdmVkIFJlc3BvbnNlIGZyb20gQW50aHJvcGljOicsIHByb3h5UmVzLnN0YXR1c0NvZGUsIHJlcS51cmwpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgLy8gUHJveHkgZm9yIEdvb2dsZSBHZW1pbmkgQVBJXG4gICAgICAnL2FwaS9nZW1pbmknOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vZ2VuZXJhdGl2ZWxhbmd1YWdlLmdvb2dsZWFwaXMuY29tJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpXFwvZ2VtaW5pLywgJycpLFxuICAgICAgICBzZWN1cmU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyZTogKHByb3h5LCBfb3B0aW9ucykgPT4ge1xuICAgICAgICAgIHByb3h5Lm9uKCdlcnJvcicsIChlcnIsIF9yZXEsIF9yZXMpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdHZW1pbmkgcHJveHkgZXJyb3InLCBlcnIpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcScsIChwcm94eVJlcSwgcmVxLCBfcmVzKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnU2VuZGluZyBSZXF1ZXN0IHRvIEdlbWluaTonLCByZXEubWV0aG9kLCByZXEudXJsKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBwcm94eS5vbigncHJveHlSZXMnLCAocHJveHlSZXMsIHJlcSwgX3JlcykgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1JlY2VpdmVkIFJlc3BvbnNlIGZyb20gR2VtaW5pOicsIHByb3h5UmVzLnN0YXR1c0NvZGUsIHJlcS51cmwpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgLy8gUHJveHkgZm9yIElCTSBXYXRzb25YIEFQSVxuICAgICAgJy9hcGkvaWJtJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL3VzLXNvdXRoLm1sLmNsb3VkLmlibS5jb20nLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9hcGlcXC9pYm0vLCAnJyksXG4gICAgICAgIHNlY3VyZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJlOiAocHJveHksIF9vcHRpb25zKSA9PiB7XG4gICAgICAgICAgcHJveHkub24oJ2Vycm9yJywgKGVyciwgX3JlcSwgX3JlcykgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0lCTSBwcm94eSBlcnJvcicsIGVycik7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVxJywgKHByb3h5UmVxLCByZXEsIF9yZXMpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTZW5kaW5nIFJlcXVlc3QgdG8gSUJNOicsIHJlcS5tZXRob2QsIHJlcS51cmwpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcycsIChwcm94eVJlcywgcmVxLCBfcmVzKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnUmVjZWl2ZWQgUmVzcG9uc2UgZnJvbSBJQk06JywgcHJveHlSZXMuc3RhdHVzQ29kZSwgcmVxLnVybCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pOyJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxvQkFBb0I7QUFDdFAsT0FBTyxXQUFXO0FBR2xCLElBQU8sc0JBQVEsYUFB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
