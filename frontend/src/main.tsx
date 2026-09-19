import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// Con skipWaiting+clientsClaim, cuando hay una nueva versión del build,
// el service worker se actualiza solo y recarga la app automáticamente
// (evita el "debo reiniciar la pestaña para que abra").
registerSW({ immediate: true, onNeedRefresh() { window.location.reload(); } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
