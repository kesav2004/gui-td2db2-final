
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './carbon-styles.css' // Import Carbon Design System styles

// Import Carbon styles directly
import '@carbon/styles/css/styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
