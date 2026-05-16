import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  /** Vercel: default `/`. GitHub Pages project site: set VITE_BASE=/repo-name/ in CI. */
  base: process.env.VITE_BASE || '/',
})
