import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@ng/witnesses": path.resolve(root, "../src/witnesses.ts"),
      "@ng/contract": path.resolve(
        root,
        "../contracts/managed/night-gate/contract/index.js",
      ),
      buffer: "buffer",
    },
  },
  optimizeDeps: {
    include: ["buffer"],
    esbuildOptions: {
      target: "esnext",
    },
  },
  build: {
    target: "esnext",
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  server: {
    port: 5173,
    fs: {
      allow: [path.resolve(root, "..")],
    },
  },
  define: {
    global: "globalThis",
  },
});
