import { useEffect, useRef } from "react";
import * as d3 from "d3";
import styles from "./TelemetryStrip.module.css";

interface Props {
  series: number[]; // last ~32 SCORE_RECOMPUTED new_score values, oldest -> newest
  threshold: number;
}

export function TelemetryStrip({ series, threshold }: Props) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const W = 880;
    const H = 150;
    const m = { t: 16, r: 14, b: 18, l: 28 };
    const iw = W - m.l - m.r;
    const ih = H - m.t - m.b;

    const data = series.slice(-32);
    const x = d3
      .scaleLinear()
      .domain([0, Math.max(1, data.length - 1)])
      .range([m.l, m.l + iw]);
    const y = d3.scaleLinear().domain([0, 100]).range([m.t + ih, m.t]);

    // threshold guide
    svg
      .append("line")
      .attr("x1", m.l)
      .attr("x2", m.l + iw)
      .attr("y1", y(threshold))
      .attr("y2", y(threshold))
      .attr("stroke", "#c62828")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4 5")
      .attr("opacity", 0.6);
    svg
      .append("text")
      .attr("x", m.l + iw)
      .attr("y", y(threshold) - 5)
      .attr("text-anchor", "end")
      .attr("fill", "#c62828")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-size", 10)
      .attr("opacity", 0.8)
      .text(`slash ${threshold}`);

    if (data.length === 0) {
      svg
        .append("text")
        .attr("x", W / 2)
        .attr("y", H / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#5d6873")
        .attr("font-family", "JetBrains Mono, monospace")
        .attr("font-size", 12)
        .text("no score history yet — recompute a pack to draw its pulse");
      return;
    }

    const defs = svg.append("defs");
    const grad = defs
      .append("linearGradient")
      .attr("id", "spark-fill")
      .attr("x1", "0")
      .attr("x2", "0")
      .attr("y1", "0")
      .attr("y2", "1");
    grad.append("stop").attr("offset", "0%").attr("stop-color", "#4caf50").attr("stop-opacity", 0.35);
    grad.append("stop").attr("offset", "100%").attr("stop-color", "#4caf50").attr("stop-opacity", 0);

    const area = d3
      .area<number>()
      .x((_d, i) => x(i))
      .y0(m.t + ih)
      .y1((d) => y(d))
      .curve(d3.curveMonotoneX);

    const line = d3
      .line<number>()
      .x((_d, i) => x(i))
      .y((d) => y(d))
      .curve(d3.curveMonotoneX);

    svg.append("path").datum(data).attr("d", area).attr("fill", "url(#spark-fill)");

    const path = svg
      .append("path")
      .datum(data)
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", "#4caf50")
      .attr("stroke-width", 2)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round");

    // draw-on animation
    const node = path.node();
    if (node) {
      const len = node.getTotalLength();
      path
        .attr("stroke-dasharray", `${len} ${len}`)
        .attr("stroke-dashoffset", len)
        .transition()
        .duration(900)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);
    }

    // last point marker
    const last = data[data.length - 1];
    const lastColor = last < threshold ? "#c62828" : "#4caf50";
    svg
      .append("circle")
      .attr("cx", x(data.length - 1))
      .attr("cy", y(last))
      .attr("r", 4)
      .attr("fill", lastColor)
      .attr("stroke", "#0a0e14")
      .attr("stroke-width", 1.5);

    return () => {
      svg.selectAll("*").interrupt();
    };
  }, [series, threshold]);

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.title}>telemetry pulse</span>
        <span className={styles.meta}>last {Math.min(32, series.length)} recomputes</span>
      </div>
      <svg ref={ref} className={styles.svg} viewBox="0 0 880 150" preserveAspectRatio="none" />
    </div>
  );
}
