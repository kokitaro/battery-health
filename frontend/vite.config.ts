import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Peel the large *static* libraries into their own chunks so no single chunk
// crosses Vite's 500 kB warning threshold. RainbowKit / WalletConnect / Reown
// keep their built-in per-wallet, per-locale dynamic splitting, so they are
// deliberately left ungrouped; the MetaMask SDK transport stack ships as one
// large static module, so it is peeled into a dedicated walletsdk chunk.
export default defineConfig({
  base: "./",
  cacheDir: ".vite_cache",
  plugins: [react()],
  server: { port: 5380 },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("/react-dom/") || id.includes("/scheduler/")) return "react-dom";
          if (id.includes("/react/")) return "react";
          if (id.includes("/genlayer-js/")) return "genlayer";
          if (
            id.includes("/viem/") ||
            id.includes("/abitype/") ||
            id.includes("/ox/") ||
            id.includes("/@noble/") ||
            id.includes("/@scure/") ||
            id.includes("/@adraffy/")
          ) {
            return "crypto";
          }
          if (
            id.includes("/@metamask/sdk/") ||
            id.includes("/@metamask/sdk-communication-layer/") ||
            id.includes("/socket.io-client/") ||
            id.includes("/engine.io-client/") ||
            id.includes("/eciesjs/") ||
            id.includes("/cross-fetch/")
          ) {
            return "walletsdk";
          }
          if (id.includes("/wagmi/") || id.includes("/@wagmi/")) return "wagmi";
          if (id.includes("/@tanstack/")) return "tanstack";
          if (
            id.includes("/three/") ||
            id.includes("/three-stdlib/") ||
            id.includes("/@react-three/")
          ) {
            return "three";
          }
          if (id.includes("/d3/") || id.includes("/d3-")) return "d3";
          if (id.includes("/gsap/")) return "gsap";
        },
      },
    },
  },
});
