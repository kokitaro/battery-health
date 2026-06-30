import type { PackEventKinds, TopOracle } from "../contract";
import styles from "./OraclePanel.module.css";

interface Props {
  topOracles: TopOracle[];
  eventKinds: PackEventKinds | null;
  activePackId: string;
}

function shortHex(h: string): string {
  if (!h || h.length < 12) return h || "—";
  return `${h.slice(0, 8)}…${h.slice(-4)}`;
}

export function OraclePanel({ topOracles, eventKinds, activePackId }: Props) {
  const kinds = eventKinds ? Object.entries(eventKinds).filter(([, v]) => v > 0) : [];

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.title}>oracle leaderboard</span>
        <span className={styles.meta}>top_oracles</span>
      </div>

      {topOracles.length === 0 ? (
        <p className={styles.empty}>No oracles ranked yet.</p>
      ) : (
        <ul className={styles.list}>
          {topOracles.map((o) => (
            <li key={o.addr} className={styles.row}>
              <span className={styles.addr}>{shortHex(o.addr)}</span>
              <span className={styles.agree}>{o.agreeing_posts} agree</span>
              <span className={styles.posts}>{o.posts} posts</span>
              <span className={styles.paid}>{o.paid_total} paid</span>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.head} style={{ marginTop: "1rem" }}>
        <span className={styles.title}>event mix</span>
        <span className={styles.meta}>{activePackId ? `pack ${activePackId}` : "pack_event_kinds_summary"}</span>
      </div>
      {!activePackId ? (
        <p className={styles.empty}>Select a pack to see its event-kind breakdown.</p>
      ) : kinds.length === 0 ? (
        <p className={styles.empty}>No events for this pack yet.</p>
      ) : (
        <div className={styles.kinds}>
          {kinds.map(([name, count]) => (
            <span className={styles.kind} key={name}>
              {name.toLowerCase()} <b>{count}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
