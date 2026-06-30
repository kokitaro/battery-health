import { useEffect, useRef, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import VanillaTilt from "vanilla-tilt";
import type { Eip1193Provider, Hex, WalletCtx } from "../contract";
import {
  postTelemetry,
  recomputeScore,
  registerPack,
  registerOracle,
  triggerSlash,
  topUpBond,
  withdrawBond,
  payOracle,
  setPackThreshold,
} from "../contract";
import { CHAIN_ID } from "../chains";
import styles from "./Actions.module.css";

interface Props {
  activePackId: string;
  onActivePack: (id: string) => void;
  onDone: (note: string) => void; // refresh + toast
}

type TiltEl = HTMLDivElement & { vanillaTilt?: { destroy: () => void } };

function useTilt() {
  const ref = useRef<TiltEl>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    VanillaTilt.init(el, { max: 3, speed: 400, glare: true, "max-glare": 0.1, scale: 1.005 });
    return () => el.vanillaTilt?.destroy();
  }, []);
  return ref;
}

export function Actions({ activePackId, onActivePack, onDone }: Props) {
  const tilt = useTilt();
  const { address, connector, isConnected, chainId } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();

  const wrongChain = isConnected && chainId !== CHAIN_ID;
  const ready = isConnected && !!address && !wrongChain;

  // register
  const [packId, setPackId] = useState("");
  const [vin, setVin] = useState("");
  const [manifest, setManifest] = useState(
    "https://jsonblob.com/api/jsonBlob/019ef47c-4052-745e-a607-0db6faff8dab",
  );
  const [threshold, setThreshold] = useState("60");
  const [bond, setBond] = useState("1000");

  // telemetry
  const [blob, setBlob] = useState("");
  const [oracleId, setOracleId] = useState("oracle-001");

  // bond ops
  const [topUp, setTopUp] = useState("500");
  const [withdraw, setWithdraw] = useState("100");

  // governance
  const [newThreshold, setNewThreshold] = useState("60");

  // oracle ops
  const [licenseHint, setLicenseHint] = useState("ISO-IEC-62660");
  const [payAddr, setPayAddr] = useState("");

  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function walletCtx(): Promise<WalletCtx | null> {
    if (!isConnected || !address || !connector) return null;
    const provider = (await connector.getProvider()) as Eip1193Provider;
    return { provider, address: address as Hex };
  }

  async function run(label: string, fn: (ctx: WalletCtx) => Promise<string>, after?: () => void) {
    if (!isConnected || !address) return setErr("Connect a wallet to sign writes.");
    if (wrongChain) return setErr(`Wrong network — switch to GenLayer Bradbury (${CHAIN_ID}).`);
    const ctx = await walletCtx();
    if (!ctx) return setErr("Wallet provider unavailable. Reconnect and try again.");
    setBusy(label);
    setErr("");
    try {
      const hash = await fn(ctx);
      after?.();
      onDone(`${label} ok · tx ${hash.slice(0, 10)}…`);
    } catch (e) {
      const msg = String((e as Error).message || e);
      setErr(msg.slice(0, 240));
    } finally {
      setBusy(null);
    }
  }

  const activeOr = () => activePackId || packId.trim();

  function onRegister() {
    const id = packId.trim();
    if (id.length < 2) return setErr("Pack id needs at least 2 characters.");
    const th = Math.max(0, Math.min(100, Number(threshold) || 0));
    const bo = BigInt(Math.max(1, Math.floor(Number(bond) || 1)));
    run("register_pack", (ctx) => registerPack(ctx, id, vin.trim() || "vin-unknown", manifest.trim(), th, bo), () =>
      onActivePack(id),
    );
  }

  function onTelemetry() {
    const id = activeOr();
    if (!id) return setErr("Set an active pack id first.");
    if (blob.trim().length < 64) return setErr("Telemetry blob needs 64+ characters (contract minimum).");
    run("post_telemetry", (ctx) => postTelemetry(ctx, id, blob.trim(), oracleId.trim() || "oracle-001"), () => setBlob(""));
  }

  function onRecompute() {
    const id = activeOr();
    if (!id) return setErr("Set an active pack id first.");
    run("recompute_score", (ctx) => recomputeScore(ctx, id));
  }

  function onTopUp() {
    const id = activeOr();
    if (!id) return setErr("Set an active pack id first.");
    const v = BigInt(Math.max(1, Math.floor(Number(topUp) || 1)));
    run("top_up_bond", (ctx) => topUpBond(ctx, id, v));
  }

  function onWithdraw() {
    const id = activeOr();
    if (!id) return setErr("Set an active pack id first.");
    const a = BigInt(Math.max(1, Math.floor(Number(withdraw) || 1)));
    run("withdraw_bond", (ctx) => withdrawBond(ctx, id, a));
  }

  function onSetThreshold() {
    const id = activeOr();
    if (!id) return setErr("Set an active pack id first.");
    const th = Math.max(0, Math.min(100, Number(newThreshold) || 0));
    run("set_pack_threshold", (ctx) => setPackThreshold(ctx, id, th));
  }

  function onRegisterOracle() {
    run("register_oracle", (ctx) => registerOracle(ctx, licenseHint.trim() || "unspecified"));
  }

  function onPayOracle() {
    const id = activeOr();
    if (!id) return setErr("Set an active pack id first.");
    const addr = payAddr.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) return setErr("Oracle address must be a 0x… 20-byte address.");
    run("pay_oracle", (ctx) => payOracle(ctx, id, addr));
  }

  function onSlash() {
    const id = activeOr();
    if (!id) return setErr("Set an active pack id first.");
    run("trigger_slash", (ctx) => triggerSlash(ctx, id));
  }

  return (
    <div className={styles.card} ref={tilt}>
      <div className={styles.head}>
        <span className={styles.title}>diagnostic actions</span>
        {activePackId && <span className={styles.active}>active · {activePackId}</span>}
      </div>

      {!isConnected && <p className={styles.notice}>Connect a wallet above to enable writes.</p>}
      {wrongChain && (
        <div className={styles.notice}>
          Wrong network.{" "}
          <button className={styles.switch} disabled={switching} onClick={() => switchChain({ chainId: CHAIN_ID })}>
            {switching ? "switching…" : "Switch to Bradbury"}
          </button>
        </div>
      )}

      {/* 1 · register */}
      <div className={styles.block}>
        <span className={styles.blabel}>1 · register a pack</span>
        <div className={styles.grid}>
          <input className={styles.in} placeholder="pack id" value={packId} onChange={(e) => setPackId(e.target.value)} />
          <input className={styles.in} placeholder="vin hash" value={vin} onChange={(e) => setVin(e.target.value)} />
          <input className={styles.in} placeholder="manifest uri" value={manifest} onChange={(e) => setManifest(e.target.value)} />
          <input className={styles.in} placeholder="threshold 0-100" inputMode="numeric" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          <input className={styles.in} placeholder="bond (wei, ≥1)" inputMode="numeric" value={bond} onChange={(e) => setBond(e.target.value)} />
        </div>
        <button className={styles.btn} disabled={!!busy || !ready} onClick={onRegister}>
          {busy === "register_pack" ? "registering…" : "register_pack"}
        </button>
      </div>

      {/* 2 · telemetry + recompute */}
      <div className={styles.block}>
        <span className={styles.blabel}>2 · post telemetry → recompute</span>
        <div className={styles.grid}>
          <input className={styles.in} placeholder="oracle id" value={oracleId} onChange={(e) => setOracleId(e.target.value)} />
          <input className={`${styles.in} ${styles.wide}`} placeholder="signed telemetry blob (64+ chars)" value={blob} onChange={(e) => setBlob(e.target.value)} />
        </div>
        <div className={styles.btnRow}>
          <button className={styles.btn} disabled={!!busy || !ready} onClick={onTelemetry}>
            {busy === "post_telemetry" ? "posting…" : "post_telemetry"}
          </button>
          <button className={styles.btnGhost} disabled={!!busy || !ready} onClick={onRecompute}>
            {busy === "recompute_score" ? "recomputing…" : "recompute_score"}
          </button>
        </div>
      </div>

      {/* 3 · bond ops */}
      <div className={styles.block}>
        <span className={styles.blabel}>3 · bond management</span>
        <div className={styles.grid}>
          <input className={styles.in} placeholder="top-up (wei, ≥1)" inputMode="numeric" value={topUp} onChange={(e) => setTopUp(e.target.value)} />
          <input className={styles.in} placeholder="withdraw (wei, ≥1)" inputMode="numeric" value={withdraw} onChange={(e) => setWithdraw(e.target.value)} />
        </div>
        <div className={styles.btnRow}>
          <button className={styles.btn} disabled={!!busy || !ready} onClick={onTopUp}>
            {busy === "top_up_bond" ? "topping…" : "top_up_bond"}
          </button>
          <button className={styles.btnGhost} disabled={!!busy || !ready} onClick={onWithdraw}>
            {busy === "withdraw_bond" ? "withdrawing…" : "withdraw_bond"}
          </button>
        </div>
      </div>

      {/* 4 · governance */}
      <div className={styles.block}>
        <span className={styles.blabel}>4 · governance</span>
        <div className={styles.grid}>
          <input className={styles.in} placeholder="new threshold 0-100" inputMode="numeric" value={newThreshold} onChange={(e) => setNewThreshold(e.target.value)} />
        </div>
        <button className={styles.btnGhost} disabled={!!busy || !ready} onClick={onSetThreshold}>
          {busy === "set_pack_threshold" ? "setting…" : "set_pack_threshold"}
        </button>
      </div>

      {/* 5 · oracle ops */}
      <div className={styles.block}>
        <span className={styles.blabel}>5 · oracle registry + payout</span>
        <div className={styles.grid}>
          <input className={styles.in} placeholder="license hint" value={licenseHint} onChange={(e) => setLicenseHint(e.target.value)} />
          <input className={styles.in} placeholder="oracle 0x… to pay" value={payAddr} onChange={(e) => setPayAddr(e.target.value)} />
        </div>
        <div className={styles.btnRow}>
          <button className={styles.btn} disabled={!!busy || !ready} onClick={onRegisterOracle}>
            {busy === "register_oracle" ? "registering…" : "register_oracle"}
          </button>
          <button className={styles.btnGhost} disabled={!!busy || !ready} onClick={onPayOracle}>
            {busy === "pay_oracle" ? "paying…" : "pay_oracle"}
          </button>
        </div>
      </div>

      {/* 6 · slash */}
      <div className={styles.block}>
        <span className={styles.blabel}>6 · slash test (expect E0100 above threshold)</span>
        <button className={styles.btnEmber} disabled={!!busy || !ready} onClick={onSlash}>
          {busy === "trigger_slash" ? "slashing…" : "trigger_slash"}
        </button>
      </div>

      {err && <pre className={styles.err}>{err}</pre>}
    </div>
  );
}
