import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number(env.FRONTEND_PORT);

  if (command === "serve" && (!env.FRONTEND_HOST || !Number.isInteger(port) || port < 1 || port > 65535)) {
    throw new Error("Set FRONTEND_HOST and a valid FRONTEND_PORT in .env");
  }

  return {
    plugins: [react(), tailwindcss()],
    server: command === "serve" ? {
      host: env.FRONTEND_HOST,
      port,
      strictPort: true,
    } : undefined,
    preview: command === "serve" ? {
      host: env.FRONTEND_HOST,
      port,
      strictPort: true,
    } : undefined,
  };
});
