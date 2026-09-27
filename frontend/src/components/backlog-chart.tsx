import { oneDecimal, whole } from "@/presentation/formatters";

export function BacklogChart({
  baseline,
  scenario,
  monthlyOpened,
  monthlyClosed,
  compact = false,
}: {
  baseline: number[];
  scenario: number[];
  monthlyOpened: number;
  monthlyClosed: number;
  compact?: boolean;
}) {
  const width = 720;
  const height = 260;
  const inset = { left: 50, right: 22, top: 22, bottom: 38 };
  const max = Math.max(...baseline, ...scenario, 1) * 1.05;
  const point = (value: number, index: number) => ({
    x: inset.left + (index / 12) * (width - inset.left - inset.right),
    y: inset.top + (1 - value / max) * (height - inset.top - inset.bottom),
  });
  const line = (values: number[]) =>
    values
      .map((value, index) => {
        const { x, y } = point(value, index);
        return `${index === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");

  return (
    <figure className={`chart-panel ${compact ? "compact-backlog" : ""}`} aria-labelledby="backlog-title">
      <div className="chart-title-row">
        <div>
          <p className="eyebrow">12-month trajectory</p>
          <h3 id="backlog-title">{compact ? "Backlog" : "Backlog closes or compounds"}</h3>
        </div>
        <div className="chart-legend" aria-label="Chart legend">
          <span><i className="legend-line baseline" /> Unchanged</span>
          <span><i className="legend-line scenario" /> Scenario</span>
        </div>
      </div>
      <svg
        className="line-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Unchanged backlog ends at ${whole.format(baseline[12])}; scenario backlog ends at ${whole.format(scenario[12])}.`}
      >
        {[0, 0.5, 1].map((fraction) => {
          const y = inset.top + fraction * (height - inset.top - inset.bottom);
          const value = max * (1 - fraction);
          return (
            <g key={fraction}>
              <line x1={inset.left} y1={y} x2={width - inset.right} y2={y} className="gridline" />
              <text x={inset.left - 10} y={y + 4} textAnchor="end" className="axis-label">
                {whole.format(value)}
              </text>
            </g>
          );
        })}
        {[0, 3, 6, 9, 12].map((month) => {
          const { x } = point(0, month);
          return (
            <text key={month} x={x} y={height - 10} textAnchor="middle" className="axis-label">
              {month === 0 ? "Now" : `M${month}`}
            </text>
          );
        })}
        <path d={line(baseline)} className="chart-line chart-line-baseline" />
        <path d={line(scenario)} className="chart-line chart-line-scenario" />
        <circle {...point(baseline[12], 12)} r="5" className="chart-dot baseline" />
        <circle {...point(scenario[12], 12)} r="5" className="chart-dot scenario" />
      </svg>
      <figcaption>{compact ? <>Opens <strong>{oneDecimal.format(monthlyOpened)}</strong> · closes <strong>{oneDecimal.format(monthlyClosed)}</strong>.</> : <>Monthly openings: <strong>{oneDecimal.format(monthlyOpened)}</strong> · monthly closures: <strong>{oneDecimal.format(monthlyClosed)}</strong>.</>}</figcaption>
    </figure>
  );
}
