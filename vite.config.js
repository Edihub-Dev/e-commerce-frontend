import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const emotionIsPropValidPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "node_modules/@emotion/is-prop-valid/dist/emotion-is-prop-valid.esm.js"
);

export default defineConfig({
  plugins: [react()],
  root: "./",

  resolve: {
    alias: {
      "@emotion/is-prop-valid": emotionIsPropValidPath,
    },
  },

  optimizeDeps: {
    include: ["@emotion/is-prop-valid"],
  },

  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 2500,
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
