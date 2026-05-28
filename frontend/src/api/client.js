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
      const rt = sessionStorage.getItem('refreshToken')
      if (rt && !err.config._retry) {
        err.config._retry = true
        return client.post('/api/auth/refresh', { refreshToken: rt }).then(res => {
          const { accessToken, refreshToken } = res.data
          sessionStorage.setItem('token', accessToken)
          sessionStorage.setItem('refreshToken', refreshToken)
          err.config.headers.Authorization = `Bearer ${accessToken}`
          return client(err.config)
        }).catch(() => { sessionStorage.clear(); window.location.href = '/login' })
      }
      sessionStorage.clear(); window.location.href = '/login'
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
  refresh:          d  => client.post('/api/auth/refresh', d),
  logout:           () => client.post('/api/auth/logout'),
  getUsers:         () => client.get('/api/users'),
  createUser:       d  => client.post('/api/users', d),
  toggleActive:     id => client.patch(`/api/users/${id}/toggle-active`),
}

// ── Inventory ─────────────────────────────────────────────────────────────
export const inventoryApi = {
  // Dashboard
  getSummary:              ()          => client.get('/api/stock/summary'),

  // Products
  getProducts:             ()          => client.get('/api/products'),
  getProduct:              id          => client.get(`/api/products/${id}`),
  createProduct:           d           => client.post('/api/products', d),
  updateProduct:           (id, d)     => client.put(`/api/products/${id}`, d),
  deactivateProduct:       id          => client.delete(`/api/products/${id}`),
  activateProduct:         id          => client.patch(`/api/products/${id}/activate`),

  // A1: Image upload
  uploadProductImage:      (id, file)  => {
    const fd = new FormData(); fd.append('file', file)
    return client.post(`/api/products/${id}/image`, fd)
  },

  // A2: Barcode/QR
  getBarcode:              (id, type)  => client.get(`/api/products/${id}/barcode?type=${type || 'CODE128'}`),
  getQrCode:               id          => client.get(`/api/products/${id}/barcode?type=QR`),

  // A3: CSV
  importProductsCsv:       file        => { const fd = new FormData(); fd.append('file', file); return client.post('/api/products/import', fd) },
  exportProductsCsv:       ()          => client.get('/api/products/export', { responseType: 'blob' }),

  // A5: Variants
  getVariants:             id          => client.get(`/api/products/${id}/variants`),
  createVariant:           (id, d)     => client.post(`/api/products/${id}/variants`, d),
  updateVariant:           (id, vid, d)=> client.put(`/api/products/${id}/variants/${vid}`, d),
  toggleVariant:           (id, vid)   => client.patch(`/api/products/${id}/variants/${vid}/toggle`),

  // Locations
  getLocations:            ()          => client.get('/api/locations'),
  createLocation:          d           => client.post('/api/locations', d),
  updateLocation:          (id, d)     => client.put(`/api/locations/${id}`, d),

  // Stock levels
  getAllLevels:             ()          => client.get('/api/stock/levels'),
  getLowStock:             ()          => client.get('/api/stock/levels/low-stock'),
  getOutOfStock:           ()          => client.get('/api/stock/levels/out-of-stock'),
  getOverstock:            ()          => client.get('/api/stock/levels/overstock'),
  updateThresholds:        d           => client.patch('/api/stock/levels/thresholds', d),

  // B5: Movements with reason codes
  recordMovement:          d           => client.post('/api/stock/movement', d),
  getRecentMovements:      ()          => client.get('/api/stock/movement/recent'),
  getMovementsByProduct:   id          => client.get(`/api/stock/movement/product/${id}`),

  // B6: Demand forecast
  getDemandForecast:       id          => client.get(`/api/stock/forecast/${id}`),

  // B1: Reservations
  createReservation:       d           => client.post('/api/stock/reservations', d),
  releaseReservation:      id          => client.patch(`/api/stock/reservations/${id}/release`),
  fulfillReservation:      id          => client.patch(`/api/stock/reservations/${id}/fulfill`),
  getReservations:         ()          => client.get('/api/stock/reservations'),
  getReservationsByProduct:id          => client.get(`/api/stock/reservations/product/${id}`),

  // B4: UoM conversions
  getUomConversions:       ()          => client.get('/api/stock/uom'),
  createUomConversion:     d           => client.post('/api/stock/uom', d),
  updateUomConversion:     (id, d)     => client.put(`/api/stock/uom/${id}`, d),
  deleteUomConversion:     id          => client.delete(`/api/stock/uom/${id}`),
  convertUom:              (from, to, qty) => client.get(`/api/stock/uom/convert?from=${from}&to=${to}&qty=${qty}`),

  // A4/B3: Batch lots & cycle counts
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
  getValuation:    ()          => client.get('/api/reports/valuation'),
  exportValuation: ()          => client.get('/api/reports/valuation/export', { responseType: 'blob' }),
  getMovements:    (from, to)  => client.get('/api/reports/movements', { params: { from, to } }),
  getTrend:        days        => client.get(`/api/reports/trend?days=${days}`),
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
