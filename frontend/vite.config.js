import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        // Do NOT set changeOrigin — Django must see Host: localhost:5173
        // so it constructs OAuth redirect_uris that go through this proxy.
        cookieDomainRewrite: '',
      },
      '/_allauth': {
        target: 'http://127.0.0.1:8000',
        cookieDomainRewrite: '',
      },
      '/accounts': {
        target: 'http://127.0.0.1:8000',
        cookieDomainRewrite: '',
      },
      '/static': {
        target: 'http://127.0.0.1:8000',
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
