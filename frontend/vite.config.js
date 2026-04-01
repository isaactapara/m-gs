import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    host: 'localhost',
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
    hmr: {
      host: 'localhost',
      overlay: false,
    },
    watch: {
      usePolling: true,
    },
  },
  build: {
    rollupOptions: {
      input: [
        'index.html',
        'login.html',
        'menu.html',
        'tables.html',
        'bills.html',
        'reports.html',
        'settings.html',
      ]
    }
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
})

