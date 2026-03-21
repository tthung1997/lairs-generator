import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/lairs-generator/',
  build: {
    outDir: 'dist',
  },
})
