import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

const midnightLedger = path.resolve(
  root,
  "node_modules/@midnight-ntwrk/ledger-v8",
);
const midnightOnchain = path.resolve(
  root,
  "node_modules/@midnight-ntwrk/onchain-runtime-v3",
);
const midnightCompactRuntime = path.resolve(
  root,
  "node_modules/@midnight-ntwrk/compact-runtime",
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: [
      "@midnight-ntwrk/ledger-v8",
      "@midnight-ntwrk/onchain-runtime-v3",
      "@midnight-ntwrk/compact-runtime",
    ],
    alias: {
      "@ng/witnesses": path.resolve(root, "../src/witnesses.ts"),
      "@ng/contract": path.resolve(
        root,
        "../contracts/managed/night-gate/contract/index.js",
      ),
      buffer: "buffer",
      "@midnight-ntwrk/ledger-v8": midnightLedger,
      "@midnight-ntwrk/onchain-runtime-v3": midnightOnchain,
      "@midnight-ntwrk/compact-runtime": midnightCompactRuntime,
      // Vite 8 externalizes Node built-ins; level/abstract-level needs EventEmitter.
      events: path.resolve(root, "node_modules/events/events.js"),
      assert: path.resolve(root, "node_modules/assert/build/assert.js"),
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
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "midnight-ledger",
              test: /node_modules[\\/]@midnight-ntwrk[\\/](ledger-v8|onchain-runtime-v3|compact-runtime)/,
            },
          ],
        },
      },
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
