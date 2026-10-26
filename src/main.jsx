import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initAppTheme } from '@/lib/appTheme'

// Оформление (тёмное или светлое) применяется до первой отрисовки — без «мигания»
initAppTheme();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)