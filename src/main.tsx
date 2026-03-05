import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AppDemo from './AppDemo.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppDemo />
  </StrictMode>,
)
