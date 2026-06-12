import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "highlight.js/styles/base16/tomorrow-night.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
