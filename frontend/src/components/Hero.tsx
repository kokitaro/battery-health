import heroBg from "../assets/hero-bg.jpg";
import styles from "./Hero.module.css";

interface Props {
  packLabel: string;
  online: boolean;
}

export function Hero({ packLabel, online }: Props) {
  return (
    <section className={styles.hero}>
      <div className={styles.bg} style={{ backgroundImage: `url(${heroBg})` }} aria-hidden />
      <div className={styles.scrim} aria-hidden />

      <div className={styles.inner}>
        <div className={styles.copy}>
          <span className={styles.kicker}>
            <i className={`${styles.dot} ${online ? styles.live : styles.dead}`} />
            {online ? "bradbury · live" : "reconnecting"}
          </span>
          <h1 className={styles.title}>
            Every cell has<br />
            <em>a pulse.</em>
          </h1>
          <p className={styles.sub}>
            BioCell reads a battery pack like a living organism. Oracles post telemetry, a GenLayer
            validator panel scores the cell's state-of-health on-chain, and a failing pulse becomes
            slashable.
          </p>
          <span className={styles.tag}>{packLabel}</span>
        </div>
      </div>
    </section>
  );
}
