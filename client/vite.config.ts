import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: ['jargon-spindle-mulch.ngrok-free.dev'],
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        timeout: 30000,
        proxyTimeout: 30000,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})