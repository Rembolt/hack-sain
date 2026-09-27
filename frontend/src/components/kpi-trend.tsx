import type { MonthlyKpi } from "@/domain/types";

export function KpiTrend({ data }: { data: MonthlyKpi[] }) {
  const width = 520;
  const height = 178;
  const inset = 16;
  const values = data.map((entry) => entry.averageDaysToClose);
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  const points = values.map((value, index) => ({
    x: inset + (index / (values.length - 1)) * (width - inset * 2),
    y: inset + ((max - value) / (max - min)) * (height - inset * 2),
  }));
  const line = points.map(({ x, y }, index) => `${index ? "L" : "M"}${x},${y}`).join(" ");
  const area = `${line} L${points.at(-1)?.x},${height - inset} L${inset},${height - inset} Z`;

  return (
    <figure className="trend-card" aria-labelledby="trend-title">
      <div className="trend-card-copy">
        <p className="eyebrow">Official monthly KPI</p>
        <h3 id="trend-title">Average closure time</h3>
        <p>Latest complaint cohorts are censored, so the company KPI—not complaint-record averages—is the current headline.</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Average days to close rises from ${values[0]} to ${values.at(-1)} days over 24 months.`}>
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-primary)" stopOpacity="0.2" />
            <stop offset="1" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#trend-fill)" />
        <path d={line} className="trend-line" />
        <circle cx={points.at(-1)?.x} cy={points.at(-1)?.y} r="5" className="trend-dot" />
      </svg>
      <div className="trend-axis"><span>Oct 2024</span><strong>43.8 days</strong><span>Sep 2026</span></div>
    </figure>
  );
}
