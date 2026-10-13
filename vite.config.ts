import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
export default defineConfig({
  base: "./",
  plugins: [react(), tailwind()],
  test: { include: ["tests/**/*.test.ts"] },
  server: { port: 5173 },
  worker: { format: "es" },
});
