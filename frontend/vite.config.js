import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The API contract uses same-origin requests (fetch("/api/...")) so the session cookie works.
// In development, this proxy forwards /api to the backend running on port 3000.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});