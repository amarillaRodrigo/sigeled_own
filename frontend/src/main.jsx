import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ToastProvider } from './components/ToastProvider.jsx';
import { ConfirmProvider } from './components/ConfirmProvider.jsx';
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </ToastProvider>
  </StrictMode>,
)
