import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getMarketSummary, type MarketSummary } from "./contract";
import { CellScene } from "./components/CellScene";
import styles from "./Landing.module.css";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  { n: "01", t: "Register pack", d: "A submitter bonds GEN and registers a pack with a verifiable manifest." },
  { n: "02", t: "Post telemetry", d: "Licensed oracles push signed BMS blobs — SoC, cycles, temp, voltage sag." },
  { n: "03", t: "LLM coherence", d: "Validators run a coherence check: is the telemetry physically plausible?" },
  { n: "04", t: "Consensus score", d: "A GenLayer validator panel agrees on a 0–100 state-of-health score on-chain." },
  { n: "05", t: "Slash if low", d: "When a pack falls below threshold, its bond becomes slashable by anyone." },
];

const FAQ = [
  {
    q: "What is battery-health?",
    a: "An on-chain protocol that scores the state-of-health of EV battery packs. Oracles post telemetry, GenLayer validators reach consensus on a score, and underperforming packs can be slashed.",
  },
  {
    q: "Why GenLayer?",
    a: "GenLayer validators can run LLM and web calls natively, so coherence checks and consensus scoring happen on-chain without a trusted off-chain server.",
  },
  {
    q: "Who can post telemetry?",
    a: "Registered oracles. Each post is a signed blob attributed to the oracle's address, and agreeing posts accrue payout credit.",
  },
  {
    q: "When can a pack be slashed?",
    a: "When the recorded score sits below the registered threshold and an independent second-opinion review concurs, or when a recall is detected.",
  },
  {
    q: "Is a private key ever held in the page?",
    a: "No. All writes route through your connected wallet via the injected provider — you approve every transaction, and no key lives in the app.",
  },
];

function fmt(n: number | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const [market, setMarket] = useState<MarketSummary | null>(null);
  const [open, setOpen] = useState<number>(0);

  useEffect(() => {
    let live = true;
    getMarketSummary()
      .then((m) => live && setMarket(m))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(`.${styles.heroReveal}`, {
        y: 28,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.12,
      });

      gsap.utils.toArray<HTMLElement>(`.${styles.reveal}`).forEach((el) => {
        gsap.from(el, {
          y: 36,
          opacity: 0,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 82%" },
        });
      });

      gsap.utils.toArray<HTMLElement>(`.${styles.step}`).forEach((el, i) => {
        gsap.from(el, {
          y: 24,
          opacity: 0,
          duration: 0.55,
          ease: "power2.out",
          delay: i * 0.06,
          scrollTrigger: { trigger: `.${styles.flow}`, start: "top 78%" },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div className={styles.page} ref={root}>
      {/* ── Nav ───────────────────────────────────────────── */}
      <nav className={styles.nav}>
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden>
            <svg viewBox="0 0 32 32" width="26" height="26">
              <rect x="9" y="3" width="14" height="26" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
              <rect x="13" y="1.5" width="6" height="3" rx="1" fill="currentColor" />
              <path d="M17 9l-4 8h3l-1 6 5-9h-3z" fill="currentColor" />
            </svg>
          </span>
          <span className={styles.brandName}>BioCell</span>
        </div>
        <Link to="/app" className={styles.cta}>
          Enter the Diagnostics
        </Link>
      </nav>

      {/* ── Hero ──────────────────────────────────────────── */}
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={`${styles.kicker} ${styles.heroReveal}`}>SoH consensus · GenLayer Bradbury</span>
          <h1 className={`${styles.title} ${styles.heroReveal}`}>
            Score the pulse of<br />
            <em>every cell.</em>
          </h1>
          <p className={`${styles.sub} ${styles.heroReveal}`}>
            Continuous SoH scoring for EV battery packs on GenLayer.
          </p>
          <div className={`${styles.heroActions} ${styles.heroReveal}`}>
            <Link to="/app" className={styles.ctaSolid}>
              Enter the Diagnostics
            </Link>
            <a href="#how" className={styles.ctaGhost}>
              How it works
            </a>
          </div>
        </div>
        <div className={styles.heroStage} aria-hidden>
          <CellScene />
        </div>
      </header>

      {/* ── What is battery-health ────────────────────────── */}
      <section className={`${styles.section} ${styles.reveal}`}>
        <span className={styles.eyebrow}>What is battery-health</span>
        <p className={styles.lede}>
          battery-health reads a battery pack like a living organism. Oracles post signed telemetry, a
          GenLayer validator panel scores each pack's state-of-health on-chain, and a failing pulse becomes
          slashable — no trusted server, no off-chain oracle to bribe.
        </p>
        <div className={styles.badges}>
          <div className={styles.badge}>
            <b>0–100</b>
            <span>SoH score band</span>
          </div>
          <div className={styles.badge}>
            <b>9</b>
            <span>on-chain writes</span>
          </div>
          <div className={styles.badge}>
            <b>LLM</b>
            <span>coherence consensus</span>
          </div>
          <div className={styles.badge}>
            <b>4221</b>
            <span>Bradbury chain id</span>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────── */}
      <section className={`${styles.section} ${styles.reveal}`} id="how">
        <span className={styles.eyebrow}>How it works</span>
        <div className={styles.flow}>
          {STEPS.map((s, i) => (
            <div className={styles.step} key={s.n}>
              <span className={styles.stepN}>{s.n}</span>
              <h3 className={styles.stepT}>{s.t}</h3>
              <p className={styles.stepD}>{s.d}</p>
              {i < STEPS.length - 1 && <span className={styles.stepArrow} aria-hidden>→</span>}
            </div>
          ))}
        </div>
      </section>

      {/* ── Live stats ────────────────────────────────────── */}
      <section className={`${styles.section} ${styles.reveal}`}>
        <span className={styles.eyebrow}>Live on-chain</span>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <b>{fmt(market?.packs_registered)}</b>
            <span>packs registered</span>
          </div>
          <div className={styles.stat}>
            <b>{fmt(market?.total_bonded)}</b>
            <span>total bonded</span>
          </div>
          <div className={styles.stat}>
            <b className={styles.ember}>{fmt(market?.slash_events)}</b>
            <span>slash events</span>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <section className={`${styles.section} ${styles.reveal}`}>
        <span className={styles.eyebrow}>FAQ</span>
        <div className={styles.faq}>
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <div className={`${styles.faqItem} ${isOpen ? styles.faqOpen : ""}`} key={item.q}>
                <button
                  className={styles.faqQ}
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                >
                  <span>{item.q}</span>
                  <i className={styles.faqIcon} aria-hidden>
                    {isOpen ? "–" : "+"}
                  </i>
                </button>
                <div className={styles.faqA} style={{ maxHeight: isOpen ? 240 : 0 }}>
                  <p>{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footBrand}>
          <span className={styles.brandName}>BioCell</span>
          <span className={styles.footTag}>Score the pulse of every cell.</span>
        </div>
        <div className={styles.footLinks}>
          <Link to="/app">Diagnostics</Link>
          <a href="#how">How it works</a>
          <span className={styles.footMono}>GenLayer Bradbury · 4221</span>
        </div>
      </footer>
    </div>
  );
}
