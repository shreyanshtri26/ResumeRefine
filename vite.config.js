import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/openrouter': {
        target: 'https://openrouter.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openrouter/, ''),
      },
      '/api/texlive': {
        target: 'https://texlive.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/texlive/, ''),
      },
      '/latexcgi': {
        target: 'https://texlive.net',
        changeOrigin: true,
      },
    },
  },
})
