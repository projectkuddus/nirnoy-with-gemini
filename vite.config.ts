import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load env file based on mode
    const env = loadEnv(mode, '.', '');
    
    return {
      base: '/',
      server: {
        port: 5173,
        host: true,
        strictPort: false,
        open: true,
      },
      plugins: [react()],
      // Note: VITE_ prefixed env vars are automatically exposed to client
      // No need to define them manually - they're available via import.meta.env
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      },
      build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
      }
    };
});
