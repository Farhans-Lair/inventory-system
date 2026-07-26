import React from 'react'
import ReactDOM from 'react-dom/client'

const root = document.getElementById('root')
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <div style={{ padding: 20, fontFamily: 'Inter, sans-serif' }}>
        <h2>stock-mfe — running standalone</h2>
        <p>This MFE is designed to be consumed by the shell via Module Federation.</p>
      </div>
    </React.StrictMode>
  )
}
