import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-3)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            fontFamily: 'var(--font)',
            fontSize: '13.5px',
          },
          success: { iconTheme: { primary: 'var(--green)', secondary: 'var(--bg-3)' } },
          error: { iconTheme: { primary: 'var(--red)', secondary: 'var(--bg-3)' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
