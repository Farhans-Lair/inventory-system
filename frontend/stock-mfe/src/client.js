import axios from 'axios'

/**
 * TAB-ISOLATED MFE API CLIENT
 *
 * Sends Authorization: Bearer header using this tab's access token
 * from sessionStorage. Each tab is independently authenticated.
 *
 * withCredentials: true kept for refresh_token cookie on /api/auth/refresh.
 */
const client = axios.create({
  baseURL: '/',
  withCredentials: true,
})

// ── Request interceptor: attach this tab's access token ──────────────────
client.interceptors.request.use(config => {
  const token = sessionStorage.getItem('access_token')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: handle 401 with token refresh ──────────────────
let isRefreshing = false
let failedQueue  = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token))
  failedQueue = []
}

client.interceptors.response.use(
  r => r,
  async err => {
    const status      = err.response?.status
    const originalReq = err.config
    const url         = originalReq?.url || ''
    const isAuthEndpoint = url.includes('/api/auth/')

    if (status === 401 && !originalReq._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalReq.headers['Authorization'] = `Bearer ${token}`
          return client(originalReq)
        }).catch(e => Promise.reject(e))
      }

      originalReq._retry = true
      isRefreshing = true

      try {
        const { data } = await client.post('/api/auth/refresh')
        const newToken = data.accessToken
        sessionStorage.setItem('access_token', newToken)
        if (data.userId) {
          sessionStorage.setItem('user', JSON.stringify({
            userId: data.userId, email: data.email,
            fullName: data.fullName, role: data.role,
          }))
        }
        processQueue(null, newToken)
        originalReq.headers['Authorization'] = `Bearer ${newToken}`
        return client(originalReq)
      } catch (refreshError) {
        processQueue(refreshError, null)
        sessionStorage.removeItem('access_token')
        sessionStorage.removeItem('user')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  initiateSignup:   d  => client.post('/api/auth/signup', d),
  verifySignup:     d  => client.post('/api/auth/verify-signup', d),
  initiateLogin:    d  => client.post('/api/auth/login', d),
  verifyLogin:      d  => client.post('/api/auth/verify-login', d),
  forgotPassword:   d  => client.post('/api/auth/forgot-password', d),
  resetPassword:    d  => client.post('/api/auth/reset-password', d),
  logout:           () => client.post('/api/auth/logout'),
  getUsers:         () => client.get('/api/users'),
  createUser:       d  => client.post('/api/users', d),
  toggleActive:     id => client.patch(`/api/users/${id}/toggle-active`),
}

// ── Inventory ─────────────────────────────────────────────────────────────
export const inventoryApi = {
  getSummary:              ()          => client.get('/api/stock/summary'),
  getProducts:             ()          => client.get('/api/products'),
  getProduct:              id          => client.get(`/api/products/${id}`),
  createProduct:           d           => client.post('/api/products', d),
  updateProduct:           (id, d)     => client.put(`/api/products/${id}`, d),
  deactivateProduct:       id          => client.delete(`/api/products/${id}`),
  activateProduct:         id          => client.patch(`/api/products/${id}/activate`),
  uploadProductImage:      (id, file)  => {
    const fd = new FormData(); fd.append('file', file)
    return client.post(`/api/products/${id}/image`, fd)
  },
  getBarcode:              (id, type)  => client.get(`/api/products/${id}/barcode?type=${type || 'CODE128'}`),
  getQrCode:               id          => client.get(`/api/products/${id}/barcode?type=QR`),
  importProductsCsv:       file        => { const fd = new FormData(); fd.append('file', file); return client.post('/api/products/import', fd) },
  exportProductsCsv:       ()          => client.get('/api/products/export', { responseType: 'blob' }),
  getVariants:             id          => client.get(`/api/products/${id}/variants`),
  createVariant:           (id, d)     => client.post(`/api/products/${id}/variants`, d),
  updateVariant:           (id, vid, d)=> client.put(`/api/products/${id}/variants/${vid}`, d),
  toggleVariant:           (id, vid)   => client.patch(`/api/products/${id}/variants/${vid}/toggle`),
  getLocations:            ()          => client.get('/api/locations'),
  createLocation:          d           => client.post('/api/locations', d),
  updateLocation:          (id, d)     => client.put(`/api/locations/${id}`, d),
  getAllLevels:             ()          => client.get('/api/stock/levels'),
  getLowStock:             ()          => client.get('/api/stock/levels/low-stock'),
  getOutOfStock:           ()          => client.get('/api/stock/levels/out-of-stock'),
  getOverstock:            ()          => client.get('/api/stock/levels/overstock'),
  updateThresholds:        d           => client.patch('/api/stock/levels/thresholds', d),
  recordMovement:          d           => client.post('/api/stock/movement', d),
  getRecentMovements:      ()          => client.get('/api/stock/movement/recent'),
  getMovementsByProduct:   id          => client.get(`/api/stock/movement/product/${id}`),
  getDemandForecast:       id          => client.get(`/api/stock/forecast/${id}`),
  createReservation:       d           => client.post('/api/stock/reservations', d),
  releaseReservation:      id          => client.patch(`/api/stock/reservations/${id}/release`),
  fulfillReservation:      id          => client.patch(`/api/stock/reservations/${id}/fulfill`),
  getReservations:         ()          => client.get('/api/stock/reservations'),
  getReservationsByProduct:id          => client.get(`/api/stock/reservations/product/${id}`),
  getUomConversions:       ()          => client.get('/api/stock/uom'),
  createUomConversion:     d           => client.post('/api/stock/uom', d),
  updateUomConversion:     (id, d)     => client.put(`/api/stock/uom/${id}`, d),
  deleteUomConversion:     id          => client.delete(`/api/stock/uom/${id}`),
  convertUom:              (from, to, qty) => client.get(`/api/stock/uom/convert?from=${from}&to=${to}&qty=${qty}`),
  createBatchLot:          d           => client.post('/api/batch-lots', d),
  getBatchLotsByProduct:   id          => client.get(`/api/batch-lots/product/${id}`),
  getExpiringSoon:         days        => client.get(`/api/batch-lots/expiring-soon?days=${days}`),
  getExpired:              ()          => client.get('/api/batch-lots/expired'),
  initiateCycleCount:      d           => client.post('/api/cycle-counts/initiate', d),
  submitCycleCount:        (id, d)     => client.patch(`/api/cycle-counts/${id}/submit`, d),
  reconcileCycleCount:     id          => client.patch(`/api/cycle-counts/${id}/reconcile`),
  getPendingCounts:        ()          => client.get('/api/cycle-counts/pending'),
  getDiscrepancies:        ()          => client.get('/api/cycle-counts/discrepancies'),
}

// ── Reporting ─────────────────────────────────────────────────────────────
export const reportingApi = {
  getValuation:    ()         => client.get('/api/reports/valuation'),
  exportValuation: ()         => client.get('/api/reports/valuation/export', { responseType: 'blob' }),
  getMovements:    (from, to) => client.get('/api/reports/movements', { params: { from, to } }),
  getTrend:        days       => client.get(`/api/reports/trend?days=${days}`),
}

// ── Supplier ──────────────────────────────────────────────────────────────
export const supplierApi = {
  getSuppliers:      ()       => client.get('/api/suppliers'),
  createSupplier:    d        => client.post('/api/suppliers', d),
  updateSupplier:    (id, d)  => client.put(`/api/suppliers/${id}`, d),
  toggleSupplier:    id       => client.patch(`/api/suppliers/${id}/toggle`),
  getPurchaseOrders: status   => client.get('/api/purchase-orders', { params: { status } }),
  createPo:          d        => client.post('/api/purchase-orders', d),
  updatePoStatus:    (id, st) => client.patch(`/api/purchase-orders/${id}/status`, { status: st }),
  getGrns:           poId     => client.get(`/api/purchase-orders/${poId}/grn`),
  receiveGoods:      (poId,d) => client.post(`/api/purchase-orders/${poId}/grn`, d),
}

// ── Notifications ─────────────────────────────────────────────────────────
export const notificationApi = {
  getLogs:   () => client.get('/api/notifications/logs'),
  getFailed: () => client.get('/api/notifications/logs/failed'),
}
