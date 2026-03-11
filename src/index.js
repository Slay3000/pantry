import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import reportWebVitals from './reportWebVitals'
import { HashRouter } from 'react-router-dom'

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
    <React.StrictMode>
        <HashRouter>
            <App />
        </HashRouter>
    </React.StrictMode>,
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const swPath = `${process.env.PUBLIC_URL}/service-worker.js`
        console.log('Registering SW at:', swPath)

        navigator.serviceWorker
            .register(swPath, { scope: process.env.PUBLIC_URL + '/' })
            .then(() => console.log('Service worker registered'))
            .catch((err) => console.error('SW registration failed:', err))
    })
}
reportWebVitals()
