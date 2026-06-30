import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { bradbury } from "./chains";

// WalletConnect projectId. A literal placeholder is fine — injected wallets
// (MetaMask, Rabby, …) still connect without a real WalletConnect project.
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "GENLAYER_LOCAL";

export const wagmiConfig = getDefaultConfig({
  appName: "BioCell",
  projectId,
  chains: [bradbury],
  ssr: false,
});
