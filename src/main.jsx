import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { registerServiceWorker } from "./registerServiceWorker";

Array.from(document.body.childNodes).forEach((node) => {
  const text = node.textContent?.trim();

  if (
    node.nodeType === Node.TEXT_NODE &&
    (text === "<" || text === "/>" || text === "</>")
  ) {
    node.remove();
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

registerServiceWorker();