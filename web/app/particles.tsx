"use client";

import { useEffect, useRef } from "react";

const trailSpan = 52;
const bands = 4;
const field = 0.00092;

type Dot = {
  x: number;
  y: number;
  heading: number;
  speed: number;
  width: number;
  head: number;
  filled: number;
  pts: Float32Array;
};

class Perlin {
  private readonly period = 32;
  private readonly g: Float32Array;

  constructor() {
    const cells = this.period * this.period;
    this.g = new Float32Array(cells * 2);
    for (let i = 0; i < cells; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.g[i * 2] = Math.cos(angle);
      this.g[i * 2 + 1] = Math.sin(angle);
    }
  }

  private cell(value: number) {
    return ((value % this.period) + this.period) % this.period;
  }

  private grad(ix: number, iy: number, x: number, y: number) {
    const i = (this.cell(ix) + this.cell(iy) * this.period) * 2;
    return (x - ix) * this.g[i] + (y - iy) * this.g[i + 1];
  }

  get(x: number, y: number) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = x - x0;
    const ty = y - y0;
    const sx = tx * tx * tx * (tx * (tx * 6 - 15) + 10);
    const sy = ty * ty * ty * (ty * (ty * 6 - 15) + 10);
    const n0 = this.grad(x0, y0, x, y);
    const n1 = this.grad(x0 + 1, y0, x, y);
    const n2 = this.grad(x0, y0 + 1, x, y);
    const n3 = this.grad(x0 + 1, y0 + 1, x, y);
    const ix0 = n0 + sx * (n1 - n0);
    const ix1 = n2 + sx * (n3 - n2);
    return ix0 + sy * (ix1 - ix0);
  }
}

function ink() {
  return getComputedStyle(document.documentElement).getPropertyValue("--on-bg").trim() || "#0c3140";
}

function targetCount(width: number, height: number) {
  return Math.min(37, Math.max(21, Math.round((width * height) / 72000) + 5));
}

function pushPoint(dot: Dot, x: number, y: number) {
  dot.head = (dot.head + 1) % trailSpan;
  const i = dot.head * 2;
  dot.pts[i] = x;
  dot.pts[i + 1] = y;
  if (dot.filled < trailSpan) dot.filled += 1;
}

export function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!ctx) return;

    const perlin = new Perlin();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduce = motion.matches;
    let frame = 0;
    let running = true;
    let time = Math.random() * 20;
    let width = 0;
    let height = 0;
    let color = ink();
    let dots: Dot[] = [];

    const makeDot = (x: number, y: number) => {
      const dot: Dot = {
        x,
        y,
        heading: Math.random() * Math.PI * 2,
        speed: 1.35 + Math.random() * 0.55,
        width: 0.85 + Math.random() * 0.65,
        head: 0,
        filled: 0,
        pts: new Float32Array(trailSpan * 2),
      };
      return dot;
    };

    const advance = (dot: Dot) => {
      const margin = Math.min(width, height) * 0.07;
      dot.heading += perlin.get(dot.x * field, dot.y * field + time) * 0.028;
      let vx = Math.cos(dot.heading);
      let vy = Math.sin(dot.heading);
      if (dot.x < margin) vx += (1 - dot.x / margin) * 1.25;
      else if (dot.x > width - margin) vx -= (1 - (width - dot.x) / margin) * 1.25;
      if (dot.y < margin) vy += (1 - dot.y / margin) * 1.25;
      else if (dot.y > height - margin) vy -= (1 - (height - dot.y) / margin) * 1.25;
      const mag = Math.hypot(vx, vy) || 1;
      dot.heading = Math.atan2(vy, vx);
      dot.x = Math.min(width, Math.max(0, dot.x + (vx / mag) * dot.speed));
      dot.y = Math.min(height, Math.max(0, dot.y + (vy / mag) * dot.speed));
      pushPoint(dot, dot.x, dot.y);
    };

    const place = () => {
      const count = targetCount(width, height);
      const cols = Math.max(1, Math.round(Math.sqrt(count * (width / Math.max(height, 1)))));
      const rows = Math.ceil(count / cols);
      const next: Dot[] = [];
      let n = 0;
      for (let row = 0; row < rows && n < count; row++) {
        for (let col = 0; col < cols && n < count; col++) {
          const jx = (Math.random() - 0.5) * (width / cols) * 0.4;
          const jy = (Math.random() - 0.5) * (height / rows) * 0.4;
          const x = Math.min(width, Math.max(0, ((col + 0.5) / cols) * width + jx));
          const y = Math.min(height, Math.max(0, ((row + 0.5) / rows) * height + jy));
          next.push(makeDot(x, y));
          n += 1;
        }
      }
      dots = next;
      for (let step = 0; step < trailSpan; step++) {
        time += 0.0022;
        for (const dot of dots) advance(dot);
      }
    };

    const fit = () => {
      const nextW = window.innerWidth;
      const nextH = window.innerHeight;
      if (nextW === width && nextH === height && dots.length > 0) return;
      width = nextW;
      height = nextH;
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (dots.length === 0) {
        place();
        return;
      }
      const count = targetCount(width, height);
      while (dots.length < count) dots.push(makeDot(Math.random() * width, Math.random() * height));
      if (dots.length > count) dots.length = count;
      for (const dot of dots) {
        dot.x = Math.min(width, Math.max(0, dot.x));
        dot.y = Math.min(height, Math.max(0, dot.y));
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = color;
      for (const dot of dots) {
        if (dot.filled < 2) continue;
        const start = (dot.head - dot.filled + 1 + trailSpan) % trailSpan;
        const chunk = Math.ceil(dot.filled / bands);
        let cursor = 0;
        for (let band = 0; band < bands; band++) {
          const end = band === bands - 1 ? dot.filled - 1 : Math.min(dot.filled - 1, cursor + chunk);
          if (end <= cursor) break;
          const fade = (band + 1) / bands;
          ctx.globalAlpha = fade * fade * 0.7;
          ctx.lineWidth = dot.width * (0.3 + fade);
          ctx.beginPath();
          for (let i = cursor; i <= end; i++) {
            const p = ((start + i) % trailSpan) * 2;
            const x = dot.pts[p];
            const y = dot.pts[p + 1];
            if (i === cursor) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          cursor = end;
        }
      }
      ctx.globalAlpha = 1;
    };

    const tick = () => {
      if (!running) return;
      if (document.hidden || reduce) return;
      time += 0.0022;
      for (const dot of dots) advance(dot);
      draw();
      frame = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!running) return;
      cancelAnimationFrame(frame);
      if (reduce || document.hidden) {
        draw();
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    fit();
    wake();

    const onResize = () => {
      fit();
      wake();
    };
    const onScheme = () => {
      color = ink();
      draw();
    };
    const onMotion = () => {
      reduce = motion.matches;
      wake();
    };
    const onVisibility = () => wake();

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    motion.addEventListener("change", onMotion);
    const scheme = new MutationObserver(onScheme);
    scheme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-scheme"] });

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      motion.removeEventListener("change", onMotion);
      scheme.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="particles" aria-hidden="true" />;
}
