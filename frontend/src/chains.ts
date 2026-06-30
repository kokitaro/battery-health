import { defineChain } from "viem";

// GenLayer Testnet Bradbury. Values come from the committed .env (see
// .env.example); the fallbacks keep the deployment fixed if a build runs
// without an env file.
export const RPC_URL: string = import.meta.env.VITE_RPC_URL ?? "https://rpc-bradbury.genlayer.com";
export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID ?? 4221);

// viem chain used by wagmi + RainbowKit (connect / switch-network UI).
export const bradbury = defineChain({
  id: CHAIN_ID,
  name: "GenLayer Bradbury Testnet",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
  testnet: true,
});
