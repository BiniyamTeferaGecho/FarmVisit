import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    proxy: {
      // Proxy /api to local backend to avoid CORS during development
      '/api': {
        target: process.env.VITE_PROXY_API_TARGET || 'http://localhost:80',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  }
})