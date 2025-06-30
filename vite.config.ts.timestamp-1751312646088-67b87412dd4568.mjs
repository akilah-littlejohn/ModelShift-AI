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
        timeout: 18e4,
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
        timeout: 18e4,
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
        timeout: 18e4,
        configure: (proxy, _options) => {
          proxy.options.proxyTimeout = 18e4;
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
        timeout: 18e4,
        configure: (proxy, _options) => {
          proxy.options.proxyTimeout = 18e4;
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
        timeout: 18e4,
        configure: (proxy, _options) => {
          proxy.options.proxyTimeout = 18e4;
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
        timeout: 18e4,
        configure: (proxy, _options) => {
          proxy.options.proxyTimeout = 18e4;
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFsnbHVjaWRlLXJlYWN0J10sXG4gICAgaW5jbHVkZTogWydjcnlwdG8tanMnLCAncmVhY3QtaG90LXRvYXN0J10sXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHByb3h5OiB7XG4gICAgICAvLyBQcm94eSBmb3IgU3VwYWJhc2UgQVBJXG4gICAgICAnL2FwaS9zdXBhYmFzZSc6IHtcbiAgICAgICAgdGFyZ2V0OiBwcm9jZXNzLmVudi5WSVRFX1NVUEFCQVNFX1VSTCB8fCAnaHR0cHM6Ly9vd3picmdjd3l1dWd6amFmYWRqeS5zdXBhYmFzZS5jbycsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2FwaVxcL3N1cGFiYXNlLywgJycpLFxuICAgICAgICBzZWN1cmU6IHRydWUsXG4gICAgICAgIHRpbWVvdXQ6IDE4MDAwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdPcmlnaW4nOiBwcm9jZXNzLmVudi5WSVRFX1NVUEFCQVNFX1VSTCB8fCAnaHR0cHM6Ly9vd3picmdjd3l1dWd6amFmYWRqeS5zdXBhYmFzZS5jbydcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIC8vIFByb3h5IGZvciBTdXBhYmFzZSBFZGdlIEZ1bmN0aW9uc1xuICAgICAgJy9hcGkvc3VwYWJhc2UtZnVuY3Rpb25zJzoge1xuICAgICAgICB0YXJnZXQ6IGAke3Byb2Nlc3MuZW52LlZJVEVfU1VQQUJBU0VfVVJMIHx8ICdodHRwczovL293emJyZ2N3eXV1Z3pqYWZhZGp5LnN1cGFiYXNlLmNvJ30vZnVuY3Rpb25zL3YxYCxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpXFwvc3VwYWJhc2UtZnVuY3Rpb25zLywgJycpLFxuICAgICAgICBzZWN1cmU6IHRydWUsXG4gICAgICAgIHRpbWVvdXQ6IDE4MDAwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdPcmlnaW4nOiBwcm9jZXNzLmVudi5WSVRFX1NVUEFCQVNFX1VSTCB8fCAnaHR0cHM6Ly9vd3picmdjd3l1dWd6amFmYWRqeS5zdXBhYmFzZS5jbydcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIC8vIFByb3h5IGZvciBPcGVuQUkgQVBJIChmb3IgZGV2ZWxvcG1lbnQgQ09SUyBieXBhc3MpXG4gICAgICAnL2FwaS9vcGVuYWknOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vYXBpLm9wZW5haS5jb20nLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9hcGlcXC9vcGVuYWkvLCAnJyksXG4gICAgICAgIHNlY3VyZTogdHJ1ZSxcbiAgICAgICAgdGltZW91dDogMTgwMDAwLFxuICAgICAgICBjb25maWd1cmU6IChwcm94eSwgX29wdGlvbnMpID0+IHtcbiAgICAgICAgICBwcm94eS5vcHRpb25zLnByb3h5VGltZW91dCA9IDE4MDAwMDtcbiAgICAgICAgICBwcm94eS5vbignZXJyb3InLCAoZXJyLCBfcmVxLCBfcmVzKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnT3BlbkFJIHByb3h5IGVycm9yJywgZXJyKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBwcm94eS5vbigncHJveHlSZXEnLCAocHJveHlSZXEsIHJlcSwgX3JlcykgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1NlbmRpbmcgUmVxdWVzdCB0byBPcGVuQUk6JywgcmVxLm1ldGhvZCwgcmVxLnVybCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVzJywgKHByb3h5UmVzLCByZXEsIF9yZXMpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSZWNlaXZlZCBSZXNwb25zZSBmcm9tIE9wZW5BSTonLCBwcm94eVJlcy5zdGF0dXNDb2RlLCByZXEudXJsKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIC8vIFByb3h5IGZvciBBbnRocm9waWMgQ2xhdWRlIEFQSVxuICAgICAgJy9hcGkvYW50aHJvcGljJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL2FwaS5hbnRocm9waWMuY29tJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpXFwvYW50aHJvcGljLywgJycpLFxuICAgICAgICBzZWN1cmU6IHRydWUsXG4gICAgICAgIHRpbWVvdXQ6IDE4MDAwMCxcbiAgICAgICAgY29uZmlndXJlOiAocHJveHksIF9vcHRpb25zKSA9PiB7XG4gICAgICAgICAgcHJveHkub3B0aW9ucy5wcm94eVRpbWVvdXQgPSAxODAwMDA7XG4gICAgICAgICAgcHJveHkub24oJ2Vycm9yJywgKGVyciwgX3JlcSwgX3JlcykgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0FudGhyb3BpYyBwcm94eSBlcnJvcicsIGVycik7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVxJywgKHByb3h5UmVxLCByZXEsIF9yZXMpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTZW5kaW5nIFJlcXVlc3QgdG8gQW50aHJvcGljOicsIHJlcS5tZXRob2QsIHJlcS51cmwpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcycsIChwcm94eVJlcywgcmVxLCBfcmVzKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnUmVjZWl2ZWQgUmVzcG9uc2UgZnJvbSBBbnRocm9waWM6JywgcHJveHlSZXMuc3RhdHVzQ29kZSwgcmVxLnVybCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICAvLyBQcm94eSBmb3IgR29vZ2xlIEdlbWluaSBBUElcbiAgICAgICcvYXBpL2dlbWluaSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cHM6Ly9nZW5lcmF0aXZlbGFuZ3VhZ2UuZ29vZ2xlYXBpcy5jb20nLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9hcGlcXC9nZW1pbmkvLCAnJyksXG4gICAgICAgIHNlY3VyZTogdHJ1ZSxcbiAgICAgICAgdGltZW91dDogMTgwMDAwLFxuICAgICAgICBjb25maWd1cmU6IChwcm94eSwgX29wdGlvbnMpID0+IHtcbiAgICAgICAgICBwcm94eS5vcHRpb25zLnByb3h5VGltZW91dCA9IDE4MDAwMDtcbiAgICAgICAgICBwcm94eS5vbignZXJyb3InLCAoZXJyLCBfcmVxLCBfcmVzKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnR2VtaW5pIHByb3h5IGVycm9yJywgZXJyKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBwcm94eS5vbigncHJveHlSZXEnLCAocHJveHlSZXEsIHJlcSwgX3JlcykgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1NlbmRpbmcgUmVxdWVzdCB0byBHZW1pbmk6JywgcmVxLm1ldGhvZCwgcmVxLnVybCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVzJywgKHByb3h5UmVzLCByZXEsIF9yZXMpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSZWNlaXZlZCBSZXNwb25zZSBmcm9tIEdlbWluaTonLCBwcm94eVJlcy5zdGF0dXNDb2RlLCByZXEudXJsKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIC8vIFByb3h5IGZvciBJQk0gV2F0c29uWCBBUElcbiAgICAgICcvYXBpL2libSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cHM6Ly91cy1zb3V0aC5tbC5jbG91ZC5pYm0uY29tJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpXFwvaWJtLywgJycpLFxuICAgICAgICBzZWN1cmU6IHRydWUsXG4gICAgICAgIHRpbWVvdXQ6IDE4MDAwMCxcbiAgICAgICAgY29uZmlndXJlOiAocHJveHksIF9vcHRpb25zKSA9PiB7XG4gICAgICAgICAgcHJveHkub3B0aW9ucy5wcm94eVRpbWVvdXQgPSAxODAwMDA7XG4gICAgICAgICAgcHJveHkub24oJ2Vycm9yJywgKGVyciwgX3JlcSwgX3JlcykgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0lCTSBwcm94eSBlcnJvcicsIGVycik7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVxJywgKHByb3h5UmVxLCByZXEsIF9yZXMpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTZW5kaW5nIFJlcXVlc3QgdG8gSUJNOicsIHJlcS5tZXRob2QsIHJlcS51cmwpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcycsIChwcm94eVJlcywgcmVxLCBfcmVzKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnUmVjZWl2ZWQgUmVzcG9uc2UgZnJvbSBJQk06JywgcHJveHlSZXMuc3RhdHVzQ29kZSwgcmVxLnVybCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pOyJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxvQkFBb0I7QUFDdFAsT0FBTyxXQUFXO0FBR2xCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsY0FBYztBQUFBLElBQ3hCLFNBQVMsQ0FBQyxhQUFhLGlCQUFpQjtBQUFBLEVBQzFDO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixPQUFPO0FBQUE7QUFBQSxNQUVMLGlCQUFpQjtBQUFBLFFBQ2YsUUFBUSxRQUFRLElBQUkscUJBQXFCO0FBQUEsUUFDekMsY0FBYztBQUFBLFFBQ2QsU0FBUyxDQUFDLFNBQVMsS0FBSyxRQUFRLG9CQUFvQixFQUFFO0FBQUEsUUFDdEQsUUFBUTtBQUFBLFFBQ1IsU0FBUztBQUFBLFFBQ1QsU0FBUztBQUFBLFVBQ1AsVUFBVSxRQUFRLElBQUkscUJBQXFCO0FBQUEsUUFDN0M7QUFBQSxNQUNGO0FBQUE7QUFBQSxNQUVBLDJCQUEyQjtBQUFBLFFBQ3pCLFFBQVEsR0FBRyxRQUFRLElBQUkscUJBQXFCLDBDQUEwQztBQUFBLFFBQ3RGLGNBQWM7QUFBQSxRQUNkLFNBQVMsQ0FBQyxTQUFTLEtBQUssUUFBUSw4QkFBOEIsRUFBRTtBQUFBLFFBQ2hFLFFBQVE7QUFBQSxRQUNSLFNBQVM7QUFBQSxRQUNULFNBQVM7QUFBQSxVQUNQLFVB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
