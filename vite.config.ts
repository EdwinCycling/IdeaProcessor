import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3020,
        strictPort: true,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:9998',
            changeOrigin: true,
            // rewrite: (path) => path.replace(/^\/api/, ''), // Don't rewrite, let backend handle /api
          },
        },
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
             output: {
                 manualChunks(id) {
                     if (id.includes('node_modules')) {
                         if (id.includes('firebase')) {
                              return 'firebase';
                          }
                          return 'vendor';
                     }
                 }
             }
         }
      }
    };
});
