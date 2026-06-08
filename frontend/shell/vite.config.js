import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'

/**
 * Local dev:  MFEs run on ports 3001-3005
 * Production: all MFEs served from same nginx at /mfe/<name>/
 */
const isProd = process.env.NODE_ENV === 'production'

export default defineConfig(() => ({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {
        dashboardMfe: `${process.env.VITE_DASHBOARD_MFE_URL || (isProd ? '/mfe/dashboard' : 'http://localhost:3001')}/assets/remoteEntry.js`,
        productsMfe:  `${process.env.VITE_PRODUCTS_MFE_URL  || (isProd ? '/mfe/products'  : 'http://localhost:3002')}/assets/remoteEntry.js`,
        stockMfe:     `${process.env.VITE_STOCK_MFE_URL     || (isProd ? '/mfe/stock'      : 'http://localhost:3003')}/assets/remoteEntry.js`,
        supplierMfe:  `${process.env.VITE_SUPPLIER_MFE_URL  || (isProd ? '/mfe/supplier'   : 'http://localhost:3004')}/assets/remoteEntry.js`,
        reportingMfe: `${process.env.VITE_REPORTING_MFE_URL || (isProd ? '/mfe/reporting'  : 'http://localhost:3005')}/assets/remoteEntry.js`,
      },
      shared: {
        react:              { singleton: true, requiredVersion: '^18.3.1' },
        'react-dom':        { singleton: true, requiredVersion: '^18.3.1' },
        'react-router-dom': { singleton: true, requiredVersion: '^6.23.1' },
        axios:              { singleton: true },
      },
    }),
  ],
  server: {
    port: 3000,
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
}))

