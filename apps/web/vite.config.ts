import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const solverApiUrl = process.env.VITE_SOLVER_API_URL ?? process.env.VITE_API_BASE_URL;

if (process.env.VERCEL && solverApiUrl) {
  let parsedSolverApiUrl: URL;
  try {
    parsedSolverApiUrl = new URL(solverApiUrl);
  } catch {
    throw new Error("VITE_SOLVER_API_URL must be a valid absolute URL.");
  }

  if (parsedSolverApiUrl.protocol !== "https:") {
    throw new Error("VITE_SOLVER_API_URL must use HTTPS for Vercel deployments.");
  }
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/health": "http://127.0.0.1:8000",
      "/v1": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
