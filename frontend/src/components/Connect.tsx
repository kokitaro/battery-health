import { ConnectButton } from "@rainbow-me/rainbowkit";
import styles from "./Connect.module.css";

// Standard RainbowKit connect button, themed via the [data-rk] overrides in
// tokens.css. Shows the connected address as a pill and a switch-network
// prompt when the wallet is on the wrong chain.
export function Connect() {
  return (
    <div className={styles.wrap}>
      <ConnectButton
        showBalance={false}
        accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
        chainStatus={{ smallScreen: "icon", largeScreen: "full" }}
      />
    </div>
  );
}
