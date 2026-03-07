import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Builds the demo playground as a standard Vite app into demo-dist/.
// This is completely separate from vite.config.ts (which builds the npm library).
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'demo-dist',
    emptyOutDir: true,
  },
})
