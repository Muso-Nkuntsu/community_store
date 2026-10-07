import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The backend (Next.js) runs on http://localhost:3000. Change BACKEND if yours runs elsewhere.
const BACKEND = process.env.BACKEND_URL || "http://localhost:3000";

// The frontend calls same-origin URLs (fetch("/api/...")) so the cs_session cookie works.
// In development this proxy forwards those requests to the backend.
//
// The backend blocks POST/PATCH/DELETE requests whose Origin header does not match its own
// host (assertSameOrigin in lib/api.ts). The browser sends Origin: http://localhost:5173,
// so the proxy rewrites Host and Origin to the backend's address. Without this, login,
// register and every other change fails with 403 "Cross-site request blocked."
const toBackend = {
  target: BACKEND,
  changeOrigin: true,
  headers: { origin: BACKEND },
};

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": toBackend, // all API routes, including uploaded images at /api/uploads/<name>
    },
  },
});
