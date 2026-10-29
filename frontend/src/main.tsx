import React from "react"
import ReactDOM from "react-dom/client"
import "@fontsource-variable/inter"
import App from "./App"
import ThemeProvider from "./app/ThemeProvider"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
