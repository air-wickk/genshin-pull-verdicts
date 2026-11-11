import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Local stand-in for api/uid/[uid].ts (the Vercel Edge function).
      // Vite's proxy runs in Node, so it can set the User-Agent header
      // that Enka asks for and that browsers cannot set themselves.
      '/api': {
        target: 'https://enka.network',
        changeOrigin: true,
        headers: { 'User-Agent': 'pull-verdicts/0.1' },
      },
    },
  },
})
