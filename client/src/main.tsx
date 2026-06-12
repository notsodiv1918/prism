import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "highlight.js/styles/base16/tomorrow-night.css";
import "./index.css";

// Apply the saved theme before first paint to avoid a flash.
try {
  document.documentElement.dataset.theme =
    localStorage.getItem("prism.theme") === "dark" ? "dark" : "light";
} catch {
  document.documentElement.dataset.theme = "light";
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
