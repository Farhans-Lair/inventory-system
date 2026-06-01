import React from 'react'
import ReactDOM from 'react-dom/client'
// This entry is only used when running the MFE standalone (npm run dev).
// When loaded via Module Federation by the shell, the shell provides
// React, ReactDOM, and routing context.
const App = React.lazy(() => import('./bootstrap'))
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <React.Suspense fallback={<div>Loading…</div>}>
      <App />
    </React.Suspense>
  </React.StrictMode>
)
