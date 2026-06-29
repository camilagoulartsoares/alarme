import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const DEV_PORT = 5180;

export default defineConfig({
  plugins: [react()],
  server: {
    port: DEV_PORT,
    strictPort: true,
  },
  build: {
    outDir: "dist",
  },
});
