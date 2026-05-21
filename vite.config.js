import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom)[\\/]/,
              priority: 3,
            },
            {
              name: 'three-vendor',
              test: /node_modules[\\/](@react-three|three|troika-three-text|maath|camera-controls)[\\/]/,
              priority: 2,
              maxSize: 420 * 1024,
            },
            {
              name: 'vendor',
              test: /node_modules[\\/]/,
              priority: 1,
              maxSize: 260 * 1024,
            },
          ],
        },
      },
    },
  },
})
