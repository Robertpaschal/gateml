import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward /api/* → backend during local dev
      "/api": {
        target: "http://localhost:3001",
        rewrite: path => path.replace(/^\/api/, ""),
        changeOrigin: true,
      },
    },
  },
});
