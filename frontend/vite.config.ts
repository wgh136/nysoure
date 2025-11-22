import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        // target: "http://localhost:3000",
        target: "https://nysoure.com",
        changeOrigin: true,
      },
      "https://www.moyu.moe": {
        target: "https://www.moyu.moe",
        changeOrigin: true,
      },
    },
  },
});
