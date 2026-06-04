import React from 'react'
import ReactDOM from 'react-dom/client'

// Standalone entry point — only used when running this MFE directly (npm run dev)
// When loaded via Module Federation by the shell, this file is not executed
const root = document.getElementById('root')
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <div style={{ padding: 20, fontFamily: 'Inter, sans-serif' }}>
        <h2>supplier-mfe — running standalone</h2>
        <p>This MFE is designed to be consumed by the shell via Module Federation.</p>
      </div>
    </React.StrictMode>
  )
}
