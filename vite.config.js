import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
    host: true,
    // Render's web service passes PORT env var; allow all hosts for the preview server
    allowedHosts: true,
  },
});
