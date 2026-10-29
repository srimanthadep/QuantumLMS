import React from "react"
import ReactDOM from "react-dom/client"
import { MotionConfig } from "framer-motion"
import "@fontsource-variable/inter"
import App from "./App"
import ThemeProvider from "./app/ThemeProvider"
import { duration, ease } from "./lib/motion"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <MotionConfig reducedMotion="user" transition={{ duration: duration.base, ease: ease.out }}>
        <App />
      </MotionConfig>
    </ThemeProvider>
  </React.StrictMode>,
)
