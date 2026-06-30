import { useMemo, useState } from "react";
import type { EventView } from "../contract";
import styles from "./EventLog.module.css";

const KIND_TONE: Record<string, string> = {
  PACK_REGISTERED: "var(--green)",
  TELEMETRY_POSTED: "#5cc8ff",
  SCORE_RECOMPUTED: "var(--green)",
  SLASH_TRIGGERED: "var(--ember)",
  ORACLE_PAID: "#d6b04a",
  BOND_TOPPED_UP: "#8fd0a0",
  BOND_WITHDRAWN: "#c79be0",
  THRESHOLD_CHANGED: "var(--ash-2)",
  ORACLE_REGISTERED: "#5cc8ff",
};

const PAGE = 8;

function shortHex(h: string): string {
  if (!h || h.length < 12) return h || "—";
  return `${h.slice(0, 8)}…${h.slice(-4)}`;
}

function summarize(ev: EventView): string {
  try {
    const p = JSON.parse(ev.payload) as Record<string, unknown>;
    if (ev.kind_name === "SCORE_RECOMPUTED") {
      return `score ${p.previous_score ?? "?"} → ${p.new_score ?? "?"} (Δ${p.delta ?? 0})`;
    }
    if (ev.kind_name === "PACK_REGISTERED") {
      return `threshold ${p.threshold ?? "?"} · bond ${ev.value}`;
    }
    if (ev.kind_name === "SLASH_TRIGGERED") {
      return `slashed ${p.slashed_amount ?? ev.value}`;
    }
    if (ev.kind_name === "TELEMETRY_POSTED") {
      return `oracle ${shortHex(String(p.oracle ?? ev.actor))}`;
    }
  } catch {
    /* fall through */
  }
  return ev.value ? `value ${ev.value}` : "—";
}

export function EventLog({ events }: { events: EventView[] }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(events.length / PAGE));
  const p = Math.min(page, pages - 1);
  const slice = useMemo(() => events.slice(p * PAGE, p * PAGE + PAGE), [events, p]);

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.title}>event ledger</span>
        <span className={styles.count}>{events.length} events</span>
      </div>

      {events.length === 0 ? (
        <p className={styles.empty}>No events on-chain yet. Register a pack to begin the log.</p>
      ) : (
        <ul className={styles.list}>
          {slice.map((ev) => (
            <li key={ev.seq} className={styles.row}>
              <span className={styles.seq}>#{ev.seq}</span>
              <span
                className={styles.tag}
                style={{ color: KIND_TONE[ev.kind_name] ?? "var(--ash)", borderColor: KIND_TONE[ev.kind_name] ?? "var(--line-2)" }}
              >
                {ev.kind_name}
              </span>
              <span className={styles.pack}>{shortHex(ev.pack_id)}</span>
              <span className={styles.detail}>{summarize(ev)}</span>
            </li>
          ))}
        </ul>
      )}

      {events.length > PAGE && (
        <div className={styles.pager}>
          <button className={styles.pbtn} disabled={p === 0} onClick={() => setPage(p - 1)}>
            ← prev
          </button>
          <span className={styles.pinfo}>
            {p + 1} / {pages}
          </span>
          <button className={styles.pbtn} disabled={p >= pages - 1} onClick={() => setPage(p + 1)}>
            next →
          </button>
        </div>
      )}
    </div>
  );
}
