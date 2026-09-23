import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, path.resolve(__dirname, "../../"), "");

  const apiBaseUrl = process.env.VITE_API_BASE_URL ?? rootEnv.VITE_API_BASE_URL ?? "";

  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(apiBaseUrl)
    },
    server: {
      host: "0.0.0.0",
      port: Number(rootEnv.WEB_PORT ?? 5176),
      strictPort: true,
      proxy: rootEnv.VITE_API_BASE_URL
        ? {
            "/api": {
              target: rootEnv.VITE_API_BASE_URL,
              changeOrigin: true
            }
          }
        : undefined
    }
  };
});
