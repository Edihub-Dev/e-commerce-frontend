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
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (id.includes("react-dom") || id.includes("react")) return "react";
          if (
            id.includes("framer-motion") ||
            id.includes("swiper") ||
            id.includes("react-icons")
          ) {
            return "ui";
          }
          if (id.includes("@tanstack/react-query")) return "react-query";
          if (id.includes("xlsx")) return "xlsx";
          if (id.includes("axios")) return "axios";
          if (id.includes("date-fns") || id.includes("lodash.debounce")) {
            return "utils";
          }

          return "vendor";
        },
      },
    },
  },

  publicDir: "public",
});
