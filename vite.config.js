import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "./",

  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          vendor: [
            "axios",
            "lodash.debounce",
            "date-fns",
            "swiper",
            "xlsx",
            "@tanstack/react-query",
            "framer-motion",
          ],
        },
      },
    },
  },

  publicDir: "public",
});
