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
    chunkSizeWarningLimit: 2000, // Allow up to 2MB chunks before warning
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          const chunkMatchMap = [
            { match: "node_modules/react-dom", name: "react" },
            { match: "node_modules/react", name: "react" },
            {
              match: "node_modules/@tanstack/react-query",
              name: "react-query",
            },
            { match: "node_modules/framer-motion", name: "framer-motion" },
            { match: "node_modules/swiper", name: "swiper" },
            { match: "node_modules/xlsx", name: "xlsx" },
            { match: "node_modules/date-fns", name: "date-fns" },
            { match: "node_modules/lucide-react", name: "lucide-react" },
            { match: "node_modules/axios", name: "axios" },
            { match: "node_modules/lodash", name: "lodash" },
          ];

          const found = chunkMatchMap.find(({ match }) => id.includes(match));
          if (found) {
            return found.name;
          }

          return "vendor";
        },
      },
    },
  },
  publicDir: "public",
});
