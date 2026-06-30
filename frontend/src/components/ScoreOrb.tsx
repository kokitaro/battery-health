import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import styles from "./ScoreOrb.module.css";

interface Props {
  score: number | null; // 0..100, or null when no pack is active
  threshold: number;
  slashed?: boolean;
}

const R = 84;
const C = 2 * Math.PI * R;

export function ScoreOrb({ score, threshold, slashed }: Props) {
  const arcRef = useRef<SVGCircleElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const shown = score == null ? 0 : Math.max(0, Math.min(100, score));
  const below = score != null && score < threshold;
  const tone = slashed || below ? "var(--ember)" : "var(--green)";

  useEffect(() => {
    const arc = arcRef.current;
    if (arc) {
      gsap.to(arc, {
        strokeDashoffset: C - (C * shown) / 100,
        duration: 1,
        ease: "power3.out",
      });
    }
    if (numRef.current) {
      const obj = { v: 0 };
      gsap.to(obj, {
        v: shown,
        duration: 1,
        ease: "power3.out",
        onUpdate: () => {
          if (numRef.current) numRef.current.textContent = score == null ? "—" : String(Math.round(obj.v));
        },
      });
    }
  }, [shown, score]);

  return (
    <div className={styles.wrap}>
      <svg className={styles.svg} viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={R} className={styles.track} />
        <circle
          ref={arcRef}
          cx="100"
          cy="100"
          r={R}
          className={styles.arc}
          style={{ stroke: tone, strokeDasharray: C, strokeDashoffset: C }}
        />
        {/* threshold tick */}
        <line
          x1="100"
          y1="8"
          x2="100"
          y2="20"
          className={styles.tick}
          style={{ transform: `rotate(${(threshold / 100) * 360}deg)`, transformOrigin: "100px 100px" }}
        />
      </svg>
      <div className={styles.center}>
        <span ref={numRef} className={styles.num} style={{ color: tone }}>
          —
        </span>
        <span className={styles.label}>{slashed ? "slashed" : below ? "below threshold" : "state of health"}</span>
        <span className={styles.thr}>threshold {threshold}</span>
      </div>
    </div>
  );
}
