// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   root: './',
//   build: {
//     outDir: 'dist',
//   },
//   publicDir: 'public'
// })
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "./",
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1500, // Increase limit to 1.5MB
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
