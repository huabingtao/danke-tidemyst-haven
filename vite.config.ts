import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
export default defineConfig({
  base: "./",
  plugins: [react(), tailwind()],
  test: { include: ["tests/**/*.test.ts"] },
  server: {
    port: 5173,
    watch: {
      ignored: [
        "**/.impeccable/**",
        "**/docs/**",
        "**/*.md",
        "**/test-results/**",
        "**/playwright-report/**",
      ],
    },
    proxy: {
      "/api/battle-images": {
        target: "http://127.0.0.1:3009",
        changeOrigin: false,
      },
      "/api/stats": { target: "http://127.0.0.1:3009", changeOrigin: false },
    },
  },
  worker: { format: "es" },
});
