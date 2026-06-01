import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'

/**
 * Shell host — consumes each MFE remote.
 *
 * Local dev: each MFE runs its own Vite dev server on its own port.
 *   dashboard-mfe: npm run dev  (port 3001)
 *   products-mfe:  npm run dev  (port 3002)
 *   stock-mfe:     npm run dev  (port 3003)
 *   supplier-mfe:  npm run dev  (port 3004)
 *   reporting-mfe: npm run dev  (port 3005)
 *   shell:         npm run dev  (port 3000)
 *
 * Production: each MFE is built with `npm run build` and its dist/
 * is served via its own nginx container or CDN origin. The shell's
 * remoteEntry URLs below become the CDN/ALB paths to each MFE's bundle.
 *
 * The VITE_* environment variables let you override remote URLs without
 * rebuilding the shell (set them in .env or docker-compose environment).
 */
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {
        dashboardMfe: `${import.meta.env.VITE_DASHBOARD_MFE_URL || 'http://localhost:3001'}/assets/remoteEntry.js`,
        productsMfe:  `${import.meta.env.VITE_PRODUCTS_MFE_URL  || 'http://localhost:3002'}/assets/remoteEntry.js`,
        stockMfe:     `${import.meta.env.VITE_STOCK_MFE_URL     || 'http://localhost:3003'}/assets/remoteEntry.js`,
        supplierMfe:  `${import.meta.env.VITE_SUPPLIER_MFE_URL  || 'http://localhost:3004'}/assets/remoteEntry.js`,
        reportingMfe: `${import.meta.env.VITE_REPORTING_MFE_URL || 'http://localhost:3005'}/assets/remoteEntry.js`,
      },
      shared: {
        react:            { singleton: true, requiredVersion: '^18.3.1' },
        'react-dom':      { singleton: true, requiredVersion: '^18.3.1' },
        'react-router-dom': { singleton: true, requiredVersion: '^6.23.1' },
        axios:            { singleton: true },
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
