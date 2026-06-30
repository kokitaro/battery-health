import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  CONTRACT_ADDRESS,
  RPC_URL,
  getMarketSummary,
  getPack,
  getEvents,
  getRecentEvents,
  getTopOracles,
  getPackEventKinds,
  scoreSeries,
  type EventView,
  type MarketSummary,
  type PackView,
  type TopOracle,
  type PackEventKinds,
} from "./contract";
import { TelemetryStrip } from "./components/TelemetryStrip";
import { EventLog } from "./components/EventLog";
import { Actions } from "./components/Actions";
import { Connect } from "./components/Connect";
import { ScoreOrb } from "./components/ScoreOrb";
import { OraclePanel } from "./components/OraclePanel";
import styles from "./Workspace.module.css";

const POLL_MS = 12_000;
const DEFAULT_THRESHOLD = 60;

export function Workspace() {
  const [activePackId, setActivePackId] = useState("");
  const [packInput, setPackInput] = useState("");

  const [market, setMarket] = useState<MarketSummary | null>(null);
  const [pack, setPack] = useState<PackView | null>(null);
  const [packEvents, setPackEvents] = useState<EventView[]>([]);
  const [recent, setRecent] = useState<EventView[]>([]);
  const [topOracles, setTopOracles] = useState<TopOracle[]>([]);
  const [eventKinds, setEventKinds] = useState<PackEventKinds | null>(null);
  const [online, setOnline] = useState(true);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    try {
      const [m, rec, tops] = await Promise.all([
        getMarketSummary(),
        getRecentEvents(64),
        getTopOracles(8).catch(() => []),
      ]);
      setMarket(m);
      setRecent(rec);
      setTopOracles(tops);
      if (activePackId) {
        try {
          const [pv, evs, kinds] = await Promise.all([
            getPack(activePackId),
            getEvents(activePackId, 0, 200),
            getPackEventKinds(activePackId).catch(() => ({})),
          ]);
          setPack(pv);
          setPackEvents(evs);
          setEventKinds(kinds);
        } catch {
          setPack(null);
          setPackEvents([]);
          setEventKinds(null);
        }
      } else {
        setEventKinds(null);
      }
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, [activePackId]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_MS);
    const onVis = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  const notify = useCallback(
    (msg: string) => {
      setToast(msg);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(""), 6000);
      refresh();
    },
    [refresh],
  );

  const threshold = pack?.threshold ?? DEFAULT_THRESHOLD;
  const series = useMemo(
    () => scoreSeries(packEvents.length ? packEvents : recent),
    [packEvents, recent],
  );

  const stat = (n: number | undefined) => (n == null ? "—" : String(n));

  function selectPack() {
    const id = packInput.trim();
    if (id) setActivePackId(id);
  }

  return (
    <div className={styles.page}>
      {/* ── Top bar ─────────────────────────────────────── */}
      <header className={styles.topbar}>
        <Link to="/" className={styles.brand}>
          <span className={styles.mark} aria-hidden>
            <svg viewBox="0 0 32 32" width="22" height="22">
              <rect x="9" y="3" width="14" height="26" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
              <rect x="13" y="1.5" width="6" height="3" rx="1" fill="currentColor" />
              <path d="M17 9l-4 8h3l-1 6 5-9h-3z" fill="currentColor" />
            </svg>
          </span>
          BioCell
        </Link>
        <div className={styles.topRight}>
          <span className={`${styles.statusDot} ${online ? styles.live : styles.dead}`} aria-hidden />
          <span className={styles.statusText}>{online ? "bradbury · live" : "reconnecting"}</span>
          <Connect />
        </div>
      </header>

      <main className={styles.body}>
        {/* ── Market metrics ────────────────────────────── */}
        <section className={styles.metrics}>
          <div className={styles.metric}><b>{stat(market?.packs_registered)}</b><span>packs</span></div>
          <div className={styles.metric}><b>{stat(market?.telemetry_events)}</b><span>telemetry</span></div>
          <div className={styles.metric}><b>{stat(market?.score_recompute_events)}</b><span>recomputes</span></div>
          <div className={styles.metric}><b style={{ color: "var(--ember)" }}>{stat(market?.slash_events)}</b><span>slashes</span></div>
          <div className={styles.metric}><b>{stat(market?.total_bonded)}</b><span>bonded</span></div>
          <div className={styles.metric}><b>{stat(market?.total_payouts)}</b><span>payouts</span></div>
        </section>

        {/* ── 3-zone layout: Pack Selector · Center Stage · Actions ── */}
        <div className={styles.layout}>
          {/* Pack selector + oracle/views column */}
          <aside className={styles.selector}>
            <div className={styles.card}>
              <span className={styles.cardLabel}>pack selector</span>
              <div className={styles.selectRow}>
                <input
                  className={styles.in}
                  placeholder="pack id"
                  value={packInput}
                  onChange={(e) => setPackInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && selectPack()}
                />
                <button className={styles.selBtn} onClick={selectPack}>load</button>
              </div>
              {activePackId ? (
                <dl className={styles.packMeta}>
                  <div><dt>active</dt><dd>{activePackId}</dd></div>
                  <div><dt>bonded</dt><dd>{stat(pack?.bonded)}</dd></div>
                  <div><dt>telemetry</dt><dd>{stat(pack?.telemetry_count)}</dd></div>
                  <div><dt>payouts</dt><dd>{stat(pack?.cumulative_payouts)}</dd></div>
                  <div><dt>submitter</dt><dd className={styles.mono}>{pack ? `${pack.submitter.slice(0, 10)}…` : "—"}</dd></div>
                </dl>
              ) : (
                <p className={styles.hint}>Load a pack id, or register one in the actions panel.</p>
              )}
            </div>

            <OraclePanel topOracles={topOracles} eventKinds={eventKinds} activePackId={activePackId} />
          </aside>

          {/* Center stage: ScoreOrb + telemetry pulse + event log */}
          <section className={styles.stage}>
            <div className={styles.orbRow}>
              <ScoreOrb score={pack ? pack.score : null} threshold={threshold} slashed={pack?.slashed} />
              <div className={styles.orbAside}>
                <h2 className={styles.stageTitle}>
                  {activePackId ? `pack ${activePackId}` : "no pack selected"}
                </h2>
                <p className={styles.stageSub}>
                  {pack?.slashed
                    ? "This pack has been slashed — its bond was forfeited."
                    : "Live state-of-health, scored on-chain by the GenLayer validator panel."}
                </p>
                <div className={styles.miniStats}>
                  <span>score <b>{stat(pack?.score)}</b></span>
                  <span>threshold <b>{threshold}</b></span>
                  <span>last seq <b>{stat(pack?.last_score_seq)}</b></span>
                </div>
              </div>
            </div>

            <TelemetryStrip series={series} threshold={threshold} />
            <EventLog events={activePackId ? packEvents : recent} />
          </section>

          {/* Actions column */}
          <aside className={styles.actions}>
            <Actions activePackId={activePackId} onActivePack={setActivePackId} onDone={notify} />
          </aside>
        </div>

        <footer className={styles.foot}>
          <span>BatteryLedger · GenLayer Bradbury</span>
          <span className={styles.mono}>{CONTRACT_ADDRESS}</span>
          <span className={styles.mono}>{RPC_URL}</span>
        </footer>
      </main>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
