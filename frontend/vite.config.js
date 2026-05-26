import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'

/**
 * Shell host — consumes each MFE remote.
 * In production each remote is deployed independently at its own URL.
 * For local dev all remotes point back to the shell's dev server (same port)
 * since we run them all in one Vite process during development.
 */
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {
        dashboardMfe:  'http://localhost:3001/assets/remoteEntry.js',
        productsMfe:   'http://localhost:3002/assets/remoteEntry.js',
        stockMfe:      'http://localhost:3003/assets/remoteEntry.js',
        supplierMfe:   'http://localhost:3004/assets/remoteEntry.js',
        reportingMfe:  'http://localhost:3005/assets/remoteEntry.js',
      },
      shared: ['react', 'react-dom', 'react-router-dom', 'axios'],
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api/auth':             { target: 'http://localhost:8081', changeOrigin: true },
      '/api/users':            { target: 'http://localhost:8081', changeOrigin: true },
      '/api/products':         { target: 'http://localhost:8082', changeOrigin: true },
      '/api/locations':        { target: 'http://localhost:8082', changeOrigin: true },
      '/api/stock':            { target: 'http://localhost:8082', changeOrigin: true },
      '/api/batch-lots':       { target: 'http://localhost:8082', changeOrigin: true },
      '/api/cycle-counts':     { target: 'http://localhost:8082', changeOrigin: true },
      '/api/notifications':    { target: 'http://localhost:8083', changeOrigin: true },
      '/api/reports':          { target: 'http://localhost:8084', changeOrigin: true },
      '/api/suppliers':        { target: 'http://localhost:8085', changeOrigin: true },
      '/api/purchase-orders':  { target: 'http://localhost:8085', changeOrigin: true },
    }
  }
})
