import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Build timestamp used for cache busting
const buildTime = Date.now();

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    // Expose build timestamp for cache busting
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(buildTime)
  },
  build: {
    // Enable filename hashing for better cache control
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code into separate chunks
          vendor: [
            'react', 
            'react-dom', 
            'react-router-dom',
            'framer-motion'
          ],
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-tabs'
          ]
        },
        // Use content hashing for automatic cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  // Ensure proper MIME type handling
  server: {
    fs: {
      strict: true,
    },
    headers: {
      // Ensure proper content types are set
      "*.js": [
        {
          "Content-Type": "application/javascript"
        }
      ],
      "*.jsx": [
        {
          "Content-Type": "application/javascript"
        }
      ],
      "*.ts": [
        {
          "Content-Type": "application/javascript"
        }
      ],
      "*.tsx": [
        {
          "Content-Type": "application/javascript"
        }
      ]
    }
  }
});