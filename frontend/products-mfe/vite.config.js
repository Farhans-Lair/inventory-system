import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'

// Production base path — assets load from /mfe/products/ when built
const isProd = process.env.NODE_ENV === 'production'


export default defineConfig({
  base: isProd ? '/mfe/products/' : '/',
  plugins: [
    react(),
    federation({
      name: 'products-mfe',
      filename: 'remoteEntry.js',
      exposes: { './ProductsPage': './src/ProductsPage.jsx', './LocationsPage': './src/LocationsPage.jsx', './BatchLotsPage': './src/BatchLotsPage.jsx', './CycleCountsPage': './src/CycleCountsPage.jsx', './UomPage': './src/UomPage.jsx' },
      shared: {
        react:              { singleton: true, requiredVersion: '^18.3.1' },
        'react-dom':        { singleton: true, requiredVersion: '^18.3.1' },
        'react-router-dom': { singleton: true, requiredVersion: '^6.23.1' },
        axios:              { singleton: true },
      },
    }),
  ],
  server: {
    port: 3002,
    // Proxy API calls — same as shell so each MFE can run standalone
    proxy: {
      '/api/auth':            { target: 'http://localhost:8081', changeOrigin: true },
      '/api/users':           { target: 'http://localhost:8081', changeOrigin: true },
      '/api/products':        { target: 'http://localhost:8082', changeOrigin: true },
      '/api/locations':       { target: 'http://localhost:8082', changeOrigin: true },
      '/api/stock':           { target: 'http://localhost:8082', changeOrigin: true },
      '/api/batch-lots':      { target: 'http://localhost:8082', changeOrigin: true },
      '/api/cycle-counts':    { target: 'http://localhost:8082', changeOrigin: true },
      '/api/notifications':   { target: 'http://localhost:8083', changeOrigin: true },
      '/api/reports':         { target: 'http://localhost:8084', changeOrigin: true },
      '/api/suppliers':       { target: 'http://localhost:8085', changeOrigin: true },
      '/api/purchase-orders': { target: 'http://localhost:8085', changeOrigin: true },
    },
  },
  build: { target: 'esnext' },
})
