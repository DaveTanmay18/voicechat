import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@livekit/components-styles'
import './index.css'
import App from './App.tsx'

const style = document.createElement('style')
style.textContent = `
  .lk-participant-tile[data-lk-speaking="true"] {
    outline: 2px solid #1D9E75 !important;
    box-shadow: 0 0 12px rgba(29,158,117,0.4) !important;
  }
`
document.head.appendChild(style)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)