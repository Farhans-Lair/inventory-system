import axios from 'axios'

const client = axios.create({ baseURL: '/' })

client.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

client.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      // Try refresh before redirecting
      const rt = sessionStorage.getItem('refreshToken')
      if (rt && !err.config._retry) {
        err.config._retry = true
        return client.post('/api/auth/refresh', { refreshToken: rt }).then(res => {
          const { accessToken, refreshToken } = res.data
          sessionStorage.setItem('token', accessToken)
          sessionStorage.setItem('refreshToken', refreshToken)
          err.config.headers.Authorization = `Bearer ${accessToken}`
          return client(err.config)
        }).catch(() => {
          sessionStorage.clear()
          window.location.href = '/login'
        })
      }
      sessionStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  initiateSignup:   data => client.post('/api/auth/signup', data),
  verifySignup:     data => client.post('/api/auth/verify-signup', data),
  initiateLogin:    data => client.post('/api/auth/login', data),
  verifyLogin:      data => client.post('/api/auth/verify-login', data),
  forgotPassword:   data => client.post('/api/auth/forgot-password', data),
  resetPassword:    data => client.post('/api/auth/reset-password', data),
  refresh:          data => client.post('/api/auth/refresh', data),
  logout:           ()   => client.post('/api/auth/logout'),
  getUsers:         ()   => client.get('/api/users'),
  createUser:       data => client.post('/api/users', data),
  toggleActive:     id   => client.patch(`/api/users/${id}/toggle-active`),
}

// ── Inventory ─────────────────────────────────────────────────────────────
export const inventoryApi = {
  // Dashboard
  getSummary:            ()       => client.get('/api/stock/summary'),
  // Products
  getProducts:           ()       => client.get('/api/products'),
  getProduct:            id       => client.get(`/api/products/${id}`),
  createProduct:         d        => client.post('/api/products', d),
  updateProduct:         (id, d)  => client.put(`/api/products/${id}`, d),
  deactivateProduct:     id       => client.delete(`/api/products/${id}`),
  activateProduct:       id       => client.patch(`/api/products/${id}/activate`),
  importProductsCsv:     file     => { const fd = new FormData(); fd.append('file', file); return client.post('/api/products/import', fd) },
  exportProductsCsv:     ()       => client.get('/api/products/export', { responseType: 'blob' }),
  // Locations
  getLocations:          ()       => client.get('/api/locations'),
  createLocation:        d        => client.post('/api/locations', d),
  updateLocation:        (id, d)  => client.put(`/api/locations/${id}`, d),
  // Stock levels
  getAllLevels:           ()       => client.get('/api/stock/levels'),
  getLowStock:           ()       => client.get('/api/stock/levels/low-stock'),
  getOutOfStock:         ()       => client.get('/api/stock/levels/out-of-stock'),
  getOverstock:          ()       => client.get('/api/stock/levels/overstock'),
  updateThresholds:      d        => client.patch('/api/stock/levels/thresholds', d),
  // Movements
  recordMovement:        d        => client.post('/api/stock/movement', d),
  getRecentMovements:    ()       => client.get('/api/stock/movement/recent'),
  getMovementsByProduct: id       => client.get(`/api/stock/movement/product/${id}`),
  // Forecast
  getDemandForecast:     id       => client.get(`/api/stock/forecast/${id}`),
  // Reservations
  createReservation:     d        => client.post('/api/stock/reservations', d),
  releaseReservation:    id       => client.patch(`/api/stock/reservations/${id}/release`),
  getReservations:       ()       => client.get('/api/stock/reservations'),
  // Batch lots
  createBatchLot:        d        => client.post('/api/batch-lots', d),
  getBatchLotsByProduct: id       => client.get(`/api/batch-lots/product/${id}`),
  getExpiringSoon:       days     => client.get(`/api/batch-lots/expiring-soon?days=${days}`),
  getExpired:            ()       => client.get('/api/batch-lots/expired'),
  // Cycle counts
  initiateCycleCount:    d        => client.post('/api/cycle-counts/initiate', d),
  submitCycleCount:      (id, d)  => client.patch(`/api/cycle-counts/${id}/submit`, d),
  reconcileCycleCount:   id       => client.patch(`/api/cycle-counts/${id}/reconcile`),
  getPendingCounts:      ()       => client.get('/api/cycle-counts/pending'),
  getDiscrepancies:      ()       => client.get('/api/cycle-counts/discrepancies'),
}

// ── Reporting ─────────────────────────────────────────────────────────────
export const reportingApi = {
  getValuation:       ()           => client.get('/api/reports/valuation'),
  exportValuation:    ()           => client.get('/api/reports/valuation/export', { responseType: 'blob' }),
  getMovements:       (from, to)   => client.get('/api/reports/movements', { params: { from, to } }),
  getTrend:           days         => client.get(`/api/reports/trend?days=${days}`),
}

// ── Supplier ──────────────────────────────────────────────────────────────
export const supplierApi = {
  getSuppliers:       ()       => client.get('/api/suppliers'),
  createSupplier:     d        => client.post('/api/suppliers', d),
  updateSupplier:     (id, d)  => client.put(`/api/suppliers/${id}`, d),
  toggleSupplier:     id       => client.patch(`/api/suppliers/${id}/toggle`),
  getPurchaseOrders:  status   => client.get('/api/purchase-orders', { params: { status } }),
  createPo:           d        => client.post('/api/purchase-orders', d),
  updatePoStatus:     (id, st) => client.patch(`/api/purchase-orders/${id}/status`, { status: st }),
  getGrns:            poId     => client.get(`/api/purchase-orders/${poId}/grn`),
  receiveGoods:       (poId,d) => client.post(`/api/purchase-orders/${poId}/grn`, d),
}

// ── Notifications ─────────────────────────────────────────────────────────
export const notificationApi = {
  getLogs:   () => client.get('/api/notifications/logs'),
  getFailed: () => client.get('/api/notifications/logs/failed'),
}
