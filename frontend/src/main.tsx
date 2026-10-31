import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { MotionConfig } from "framer-motion"
import App from "./App"
import ThemeProvider from "./app/ThemeProvider"
import SessionProvider from "./app/session"
import ToastProvider from "./components/ui/toast"
import { NotificationProvider } from "./context/NotificationContext"
import { duration, ease } from "./lib/motion"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <MotionConfig reducedMotion="user" transition={{ duration: duration.base, ease: ease.out }}>
          <SessionProvider>
            <ToastProvider>
              <NotificationProvider>
                <App />
              </NotificationProvider>
            </ToastProvider>
          </SessionProvider>
        </MotionConfig>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
