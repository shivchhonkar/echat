import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  /** Backend process (internal); browser uses same-origin via proxy on :6001 */
  const backendTarget = env.VITE_DEV_API_TARGET || "http://localhost:6100";

  const devProxy = {
    "/api": { target: backendTarget, changeOrigin: true },
    "/uploads": { target: backendTarget, changeOrigin: true },
    "/health": { target: backendTarget, changeOrigin: true },
    "/socket.io": { target: backendTarget, ws: true, changeOrigin: true },
  };

  return {
    plugins: [react()],
    server: {
      port: 6001,
      strictPort: true,
      allowedHosts: ["care.shribi.com"],
      proxy: devProxy,
    },
    preview: {
      port: 6001,
      strictPort: true,
      proxy: devProxy,
    },
  };
});
