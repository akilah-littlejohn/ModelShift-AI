// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["lucide-react"]
  },
  server: {
    proxy: {
      // Proxy for Supabase API
      "/api/supabase": {
        target: "https://owzbrgcwyuugzjafadjy.supabase.co",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/supabase/, ""),
        secure: true,
        headers: {
          "Origin": "https://owzbrgcwyuugzjafadjy.supabase.co"
        }
      },
      // Proxy for OpenAI API
      "/api/openai": {
        target: "https://api.openai.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, ""),
        secure: true,
        headers: {
          "Origin": "https://api.openai.com"
        }
      },
      // Proxy for Anthropic Claude API
      "/api/anthropic": {
        target: "https://api.anthropic.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ""),
        secure: true,
        headers: {
          "Origin": "https://api.anthropic.com"
        }
      },
      // Proxy for Google Gemini API
      "/api/gemini": {
        target: "https://generativelanguage.googleapis.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gemini/, ""),
        secure: true,
        headers: {
          "Origin": "https://generativelanguage.googleapis.com"
        }
      },
      // Proxy for IBM WatsonX API
      "/api/ibm": {
        target: "https://us-south.ml.cloud.ibm.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ibm/, ""),
        secure: true,
        headers: {
          "Origin": "https://us-south.ml.cloud.ibm.com"
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFsnbHVjaWRlLXJlYWN0J10sXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHByb3h5OiB7XG4gICAgICAvLyBQcm94eSBmb3IgU3VwYWJhc2UgQVBJXG4gICAgICAnL2FwaS9zdXBhYmFzZSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cHM6Ly9vd3picmdjd3l1dWd6amFmYWRqeS5zdXBhYmFzZS5jbycsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2FwaVxcL3N1cGFiYXNlLywgJycpLFxuICAgICAgICBzZWN1cmU6IHRydWUsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnT3JpZ2luJzogJ2h0dHBzOi8vb3d6YnJnY3d5dXVnemphZmFkankuc3VwYWJhc2UuY28nXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICAvLyBQcm94eSBmb3IgT3BlbkFJIEFQSVxuICAgICAgJy9hcGkvb3BlbmFpJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL2FwaS5vcGVuYWkuY29tJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpXFwvb3BlbmFpLywgJycpLFxuICAgICAgICBzZWN1cmU6IHRydWUsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnT3JpZ2luJzogJ2h0dHBzOi8vYXBpLm9wZW5haS5jb20nXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICAvLyBQcm94eSBmb3IgQW50aHJvcGljIENsYXVkZSBBUElcbiAgICAgICcvYXBpL2FudGhyb3BpYyc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cHM6Ly9hcGkuYW50aHJvcGljLmNvbScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2FwaVxcL2FudGhyb3BpYy8sICcnKSxcbiAgICAgICAgc2VjdXJlOiB0cnVlLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ09yaWdpbic6ICdodHRwczovL2FwaS5hbnRocm9waWMuY29tJ1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgLy8gUHJveHkgZm9yIEdvb2dsZSBHZW1pbmkgQVBJXG4gICAgICAnL2FwaS9nZW1pbmknOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vZ2VuZXJhdGl2ZWxhbmd1YWdlLmdvb2dsZWFwaXMuY29tJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpXFwvZ2VtaW5pLywgJycpLFxuICAgICAgICBzZWN1cmU6IHRydWUsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnT3JpZ2luJzogJ2h0dHBzOi8vZ2VuZXJhdGl2ZWxhbmd1YWdlLmdvb2dsZWFwaXMuY29tJ1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgLy8gUHJveHkgZm9yIElCTSBXYXRzb25YIEFQSVxuICAgICAgJy9hcGkvaWJtJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL3VzLXNvdXRoLm1sLmNsb3VkLmlibS5jb20nLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9hcGlcXC9pYm0vLCAnJyksXG4gICAgICAgIHNlY3VyZTogdHJ1ZSxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdPcmlnaW4nOiAnaHR0cHM6Ly91cy1zb3V0aC5tbC5jbG91ZC5pYm0uY29tJ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59KTsiXSwKICAibWFwcGluZ3MiOiAiO0FBQXlOLFNBQVMsb0JBQW9CO0FBQ3RQLE9BQU8sV0FBVztBQUdsQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLGNBQWM7QUFBQSxFQUMxQjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sT0FBTztBQUFBO0FBQUEsTUFFTCxpQkFBaUI7QUFBQSxRQUNmLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFNBQVMsQ0FBQyxTQUFTLEtBQUssUUFBUSxvQkFBb0IsRUFBRTtBQUFBLFFBQ3RELFFBQVE7QUFBQSxRQUNSLFNBQVM7QUFBQSxVQUNQLFVBQVU7QUFBQSxRQUNaO0FBQUEsTUFDRjtBQUFBO0FBQUEsTUFFQSxlQUFlO0FBQUEsUUFDYixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxTQUFTLENBQUMsU0FBUyxLQUFLLFFBQVEsa0JBQWtCLEVBQUU7QUFBQSxRQUNwRCxRQUFRO0FBQUEsUUFDUixTQUFTO0FBQUEsVUFDUCxVQUFVO0FBQUEsUUFDWjtBQUFBLE1BQ0Y7QUFBQTtBQUFBLE1BRUEsa0JBQWtCO0FBQUEsUUFDaEIsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsU0FBUyxDQUFDLFNBQVMsS0FBSyxRQUFRLHFCQUFxQixFQUFFO0FBQUEsUUFDdkQsUUFBUTtBQUFBLFFBQ1IsU0FBUztBQUFBLFVBQ1AsVUFBVTtBQUFBLFFBQ1o7QUFBQSxNQUNGO0FBQUE7QUFBQSxNQUVBLGVBQWU7QUFBQSxRQUNiLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFNBQVMsQ0FBQyxTQUFTLEtBQUssUUFBUSxrQkFBa0IsRUFBRTtBQUFBLFFBQ3BELFFBQVE7QUFBQSxRQUNSLFNBQVM7QUFBQSxVQUNQLFVBQVU7QUFBQSxRQUNaO0FBQUEsTUFDRjtBQUFBO0FBQUEsTUFFQSxZQUFZO0FBQUEsUUFDVixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxTQUFTLENBQUMsU0FBUyxLQUFLLFFBQVEsZUFBZSxFQUFFO0FBQUEsUUFDakQsUUFBUTtBQUFBLFFBQ1IsU0FBUztBQUFBLFVBQ1AsVUFBVTtBQUFBLFFBQ1o7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
