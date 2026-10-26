import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initAppStyle } from '@/lib/appStyles'

// Оформление (стиль) применяется до первой отрисовки — без «мигания»
initAppStyle();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)