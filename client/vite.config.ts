import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The client proxies all /api calls to the Node gateway during dev, so the
// browser only ever talks to one origin and there are no CORS surprises.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
