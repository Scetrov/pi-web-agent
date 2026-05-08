import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildProxy() {
  const host = process.env.PI_WEB_HOST?.trim() || "127.0.0.1";
  const port = process.env.PI_WEB_PORT?.trim() || "4317";
  return `http://${host}:${port}`;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: readPositiveInt(process.env.PI_WEB_PORT, 5173),
    proxy: {
      "/health": buildProxy(),
      "/api": buildProxy(),
    },
  },
});
